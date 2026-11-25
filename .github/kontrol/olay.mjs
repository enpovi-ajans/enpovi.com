/* Ölçüm denetimi (ortak/analiz.js; Yasin, 25 Kasım 2026: "panelde net doğru görünsün"): gerçek tarayıcıda, ağ taklidiyle.
   Kanal (fbclid → Meta), olay oturumda bir kez ve düğme yeriyle, tema kartı, sonraki sayfa, izinle 30 gün kanal, deneme tıklaması dönüşüm değil,
   /donusum/ yalnızca izinle ve bir kez dönüşüm gönderir. Çalıştır: node .github/kontrol/olay.mjs (MODUL=<node_modules üstü> isteğe bağlı) */
import { createRequire } from 'node:module'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(path.join(process.env.MODUL || process.cwd(), 'x.js'))('playwright');
const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), olaylar = []; let hata = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) hata++; };
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.route('https://enpovi.com/**', r => { let p = new URL(r.request().url()).pathname; if (p.endsWith('/')) p += 'index.html'; const f = path.join(KOK, p);
  if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' }); const t = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' }[path.extname(f)] || 'application/octet-stream';
  r.fulfill({ body: fs.readFileSync(f), contentType: t }); });
await ctx.route('https://app.enpovi.com/api/enpovi/olay', r => { olaylar.push(JSON.parse(r.request().postData())); r.fulfill({ status: 204, headers: { 'access-control-allow-origin': 'https://enpovi.com' } }); });
await ctx.route('https://app.enpovi.com/api/enpovi/etiket', r => r.fulfill({ json: { ga4: 'G-TEST123', ads: 'AW-123456789', adsEtiket: { dene: 'DENE1', wa: 'WA1' }, meta: '1234567890' }, headers: { 'access-control-allow-origin': '*' } }));
await ctx.route('https://app.enpovi.com/api/enpovi/vitrin/yayin', r => r.fulfill({ status: 503, body: '{}', headers: { 'access-control-allow-origin': '*' } }));
await ctx.route(/googletagmanager|facebook\.net|google-analytics|challenges\.cloudflare/, r => r.fulfill({ body: '', contentType: 'text/javascript' }));
const p = await ctx.newPage(); const bekle = () => p.waitForTimeout(600);
await p.goto('https://enpovi.com/?fbclid=ABC123'); await bekle();
ok(olaylar.length === 1 && olaylar[0].t === 'gor' && olaylar[0].k === 'meta' && olaylar[0].o === 'cpc' && olaylar[0].s === '/', 'fbclid: Meta reklamı ' + JSON.stringify(olaylar[0]));
ok(!JSON.stringify(olaylar).includes('ABC123'), 'tıklama kimliğinin değeri gönderilmez');
const tikla = sel => p.evaluate(s => { const a = document.querySelector(s); a.addEventListener('click', e => e.preventDefault()); a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }, sel);
await tikla('footer a[href*="wa.me/90"], .yapiskan a[href*="wa.me/90"]'); await tikla('footer a[href*="wa.me/90"], .yapiskan a[href*="wa.me/90"]'); await bekle();
const w = olaylar.filter(o => o.t === 'wa'); ok(w.length === 1 && w[0].y && /^[a-z0-9-]+$/.test(w[0].y) && w[0].k === 'meta', 'WhatsApp oturumda bir kez, yeriyle: ' + JSON.stringify(w));
await tikla('#vit .vk'); await bekle();
const tm = olaylar.filter(o => o.t === 'tema'); ok(tm.length === 1 && tm[0].y === 'vit', 'tema kartı ' + JSON.stringify(tm));
const dl = await p.locator('a[href^="https://app.enpovi.com/basla"]').first().getAttribute('href'); ok(/utm_source=meta/.test(dl) && /utm_medium=cpc/.test(dl), 'deneme bağlantısı kanalı taşır ' + dl);
ok(JSON.stringify(await p.evaluate(() => window.enpoviKanal())) === JSON.stringify({ k: 'meta', o: 'cpc', c: '', z: '' }), 'form kanalı');
// dene tıklaması dönüşüm göndermez
await p.evaluate(() => localStorage.setItem('enpovi_cerez', 'tam'));
await p.goto('https://enpovi.com/blog/'); await bekle();
const s = olaylar.filter(o => o.t === 'sayfa'); ok(s.length === 1 && s[0].s === '/blog/', 'sonraki sayfa "sayfa" olarak ' + JSON.stringify(s));
ok(await p.evaluate(() => !!localStorage.getItem('enp_kanal_30')), 'izinle kanal 30 gün hatırlanır');
if (await p.locator('a[href^="https://app.enpovi.com/basla"]').count()) { await tikla('a[href^="https://app.enpovi.com/basla"]'); await bekle();
  ok(!(await p.evaluate(() => dataLayer.some(x => x[0] === 'event' && x[1] === 'conversion'))), 'deneme tıklaması dönüşüm değil'); }
