/* enpovi.com tarayıcı denetimi: her sayfa telefon (390 px) ve bilgisayar (1280 px) genişliğinde açılır.
   - Erişilebilirlik: axe-core WCAG 2.1 AA, kritik/ciddi ihlal yok (kontrast, alt yazı, etiket, düğme adı…)
   - SEO: başlık 10–70 / açıklama 50–170 karakter, tek h1, başlık sırası atlamaz, lang, canonical, og:image (https)
   - Kalite: JS hatası yok, yatay taşma yok, yinelenen id yok, #bağlantı hedefi var
   Çalıştır: npm i --no-save playwright axe-core && npx playwright install chromium && node .github/kontrol/tarayici.mjs
   (MODUL=<node_modules'un üst klasörü> ile başka yerdeki kurulum da kullanılabilir) */
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const req = createRequire(path.join(process.env.MODUL || process.cwd(), 'x.js'));
const { chromium } = req('playwright');
const AXE = fs.readFileSync(req.resolve('axe-core/axe.min.js'), 'utf8');
const KOK = process.cwd();

// sitemap + 404 sayfası; sitemap dışı ama yayındaki önemli sayfalar da (gizlilik vb. sitemap'te)
const sm = fs.readFileSync(path.join(KOK, 'sitemap.xml'), 'utf8');
const yollar = [...new Set([...sm.matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)].map(m => m[1] || '/'))];
yollar.push('/404.html');

const TUR = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.xml': 'application/xml', '.json': 'application/json', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const sunucu = http.createServer((q, r) => {
  let y = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  let f = path.join(KOK, y);
  if (!f.startsWith(KOK)) { r.writeHead(403); return r.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TUR[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0);
const ADRES = `http://127.0.0.1:${sunucu.address().port}`;

const SEO = ({ ozel }) => {
  const s = [], m = (n) => document.querySelector(`meta[name="${n}"],meta[property="${n}"]`)?.content || '';
  const t = document.title.trim(), d = m('description');
  if (t.length < 10 || t.length > 70) s.push(`başlık ${t.length} karakter: «${t}»`);
  if (!ozel && (d.length < 50 || d.length > 170)) s.push(`açıklama ${d.length} karakter`);
  if (!document.documentElement.lang) s.push('lang yok');
  const h1 = document.querySelectorAll('h1').length; if (h1 !== 1) s.push(`${h1} adet h1`);
  let son = 1; for (const h of document.querySelectorAll('h1,h2,h3,h4,h5')) { const n = +h.tagName[1]; if (n > son + 1) s.push(`başlık sırası atlıyor: h${son} → h${n} «${h.textContent.trim().slice(0, 40)}»`); son = n; }
  if (!ozel) {
    if (!document.querySelector('link[rel=canonical]')) s.push('canonical yok');
    const og = m('og:image'); if (!og) s.push('og:image yok'); else if (!/^https:\/\//.test(og)) s.push('og:image mutlak değil');
  }
  const idler = {}; for (const e of document.querySelectorAll('[id]')) idler[e.id] = (idler[e.id] || 0) + 1;
  for (const [k, n] of Object.entries(idler)) if (n > 1) s.push(`id «${k}» ${n} kez`);
  for (const a of document.querySelectorAll('a[href^="#"]')) { const h = decodeURIComponent(a.getAttribute('href').slice(1)); if (h && !document.getElementById(h) && !document.getElementsByName(h).length && !/^teklif-/.test(h)) s.push(`bağlantı hedefi yok: #${h}`); }
  if (document.documentElement.scrollWidth > innerWidth + 1) s.push(`yatay taşma ${document.documentElement.scrollWidth - innerWidth}px`);
  return [...new Set(s)];
};

const b = await chromium.launch();
const hatalar = []; let sayi = 0;
for (const [gen, yuk] of [[390, 844], [1280, 900]]) {
  const ctx = await b.newContext({ viewport: { width: gen, height: yuk }, reducedMotion: 'reduce', isMobile: gen < 600, hasTouch: gen < 600 });
  await ctx.route('**/*', r => r.request().url().startsWith(ADRES) ? r.continue() : r.abort()); // dış istek yok (yazı tipi, analiz)
  const p = await ctx.newPage(); let js = [];
  p.on('pageerror', e => js.push(e.message));
  for (const y of yollar) {
    js = [];
    const r = await p.goto(ADRES + y, { waitUntil: 'load' });
    if (!r || (r.status() !== 200 && y !== '/404.html')) { hatalar.push(`${y}: durum ${r?.status()}`); continue; }
    await p.evaluate(() => document.querySelectorAll('.gel,.rv,.reveal,[data-gel]').forEach(e => e.classList.add('gor', 'in', 'gorundu', 'acik', 'visible')));
    await p.waitForTimeout(150);
    const ad = `${y} (${gen}px)`;
    for (const x of js) hatalar.push(`${ad}: JS hatası ${x}`);
    if (gen === 390) for (const x of await p.evaluate(SEO, { ozel: y === '/404.html' })) hatalar.push(`${ad}: ${x}`);
    else { const tas = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (tas > 1) hatalar.push(`${ad}: yatay taşma ${tas}px`); }
    await p.addScriptTag({ content: AXE });
    const v = await p.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] })).violations
      .filter(v => v.impact === 'critical' || v.impact === 'serious').map(v => `[${v.impact}] ${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 2).map(n => n.target.join(' ') + (n.any?.[0]?.message ? ' → ' + n.any[0].message.slice(0, 110) : '')).join(' | ')}`));
    for (const x of v) hatalar.push(`${ad}: ${x}`);
    sayi++;
  }
  await ctx.close();
}
/* Örnek site formu + insan doğrulaması (Denetim 04 C04-04): Turnstile forma ilk dokunuşta yüklenir, belirteç talebe eklenir;
   Turnstile yüklenemezse belirteçsiz giden talebin hatası WhatsApp yoluyla gösterilir. Dış istekler taklit edilir. */
