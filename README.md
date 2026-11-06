# enpovi.com · tanıtım sitesi

Enpovi sosyal medya ajansının herkese açık tanıtım sitesi: ana sayfa, blog, hizmet (sektör) sayfaları, örnek işler, gizlilik.
Statik HTML, GitHub Pages ile yayınlanır (`main`'e birleşen her değişiklik birkaç dakikada canlıda). Alan adı `CNAME`, Jekyll kapalı (`.nojekyll`).

**Müşteri panelleri, giriş ve yönetim burada değil**: hepsi `https://app.enpovi.com/` (`enpovi-ajans/platform`). Bu repoya müşteri görseli, videosu
ya da paneli konmaz; repo herkese açıktır. Eski panel adresleri `404.html` üzerinden app.enpovi.com'a yönlenir.

## Hangi dosya nereden gelir
| Dosya / klasör | Kaynak | Nasıl değiştirilir |
|---|---|---|
| `blog/`, `hizmetler/`, `isler/`, `sitemap.xml`, `blog/feed.xml` | ajans reposu `blog/enpovi/` (Markdown) | `python3 araclar/blog/blog.py blog/enpovi ../enpovi.com` (ajans reposundan). **Elle düzenleme**, bir sonraki üretimde silinir |
| `index.html` (ana sayfa) | bu repo | Elle; yorumlar bölümü (`<!-- yorumlar -->`) blog.py tarafından yalnızca izinli sözlerle doldurulur |
| `gizlilik/`, `404.html`, `llms.txt`, `robots.txt` | bu repo | Elle |
| `ortak/analiz.js` | bu repo | Google Analytics + çerez notu (izin verilene kadar çerez yok) |
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