// yeni sekme/gün: oturum yok, kanal izinle gelir
const p2 = await ctx.newPage(); await p2.goto('https://enpovi.com/'); await p2.waitForTimeout(600);
const son = olaylar[olaylar.length - 1]; ok(son.t === 'gor' && son.k === 'meta', 'yeni oturumda izinli kanal ' + JSON.stringify(son));
// dönüşüm sayfası
const n0 = olaylar.length;
await p2.goto('https://enpovi.com/donusum/?o=deneme&i=abcdefabcdefabcdef12&p=profesyonel'); await p2.waitForTimeout(800);
const dlx = await p2.evaluate(() => dataLayer.map(x => [...x]));
ok(dlx.some(x => x[0] === 'event' && x[1] === 'conversion' && x[2].send_to === 'AW-123456789/DENE1' && x[2].transaction_id === 'abcdefabcdefabcdef12'), 'Ads deneme dönüşümü bir kez');
ok(dlx.some(x => x[0] === 'event' && x[1] === 'deneme_basladi'), 'GA4 deneme_basladi');
ok(await p2.evaluate(() => window.fbq && window.fbq.queue.some(q => q[0] === 'track' && q[1] === 'StartTrial' && q[3].eventID === 'deneme-abcdefabcdefabcdef12')), 'Meta StartTrial');
ok(olaylar.length === n0 && !(await p2.locator('.cz').count()), 'dönüşüm sayfası sayılmaz, çerez notu yok');
await p2.reload(); await p2.waitForTimeout(800);
ok(!(await p2.evaluate(() => dataLayer.some(x => x[0] === 'event' && x[1] === 'conversion'))), 'yeniden yüklemede tekrar gönderilmez');
// izin yokken dönüşüm yok (yalnızca çerezsiz GA4 olayı)
await p2.evaluate(() => { localStorage.setItem('enpovi_cerez', 'hayir'); localStorage.removeItem('enp_donusum') }); await p2.reload(); await p2.waitForTimeout(800);
ok(!(await p2.evaluate(() => dataLayer.some(x => x[0] === 'event' && x[1] === 'conversion') || (window.fbq && window.fbq.queue.length))), 'izin yokken reklam dönüşümü yok');
// yeni bağlam: eski "evet" (yalnızca istatistik) kanalı 30 gün tutmaz; düğmenin yeri kendi kimliği değil bölümü
const yeniBaglam = async (etiket) => { const c = await b.newContext({ viewport: { width: 390, height: 844 } }), L = [];
  await c.route('https://enpovi.com/**', r => { let q = new URL(r.request().url()).pathname; if (q.endsWith('/')) q += 'index.html'; const f = path.join(KOK, q);
    if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' }); r.fulfill({ body: fs.readFileSync(f), contentType: { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(f)] || 'application/octet-stream' }); });
  await c.route('https://app.enpovi.com/api/enpovi/olay', r => { L.push(JSON.parse(r.request().postData())); r.fulfill({ status: 204, headers: { 'access-control-allow-origin': 'https://enpovi.com' } }); });
  await c.route('https://app.enpovi.com/api/enpovi/etiket', etiket);
  await c.route(/googletagmanager|facebook\.net|google-analytics|challenges\.cloudflare|vitrin\/yayin/, r => r.fulfill({ body: '', contentType: 'text/javascript' }));
  return [c, L]; };
const ETIKET = { ga4: 'G-TEST123', ads: 'AW-123456789', adsEtiket: { dene: 'DENE1' }, meta: '1234567890' };
{ const [c, L] = await yeniBaglam(r => r.fulfill({ json: ETIKET, headers: { 'access-control-allow-origin': '*' } })); const q = await c.newPage();
  await q.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('enpovi_cerez', 'evet') } });
  await q.goto('https://enpovi.com/?utm_source=instagram&utm_campaign=kasim'); await q.waitForTimeout(600);
  ok(!(await q.evaluate(() => localStorage.getItem('enp_kanal_30'))), 'yalnızca istatistik izninde kanal 30 gün tutulmaz');
  await q.evaluate(() => { const s = document.createElement('section'); s.id = 'ornekBolum'; s.innerHTML = '<a id="kendiKimligi" href="https://wa.me/905000000000">x</a>'; document.body.append(s);
    const a = s.firstChild; a.addEventListener('click', e => e.preventDefault()); a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }); await q.waitForTimeout(300);
  const w2 = L.find(o => o.t === 'wa'); ok(w2 && w2.y === 'ornek-bolum', 'düğmenin yeri içinde bulunduğu bölüm ' + JSON.stringify(w2));
  await c.close(); }
{ const [c] = await yeniBaglam(r => r.fulfill({ json: ETIKET, headers: { 'access-control-allow-origin': '*' } })); const q = await c.newPage();
  await q.addInitScript(() => localStorage.setItem('enpovi_cerez', 'tam'));
  await q.goto('https://enpovi.com/', { referer: 'https://www.google.com/' }); await q.waitForTimeout(600);
  ok(!(await q.evaluate(() => localStorage.getItem('enp_kanal_30'))), 'arama motorundan gelen 30 gün tutulmaz (yalnızca kampanya bağlantısı)');
  await q.goto('https://enpovi.com/?utm_source=instagram&utm_campaign=kasim'); await q.waitForTimeout(400);
  const t1 = await q.evaluate(() => JSON.parse(localStorage.getItem('enp_kanal_30')).t); await q.waitForTimeout(50);
  await q.goto('https://enpovi.com/blog/?utm_source=instagram&utm_campaign=kasim'); await q.waitForTimeout(400);
  ok(t1 && t1 === await q.evaluate(() => JSON.parse(localStorage.getItem('enp_kanal_30')).t), '30 gün ilk gelişten sayılır, aynı kampanyayla uzamaz');
  await c.close(); }