for (const durum of ['tamam', 'engelli', 'etkilesim']) {
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const giden = []; let tsIstendi = 0;
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith(ADRES)) return r.continue();
    if (u.startsWith('https://challenges.cloudflare.com/turnstile/')) { tsIstendi++; return durum === 'engelli' ? r.abort() : r.fulfill({ contentType: 'text/javascript',
      body: durum === 'etkilesim' ? "window.turnstile={render:function(s,o){window.__ts=o;setTimeout(function(){o['before-interactive-callback']()},100);return 'w1'},reset:function(){}};setTimeout(function(){window.tsHazir()},0)"
        : "window.turnstile={render:function(s,o){window.__ts=o;setTimeout(function(){o.callback('taklit-belirtec')},200);return 'w1'},reset:function(){}};setTimeout(function(){window.tsHazir()},0)" }); }
    if (u === 'https://app.enpovi.com/api/talep') { const g = JSON.parse(r.request().postData() || '{}'); giden.push(g);
      return r.fulfill(g.ts ? { status: 200, contentType: 'application/json', body: '{"ok":true}', headers: { 'access-control-allow-origin': ADRES } }
        : { status: 400, contentType: 'application/json', body: '{"hata":"Güvenlik doğrulaması tamamlanmadı. WhatsApp\'tan yazın."}', headers: { 'access-control-allow-origin': ADRES } }); }
    return r.abort();
  });
  const p = await ctx.newPage(); const js = []; p.on('pageerror', e => js.push(e.message));
  await p.goto(ADRES + '/', { waitUntil: 'load' });
  const ad = `örnek site formu (${durum})`;
  if (tsIstendi) hatalar.push(`${ad}: Turnstile sayfa açılışında yüklendi (forma dokunmadan yüklenmemeli)`);
  await p.fill('#istek [name=ad]', 'Deneme Kuaför'); await p.fill('#istek [name=dal]', 'Kuaför'); await p.fill('#istek [name=iletisim]', '05321112233');
  await p.check('#istek [name=kvkk]'); await p.waitForTimeout(2600);
  await p.click('#istek button[type=submit]');
  if (durum === 'tamam') {
    await p.waitForSelector('#istTamam:not([hidden])', { timeout: 20000 }).catch(() => hatalar.push(`${ad}: başarı ekranı açılmadı`));
    if (giden.length !== 1 || giden[0].ts !== 'taklit-belirtec') hatalar.push(`${ad}: belirteç talebe eklenmedi ${JSON.stringify(giden)}`);
    const o = await p.evaluate(() => window.__ts); if (!o || o.action !== 'talep' || o.appearance !== 'interaction-only' || !/^0x4/.test(o.sitekey)) hatalar.push(`${ad}: widget ayarı ${JSON.stringify(o)}`);
  } else if (durum === 'engelli') {
    const t0 = Date.now();
    await p.waitForSelector('#istNot a[href*="wa.me"]', { timeout: 20000 }).catch(() => hatalar.push(`${ad}: Turnstile yüklenemeyince WhatsApp yolu gösterilmedi`));
    if (Date.now() - t0 > 3000) hatalar.push(`${ad}: Turnstile yüklenemeyince ${Date.now() - t0} ms beklendi (hemen gösterilmeli)`);
    if (giden.length) hatalar.push(`${ad}: belirteçsiz talep gönderildi ${JSON.stringify(giden)}`);
  }
  if (durum === 'etkilesim') {
    await p.waitForFunction(() => /doğrulama kutusunu/.test(document.getElementById('istNot').textContent), null, { timeout: 5000 }).catch(() => hatalar.push(`${ad}: kutu açılınca kullanıcıya söylenmedi`));
    if (giden.length) hatalar.push(`${ad}: belirteçsiz talep gönderildi`);
    if (!(await p.evaluate(() => document.getElementById('istTs').classList.contains('acik')))) hatalar.push(`${ad}: doğrulama kutusu görünür yapılmadı`);
    const tas = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (tas > 1) hatalar.push(`${ad}: yatay taşma ${tas}px`);
  }
  for (const x of js) hatalar.push(`${ad}: JS hatası ${x}`);
  await ctx.close();
}
await b.close(); sunucu.close();
if (hatalar.length) { console.error(hatalar.join('\n')); console.error(`\ntarayıcı denetimi: ${hatalar.length} sorun (${sayi} sayfa görünümü)`); process.exit(1); }
console.log(`tarayıcı denetimi: ${sayi} sayfa görünümü (telefon + bilgisayar), erişilebilirlik/SEO sorunu yok`);
