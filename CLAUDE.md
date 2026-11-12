# enpovi.com · çalışma notu

Kullanıcı Türkçe konuşur; kısa ve net yanıt ver. Bu repo herkese açıktır: müşteri verisi, panel, gizli anahtar ya da iç not konmaz.

**En üst belge:** `enpovi-ajans/ajans` reposundaki `ANAYASA.md` (Enpovi Anayasası v4.0, Yasin 12 Kasım 2026; kalıcı ve bağlayıcı, başındaki uyarlamalar kutusu önce gelir). Bu repoda en çok: Bölüm 3 (tasarım sistemi, 375 px), 13 (Core Web Vitals: LCP ≤ 2,5 sn, INP ≤ 200 ms, CLS ≤ 0,1), 17 (WCAG 2.2 AA), 21 (gerçek bilgi, sahte yorum/sayı/iddia yok) ve 7.2 (herkese açık repoya müşteri verisi, gizli anahtar, iç not konmaz). Enpovi fiyatı burada yazılmaz.

**Altyapı:** ajans `ALTYAPI-REHBERI.md` (v2.0, Yasin 12 Kasım 2026; anayasanın altında). Bu site GitHub Pages'ta, DNS Cloudflare'de; panel ve müşteri siteleri burada değil (app.enpovi.com). Rehber metni bu herkese açık repoya kopyalanmaz.

**Her işe başlamadan** `enpovi-ajans/ajans` reposundaki `docs/PROTOKOL.md` (kalıcı çalışma protokolü; başındaki uyarlamalar kutusu önce gelir) ve ajans `CLAUDE.md` (kurallar, "Hatasız iş kuralı") okunur. Bu reponun yapısı: `README.md`.

**Tasarım ve kod kuralları:** ajans `docs/TASARIM-KURALLARI.md` (Master Instruction, Yasin 9 Kasım 2026; başındaki uyarlamalar kutusu önce gelir) her tema, panel ekranı ve kod değişikliğinde geçerli.

### Bağımsız inceleme kuralı (Yasin, 9 Kasım 2026: "denetçi mekanizması ile çok yoğun çalışmanı istiyorum")
Her kod değişikliği birleşmeden önce, kodu yazan oturumdan **bağımsız** bir incelemeden geçer. Bu kural alt ajan kullanımına açık izindir.
- **Nasıl:** `code-review` becerisi (`high`, hedef PR dalı) ya da kodu görmemiş yeni bir alt ajan (Agent; `fork` değil). İncelemeciye yalnızca diff (`git diff origin/main...HEAD`), değişen dosyaların ilgili bölümü ve "Hatasız iş kuralı"nın 6 sorusu verilir; yazanın kendi sonucu ve "doğru olduğunu düşünüyorum" yönlendirmesi verilmez.
- **Kapsam:** yalnızca değişen diff (kullanım tasarrufu). Yalnızca `.md`/not/veri değişikliği muaf.
- **Bulgular:** her biri kodda doğrulanır; geçerliyse düzeltilir + test eklenir, geçersizse gerekçesi yazılır. Düzeltilen kısım bir kez daha incelenir (en fazla 2 tur; kalan şüphe PR'da açıkça yazılır). Bulgular kapanmadan birleştirme yok.
- **Kayıt:** PR açıklamasında "Bağımsız inceleme" bölümü: kaç bulgu, hangisi düzeltildi (test adıyla), hangisi neden geçersiz.
- Dış denetim (TXT, `DENETIM.md`, aciliyet sırası) bunun yerine geçmez; ek olarak sürer.
