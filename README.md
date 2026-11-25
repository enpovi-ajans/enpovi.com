# enpovi.com · tanıtım sitesi

Enpovi sosyal medya ajansının herkese açık tanıtım sitesi: ana sayfa, blog, hizmet (sektör) sayfaları, örnek işler, gizlilik.
Statik HTML, GitHub Pages ile yayınlanır (`main`'e birleşen her değişiklik birkaç dakikada canlıda). Alan adı `CNAME`, Jekyll kapalı (`.nojekyll`).

**Müşteri panelleri, giriş ve yönetim burada değil**: hepsi `https://app.enpovi.com/` (`enpovi-ajans/platform`). Bu repoya müşteri görseli, videosu
ya da paneli konmaz; repo herkese açıktır. Eski panel adresleri `404.html` üzerinden app.enpovi.com'a yönlenir.

## Hangi dosya nereden gelir
| Dosya / klasör | Kaynak | Nasıl değiştirilir |
|---|---|---|
| `blog/`, `hizmetler/`, `isler/`, `sitemap.xml`, `blog/feed.xml`, `llms.txt` | ajans reposu `blog/enpovi/` (Markdown) | `python3 araclar/blog/blog.py blog/enpovi ../enpovi.com` (ajans reposundan). **Elle düzenleme**, bir sonraki üretimde silinir |
| `index.html` (ana sayfa) | bu repo | Elle; yorumlar bölümü (`<!-- yorumlar -->`) blog.py tarafından yalnızca izinli sözlerle doldurulur. **Ana başlık, alt metin ve Merak edilenler** app.enpovi.com Yönetim → enpovi.com → İçerik'ten değişir: `.github/workflows/icerik.yml` 10 dakikada bir `.github/icerik/uygula.py` ile `index.html` + `en/index.html` + `veri/icerik.json`'a yazar (bu üç alanın tek kaynağı paneldir: elle yapılan değişiklik, panelde kayıt varsa bir sonraki çalışmada panel metniyle değişir; panelde hiç kayıt yokken elle değiştirirseniz `python3 .github/icerik/uygula.py --cikar` ile `veri/icerik.json`'u güncelleyin. Kurallar platformdaki doğrulayıcıyla aynı, ortak örnekler `.github/icerik/ornekler.json`; test `python3 -m unittest discover -s .github/icerik`) |
| `gizlilik/`, `404.html`, `robots.txt` | bu repo | Elle |
| `ortak/analiz.js` | bu repo | Enpovi çerezsiz sayacı (ziyaret oturumda bir kez, açılan sayfa, WhatsApp, arama, form, Instagram, tema kartı, deneme; düğmenin yeri `data-yer` ya da bölümün kimliği → app.enpovi.com/api/enpovi/olay) + kanal (utm, fbclid, gclid/gbraid/wbraid; izinle 30 gün) + etiketler (GA4, GTM, Google Ads, Meta Pixel; kimlikler app.enpovi.com Yönetim → enpovi.com → Etiketler) + çerez notu. GA4 izin modunda, reklam etiketleri yalnızca "Tamam" sonrası. Deneme dönüşümü düğmede değil `donusum/` sayfasında (deneme kurulunca app.enpovi.com/basla/ gizli çerçevede açar; istek başına bir kez). Testler `.github/kontrol/tarayici.mjs` "ölçüm" ve `.github/kontrol/olay.mjs` |
| Tema vitrini (`index.html` + `en/index.html` `<!-- vitrin:kartlar -->`, `veri/vitrin.json`, `marka/web/v/`) | app.enpovi.com Yönetim → enpovi.com → Vitrin (yayındaki temalardan kendiliğinden; sabitle/gizle) | `ortak/vitrin.js` sayfa açılınca platformu okur, sürüm farklıysa kartları hemen yeniler (görüntüsü olmayan tema canlı küçük görünümle); `.github/workflows/vitrin.yml` 10 dakikada bir ekran görüntüsü çekip (`.github/vitrin/ekran.mjs`) sayfaya yazar (`.github/vitrin/uygula.py`). Elle değiştirmeyin. Testler `python3 -m unittest discover -s .github/vitrin`, `node .github/vitrin/canli.mjs` |
| `.github/site-yaz.sh` | bu repo | Siteye yazan otomatik işlerin (icerik.yml, vitrin.yml; aynı sıra `site-yaz`) ortak gönderimi: kontrol, commit, çakışmada güncel main üstünde yeniden (4 deneme), Pages yapımı |
| `ortak/font/` | bu repo | Kendi sunucumuzdaki web fontları (dış CDN yok) |
| `marka/` | bu repo (logoların asılları ajans reposu `marka/logo/`) | Logo, favicon, paylaşım görselleri, ana sayfa vitrini (`marka/is/`); `marka/logo/` dış kullanım (e-posta imzası vb.) için de yayında, silme |
| `34dc…txt` | IndexNow anahtar dosyası | Silme: `.github/workflows/indexnow.yml` sitemap değişince adresleri Bing/Yandex'e bildirirken kullanır |

## Yerelde bakmak
```bash
python3 -m http.server 8000      # → http://localhost:8000/
```
Değişiklikten sonra iPhone 13 genişliğinde yatay taşma olmadığını kontrol et. Kod kuralları: ajans reposu `KOD-STANDARTLARI.md`, sistemin bütünü `MIMARI.md`.

Otomatik kontrol: `python3 .github/kontrol/kontrol.py` (kırık bağlantı, sitemap, JSON-LD, panel/medya yasağı). GitHub Actions → Kontrol her PR'da çalıştırır; kırmızıysa birleştirme.

Not: git geçmişi büyüktür (~870 MB, 4 Kasım 2026 öncesi panel görselleri). Yayını etkilemez; temizlemek geçmişi yeniden yazmak demek, ancak karar verilirse yapılır.
