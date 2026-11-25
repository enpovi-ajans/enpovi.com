// Vitrin kartlarının ekran görüntüsü (vitrin.yml): her satır "adres dosya" (uygula.py eksik çıktısı).
// Telefon görünümü 360×752, yeni temanın ilk ekranı; WebP (kalite 0,8) tarayıcının kendi kodlayıcısıyla. Biri açılamazsa çıkış 1, hiçbir dosya yazılmaz.
// Kullanım: node .github/vitrin/ekran.mjs <liste.txt>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(path.join(process.env.MODUL || process.cwd(), 'x.js'))('playwright'); // MODUL: başka yerdeki kurulum (tarayici.mjs gibi)

const satirlar = fs.readFileSync(process.argv[2], 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const is = satirlar.map(s => s.split(' ')).filter(([u, d]) => /^https:\/\/app\.enpovi\.com\/tema\/[a-z0-9-]+\/\d+\/$/.test(u) && /^marka\/web\/v\/[a-z0-9-]+-\d+\.webp$/.test(d || ''));
if (is.length !== satirlar.length) { console.error('ekran.mjs: geçersiz satır var'); process.exit(1); }
if (!is.length) process.exit(0);

const tarayici = await chromium.launch();
const bag = await tarayici.newContext({ viewport: { width: 360, height: 752 }, deviceScaleFactor: 1, reducedMotion: 'reduce', isMobile: true, hasTouch: true });
const yaz = [];
try {
  for (const [u, d] of is) {
    const p = await bag.newPage();
    const r = await p.goto(u + '?kart=1', { waitUntil: 'networkidle', timeout: 45000 });
    if (!r || r.status() !== 200) throw new Error(`${u}: ${r && r.status()}`);
    // tema arşivinin seçim şeridi ve örnek notu görüntüye girmez (kart müşterinin göreceği siteyi göstersin)
    await p.addStyleTag({ content: 'nav.vitrin,.ornek-not,.vipucu{display:none!important}' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(800);
    const png = await p.screenshot({ type: 'png' });
    const webp = await p.evaluate(async b64 => {
      const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
      const c = document.createElement('canvas'); c.width = 360; c.height = 752; c.getContext('2d').drawImage(im, 0, 0);
      return c.toDataURL('image/webp', 0.8);
    }, png.toString('base64'));
    if (!webp.startsWith('data:image/webp;base64,')) throw new Error(u + ': WebP kodlanamadı');
    const veri = Buffer.from(webp.split(',')[1], 'base64');
    if (veri.length < 4000) throw new Error(`${u}: görüntü boş görünüyor (${veri.length} bayt)`);
    yaz.push([d, veri]); await p.close();
    console.log('ekran', d, veri.length);
  }
} finally { await tarayici.close(); }
for (const [d, veri] of yaz) { fs.mkdirSync(path.dirname(d), { recursive: true }); fs.writeFileSync(d, veri); }
