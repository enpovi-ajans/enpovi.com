/* Enpovi platformu · ortak katman (giriş, üyelik, "Paylaştım" kayıtları).
   Gerekli: önce ortak/config.js ve ortak/supabase.js yüklenmeli.
   config.js'de url/anon boşsa platform kapalıdır (Ajans.hazir=false) ve paneller yerel modda çalışır. */
(function(){
  'use strict';
  const me = document.currentScript && document.currentScript.src;
  // Sitenin kök adresi: .../ortak/platform.js → .../
  const BASE = me ? new URL('../', me).pathname : '/';
  const C = window.ENPOVI_AYAR || {};
  const hazir = !!(C.url && C.anon && window.supabase && window.supabase.createClient);
  const sb = hazir ? window.supabase.createClient(C.url, C.anon, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'enpovi-oturum' }
  }) : null;

  const kucuk = s => String(s || '').trim().toLowerCase();
  function hata(e){
    const m = String((e && (e.message || e.error_description || e.msg)) || e || '');
    if (/Invalid login credentials/i.test(m)) return 'E-posta ya da şifre hatalı.';
    if (/Email not confirmed/i.test(m)) return 'Bu hesabın e-postası henüz onaylanmamış.';
    if (/Password should be at least|weak.?password/i.test(m)) return 'Şifre en az 8 karakter olmalı.';
    if (/rate limit|too many/i.test(m)) return 'Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar deneyin.';
    if (/already registered|already been registered/i.test(m)) return 'Bu e-postayla zaten bir hesap var.';
    if (/Failed to fetch|NetworkError|Load failed|network/i.test(m)) return 'Bağlantı kurulamadı. İnternetinizi kontrol edin.';
    if (/row-level security|permission denied|JWT/i.test(m)) return 'Bu işlem için yetkiniz yok.';
    return m || 'Beklenmeyen bir hata oluştu.';
  }
  function ok(r){ if (r && r.error) throw r.error; return r ? r.data : r; }

  let _oturum; // önbellek (Promise)
  async function oturumYukle(){
    const { data } = await sb.auth.getSession();
    const s = data && data.session;
    if (!s) return null;
    const email = kucuk(s.user && s.user.email);
    const [y, u] = await Promise.all([
      sb.from('yoneticiler').select('email').eq('email', email),
      sb.from('uyeler').select('slug').eq('email', email)
    ]);
    if (y.error || u.error) {
      const e = y.error || u.error;
      // Oturum geçersizse (silinmiş kullanıcı, süresi dolmuş anahtar) temizle.
      if (/JWT|token|401/i.test(String(e.message || e.code || ''))) { try { await sb.auth.signOut({ scope: 'local' }); } catch (_) {} return null; }
      throw e;
    }
    return { email, admin: (y.data || []).length > 0, slugs: (u.data || []).map(r => r.slug).sort() };
  }

  const Ajans = {
    hazir, BASE,
    adres: p => BASE + String(p || '').replace(/^\//, ''),
    girisli(slug){ const L = C.girisli || []; return hazir && (L.includes('*') || L.includes(slug)); },
    hata,
    /* Bir içeriğin kalıcı anahtarı: "<ayın ilk tarihinin YYYY-AA'sı>:<id>" (örn. 2026-11:n-g1).
       Aynı id gelecek yıl tekrar kullanılsa da kayıtlar karışmaz. */
    ayKodu(ay){ const d = [...(ay.items || []), ...(ay.stories || [])].map(x => x.date).filter(Boolean).sort(); return d.length ? d[0].slice(0, 7) : 'x'; },
    anahtar(ay, id){ return Ajans.ayKodu(ay) + ':' + id; },
    oturum(yenile){ if (!hazir) return Promise.resolve(null); if (yenile || !_oturum) _oturum = oturumYukle().catch(e => { _oturum = null; throw e; }); return _oturum; },
    async girisYap(email, sifre){
      const r = await sb.auth.signInWithPassword({ email: kucuk(email), password: sifre });
      ok(r); _oturum = null; return Ajans.oturum(true);
    },
    async cikis(){ try { await sb.auth.signOut(); } catch (e) { try { await sb.auth.signOut({ scope: 'local' }); } catch (_) {} } _oturum = null; },
    async sifreDegistir(yeni){ ok(await sb.auth.updateUser({ password: yeni })); },
    async sifreSifirla(email){ ok(await sb.auth.resetPasswordForEmail(kucuk(email), { redirectTo: location.origin + BASE + 'giris/' })); },
    onAuth(fn){ if (sb) sb.auth.onAuthStateChange(fn); },

    /* "Paylaştım" kayıtları: Map(icerik_id → {at, by}) */
    async paylasimlar(slug){
      const out = new Map(); let from = 0; const N = 1000;
      for (;;) {
        let q = sb.from('paylasimlar').select('slug,icerik_id,paylasan,paylasildi_at').order('icerik_id').range(from, from + N - 1);
        if (slug) q = q.eq('slug', slug);
        const rows = ok(await q) || [];
        rows.forEach(r => out.set(slug ? r.icerik_id : r.slug + '/' + r.icerik_id, { at: r.paylasildi_at, by: r.paylasan }));
        if (rows.length < N) break; from += N;
      }
      return out;
    },
    async isaretle(slug, id, deger){
      if (deger) {
        ok(await sb.from('paylasimlar').upsert({ slug, icerik_id: id }, { onConflict: 'slug,icerik_id', ignoreDuplicates: true }));
      } else {
        ok(await sb.from('paylasimlar').delete().eq('slug', slug).eq('icerik_id', id));
      }
    },
    async topluIsaretle(slug, ids){
      if (!ids.length) return;
      ok(await sb.from('paylasimlar').upsert(ids.map(id => ({ slug, icerik_id: id })), { onConflict: 'slug,icerik_id', ignoreDuplicates: true }));
    },

    /* Yönetici: hesaplar ve üyelikler */
    async uyeler(){ return ok(await sb.from('uyeler').select('email,slug,created_at').order('slug').order('email')) || []; },
    async uyeEkle(email, slug){ ok(await sb.from('uyeler').upsert({ email: kucuk(email), slug }, { onConflict: 'email,slug', ignoreDuplicates: true })); },
    async uyeSil(email, slug){ ok(await sb.from('uyeler').delete().eq('email', kucuk(email)).eq('slug', slug)); },
    /* Müşteri için hesap açar (yöneticinin oturumunu bozmadan, ayrı bir istemciyle). */
    async hesapOlustur(email, sifre){
      const ayri = window.supabase.createClient(C.url, C.anon, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'enpovi-gecici' } });
      const r = await ayri.auth.signUp({ email: kucuk(email), password: sifre });
      if (r.error) {
        if (/already registered|already been registered/i.test(r.error.message || '')) return { vardi: true };
        throw r.error;
      }
      // E-posta onayı açıksa ve hesap zaten varsa Supabase boş kimlikli kullanıcı döner.
      const u = r.data && r.data.user;
      const vardi = !!(u && Array.isArray(u.identities) && u.identities.length === 0);
      const onayGerekli = !vardi && !(r.data && r.data.session);
      try { await ayri.auth.signOut({ scope: 'local' }); } catch (_) {}
      return { vardi, onayGerekli };
    },

    /* Müşteri listesi ve planları (site içindeki <slug>/data.js) */
    async musteriler(){
      const r = await fetch(BASE + 'ortak/musteriler.json', { cache: 'no-cache' });
      if (!r.ok) throw new Error('Müşteri listesi okunamadı');
      return r.json();
    },
    async plan(slug){
      const r = await fetch(BASE + slug + '/data.js', { cache: 'no-cache' });
      if (!r.ok) throw new Error(slug + ' planı okunamadı');
      const w = {};
      new Function('window', await r.text())(w);
      return { PLAN: w.PLAN || {}, BRAND: w.BRAND || {} };
    }
  };
  window.Ajans = Ajans;
})();
