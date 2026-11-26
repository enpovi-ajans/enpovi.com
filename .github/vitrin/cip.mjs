/* İş çipleri (ortak/vitrin.js dallar(); G01, Yasin 26 Kasım 2026): platform listesinde olmayan işin "7 gün dene" çipi gizlenir,
   liste yok, boş ya da bozuksa hiçbir çipe dokunulmaz; "Diğer işler" hep kalır. Gerçek tarayıcı, ağ taklidi.
   Çalıştır: node .github/vitrin/cip.mjs (MODUL=<node_modules üstü> isteğe bağlı) */
import { createRequire } from 'node:module'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(path.join(process.env.MODUL || process.cwd(), 'x.js'))('playwright');
const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'); let hata = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) hata++; };
const V = JSON.parse(fs.readFileSync(path.join(KOK, 'veri/vitrin.json'), 'utf8'));
const b = await chromium.launch();
async function dene(yol, govde) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('https://enpovi.com/**', r => { let p = new URL(r.request().url()).pathname; if (p.endsWith('/')) p += 'index.html'; const f = path.join(KOK, p);
    if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ body: fs.readFileSync(f), contentType: { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[path.extname(f)] || 'application/octet-stream' }); });
  await ctx.route('https://app.enpovi.com/api/enpovi/vitrin/yayin', r => r.fulfill({ body: govde, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' } }));
  await ctx.route(/app\.enpovi\.com\/api\/(?!enpovi\/vitrin)|googletagmanager|facebook\.net|google-analytics|challenges\.cloudflare/, r => r.fulfill({ status: 204, body: '' }));
  const p = await ctx.newPage(); await p.goto('https://enpovi.com' + yol); await p.waitForTimeout(700);
  const g = await p.evaluate(() => [...document.querySelectorAll('a[data-dene][href*="dal="], .dene-is a:not([href*="dal="]), .sks-cip a:not([href*="dal="])')].map(a => ({ h: a.getAttribute('href'), gizli: getComputedStyle(a).display === 'none' })));
  await ctx.close(); return g;
}
for (const yol of ['/', '/en/']) {
  const tum = await dene(yol, JSON.stringify(V));
  ok(tum.length > 3 && tum.every(x => !x.gizli), yol + ' tam listede hiçbir çip gizlenmez');
  const g = await dene(yol, JSON.stringify({ ...V, dallar: V.dallar.filter(x => x !== 'kombi-servisi') }));
  const gz = g.filter(x => x.gizli).map(x => x.h);
  ok(gz.length >= 1 && gz.every(h => h.endsWith('?dal=kombi-servisi')), yol + ' listede olmayan iş gizlenir ' + JSON.stringify(gz));
  ok(g.some(x => x.h === 'https://app.enpovi.com/basla/' && !x.gizli), yol + ' "Diğer işler" kalır');
  for (const [ad, govde] of [['liste yok', JSON.stringify({ ...V, dallar: undefined })], ['boş liste', JSON.stringify({ ...V, dallar: [] })],
    ['bozuk liste', JSON.stringify({ ...V, dallar: ['<x>'] })], ['dizge', JSON.stringify({ ...V, dallar: 'cicekci' })], ['geçersiz yanıt', 'x']]) {
    const s = await dene(yol, govde); ok(s.every(x => !x.gizli), yol + ' ' + ad + ': hiçbir çipe dokunulmaz');
  }
}
await b.close(); console.log(hata ? hata + ' hata' : 'tamam'); process.exit(hata ? 1 : 0);
