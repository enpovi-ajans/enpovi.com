# enpovi.com · çalışma notu

Kullanıcı Türkçe konuşur; kısa ve net yanıt ver. Bu repo herkese açıktır: müşteri verisi, panel, gizli anahtar ya da iç not konmaz.

**Her işe başlamadan** `enpovi-ajans/ajans` reposundaki `docs/PROTOKOL.md` (kalıcı çalışma protokolü; başındaki uyarlamalar kutusu önce gelir) ve ajans `CLAUDE.md` (kurallar, "Hatasız iş kuralı") okunur. Bu reponun yapısı: `README.md`.

### Bağımsız inceleme kuralı (Yasin, 9 Kasım 2026: "denetçi mekanizması ile çok yoğun çalışmanı istiyorum")
Her kod değişikliği birleşmeden önce, kodu yazan oturumdan **bağımsız** bir incelemeden geçer. Bu kural alt ajan kullanımına açık izindir.
- **Nasıl:** `code-review` becerisi (`high`, hedef PR dalı) ya da kodu görmemiş yeni bir alt ajan (Agent; `fork` değil). İncelemeciye yalnızca diff (`git diff origin/main...HEAD`), değişen dosyaların ilgili bölümü ve "Hatasız iş kuralı"nın 6 sorusu verilir; yazanın kendi sonucu ve "doğru olduğunu düşünüyorum" yönlendirmesi verilmez.
- **Kapsam:** yalnızca değişen diff (kullanım tasarrufu). Yalnızca `.md`/not/veri değişikliği muaf.
- **Bulgular:** her biri kodda doğrulanır; geçerliyse düzeltilir + test eklenir, geçersizse gerekçesi yazılır. Düzeltilen kısım bir kez daha incelenir (en fazla 2 tur; kalan şüphe PR'da açıkça yazılır). Bulgular kapanmadan birleştirme yok.
- **Kayıt:** PR açıklamasında "Bağımsız inceleme" bölümü: kaç bulgu, hangisi düzeltildi (test adıyla), hangisi neden geçersiz.
- Dış denetim (TXT, `DENETIM.md`, aciliyet sırası) bunun yerine geçmez; ek olarak sürer.
