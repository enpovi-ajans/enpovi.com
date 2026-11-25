/* Canlı vitrin denetimi (ortak/vitrin.js): platformdaki sürüm sayfadakinden farklıysa kartlar ve sayılar hemen yenilenir; ekran görüntüsü
   olmayan yeni tema canlı küçük görünümle (kart görünümü ?kart=1) gelir; TR + EN, telefon + bilgisayar, taşma ve JS hatası yok.
   Çalıştır: node .github/vitrin/canli.mjs (MODUL=<node_modules üstü> isteğe bağlı) */
import { createRequire } from 'node:module'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(path.join(process.env.MODUL || process.cwd(), 'x.js'))('playwright');
const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const v = JSON.parse(fs.readFileSync(path.join(KOK, 'veri', 'vitrin.json'), 'utf8'));
const yeni = JSON.parse(JSON.stringify(v)); yeni.surum = 'abcdef12'; yeni.sayi = { tema: 99, dal: 600, palet: 20 };
yeni.temalar = [{ ...v.temalar[0], dal: 'yeni-dal', no: 99, tema: 'yeni', ad: 'Yeni & Taze', yol: '/tema/yeni-dal/99/' }, ...v.temalar.slice(1, 5)];
const b = await chromium.launch(); let hata = 0;
const yerel = r => { let p = new URL(r.request().url()).pathname; if (p.endsWith('/')) p += 'index.html'; const f = path.join(KOK, p);
  if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' }); r.fulfill({ body: fs.readFileSync(f), contentType: { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }[path.extname(f)] || 'application/octet-stream' }); };
for (const [yol, dil] of [['/', 'tr'], ['/en/', 'en']]) for (const w of [375, 1440]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } }); const err = [];
  p.on('pageerror', e => err.push(e.message)); await p.route('https://enpovi.com/**', yerel);
  await p.route('https://app.enpovi.com/api/enpovi/vitrin/yayin', r => r.fulfill({ json: yeni, headers: { 'access-control-allow-origin': '*' } }));
  await p.route(/tema\/yeni-dal\/99\/\?kart=1$/, r => r.fulfill({ body: '<html><body style="margin:0;background:#c33;height:752px">yeni</body></html>', contentType: 'text/html' }));
  await p.route(/googletagmanager|google-analytics|api\/enpovi\/(olay|etiket)|challenges\.cloudflare/, r => r.abort());
  await p.goto('https://enpovi.com' + yol); await p.waitForFunction(() => document.getElementById('vit').getAttribute('data-surum') === 'abcdef12', null, { timeout: 8000 });
  await p.locator('#vit').scrollIntoViewIfNeeded(); await p.waitForTimeout(800);
  const s = await p.evaluate(() => ({ n: document.querySelectorAll('#vit .vk').length, ilk: document.querySelector('#vit .vk b').textContent, alt: document.querySelector('#vit .vk > span:last-child').textContent,
    ifr: !!document.querySelector('#vit .vk-canli iframe'), tf: document.querySelector('#vit .vk-canli iframe')?.style.transform, cw: document.querySelector('#vit .vk-canli')?.clientWidth, ch: document.querySelector('#vit .vk-canli')?.clientHeight,
    m: document.querySelector('[data-vitrin=metin]').textContent, r: document.querySelector('[data-vitrin=rozet]').innerHTML, tasma: document.documentElement.scrollWidth - innerWidth,
    img2: document.querySelectorAll('#vit .vk img')[0]?.src }));
  console.log(dil, w, JSON.stringify(s), err);
  if (s.n !== 5 || !s.ifr || s.tasma > 0 || err.length || !s.m.startsWith('99') || s.ilk !== 'Yeni & Taze' || !s.alt) hata++;
  await p.close();
}
await b.close(); console.log(hata ? 'HATA ' + hata : 'tamam'); process.exit(hata ? 1 : 0);