// etiketler ilk denemede okunamazsa dönüşüm kaybolmaz: yeniden denenir, ancak gönderilince işaretlenir
{ let n = 0; const [c] = await yeniBaglam(r => (++n === 1 ? r.fulfill({ status: 503, body: '' }) : r.fulfill({ json: ETIKET, headers: { 'access-control-allow-origin': '*' } }))); const q = await c.newPage();
  await q.addInitScript(() => localStorage.setItem('enpovi_cerez', 'tam'));
  await q.goto('https://enpovi.com/donusum/?o=deneme&i=bbbbbbbbbbbbbbbbbbbb&p=baslangic'); await q.waitForTimeout(3500);
  ok(n >= 2 && await q.evaluate(() => dataLayer.some(x => x[0] === 'event' && x[1] === 'conversion' && x[2].transaction_id === 'bbbbbbbbbbbbbbbbbbbb')), 'etiket hatasında yeniden denenip dönüşüm gönderilir (' + n + ' istek)');
  await c.close(); }
{ const [c] = await yeniBaglam(r => r.fulfill({ status: 503, body: '' })); const q = await c.newPage();
  await q.addInitScript(() => localStorage.setItem('enpovi_cerez', 'tam'));
  await q.goto('https://enpovi.com/donusum/?o=deneme&i=cccccccccccccccccccc&p=baslangic'); await q.waitForTimeout(6500);
  ok(!(await q.evaluate(() => (localStorage.getItem('enp_donusum') || '').includes('cccccccccccccccccccc'))), 'etiketler hiç okunamazsa "gönderildi" diye işaretlenmez');
  await c.close(); }
await b.close(); console.log(hata ? 'HATA ' + hata : 'tamam'); process.exit(hata ? 1 : 0);
