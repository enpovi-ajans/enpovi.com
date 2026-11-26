"""enpovi.com ana sayfa tema vitrini (Yasin, 25 Kasım 2026: "Projemizde yayınlanan temalar otomatik olarak enpovi.com'da gözükecek ya da kaldırılacak").

Kaynak tek: app.enpovi.com herkese açık GET /api/enpovi/vitrin/yayin (yayındaki ve satışta seçilebilen temalar; Yönetim → enpovi.com → Vitrin'de
öne sabitlenen önde, gizlenen yok). Bu betik kartları, tasarım ve renk paleti sayısını Türkçe (index.html) ve İngilizce (en/index.html) sayfaya
işaretler arasına yazar; ekran görüntüleri marka/web/v/<dal>-<no>.webp (ekran.mjs çeker); kullanılmayan görüntü silinir.
Yayındaki vitrin veri/vitrin.json'da durur (panel "yayında mı" diye buna bakar).
Fiyat: sitedeki paket fiyatları (Başlangıç 6.000, Profesyonel 15.000 TL/yıl; Yasin 19 Kasım 2026) platformdakinden farklıysa çıkış 3
(kartlar yine yazılır; iş kırmızı olur, fiyatı Yasin'in kararıyla elle güncelleyin).

Kullanım:
  python3 .github/vitrin/uygula.py eksik <vitrin.json>   doğrula; eksik ekran görüntülerini "adres dosya" satırlarıyla yaz
  python3 .github/vitrin/uygula.py fiyat <vitrin.json>   yalnızca fiyatı karşılaştır (farklıysa çıkış 3; her koşuda)
  python3 .github/vitrin/uygula.py <vitrin.json>         uygula (değişiklik yoksa dokunmaz); geçersizse ya da görüntü eksikse hiçbir dosya değişmez, çıkış 1
Çalışan yer: .github/workflows/vitrin.yml (10 dakikada bir + elle). Ajans araclar/blog/ingilizce.py de en/ sayfasını üretirken bunu kullanır.
"""
import html
import json
import os
import re
import sys

KOK = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SAYFA = {"tr": "index.html", "en": os.path.join("en", "index.html")}
VERI = os.path.join("veri", "vitrin.json")
GORSEL = os.path.join("marka", "web", "v")
APP = "https://app.enpovi.com"
EN_COK = 12
SITE_FIYAT = {"baslangic": 6000, "profesyonel": 15000}  # sayfada yazan (index.html paketler, SSS, en/index.html); değişirse burası da
KIMLIK = re.compile(r"^[a-z0-9-]{1,40}$")
YAZI = re.compile(r"^[^<>\"\x00-\x1f\x7f]{1,60}$")  # düz yazı; & ve ' kaçışlanarak yazılır
SURUM = re.compile(r'(<div class="vit" id="vit" data-surum=")([0-9a-f]{8})(")')
BOLUM = {ad: re.compile(r"(<!-- vitrin:%s -->)(.*?)(<!-- /vitrin:%s -->)" % (ad, ad), re.S) for ad in ("kartlar", "metin", "rozet")}


def dogrula(v):
    """Hata listesi (boşsa geçerli). Yalnızca sitede görünecek alanlar, sıkı biçim."""
    h = []
    if not isinstance(v, dict):
        return ["vitrin bir nesne değil"]
    if not (isinstance(v.get("surum"), str) and re.fullmatch(r"[0-9a-f]{8}", v["surum"])):
        h.append("sürüm geçersiz")
    s = v.get("sayi")
    if not (isinstance(s, dict) and all(isinstance(s.get(k), int) and not isinstance(s.get(k), bool) and 1 <= s[k] <= 100000 for k in ("tema", "dal", "palet"))):
        h.append("sayılar geçersiz")
    f = v.get("fiyat")
    if not (isinstance(f, dict) and all(isinstance(f.get(k), int) and f[k] > 0 for k in SITE_FIYAT)):
        h.append("fiyat geçersiz")
    t = v.get("temalar")
    if not (isinstance(t, list) and 1 <= len(t) <= EN_COK):
        return h + ["kart sayısı 1 ile %d arasında olmalı" % EN_COK]
    goruldu = set()
    for i, k in enumerate(t):
        if not isinstance(k, dict):
            h.append("kart %d nesne değil" % i)
            continue
        if not (isinstance(k.get("dal"), str) and KIMLIK.match(k["dal"]) and isinstance(k.get("no"), int) and not isinstance(k.get("no"), bool) and 1 <= k["no"] <= 9999):
            h.append("kart %d: dal ya da numara geçersiz" % i)
            continue
        if k.get("yol") != "/tema/%s/%d/" % (k["dal"], k["no"]):
            h.append("kart %d: adres geçersiz" % i)
        if not (isinstance(k.get("tema"), str) and KIMLIK.match(k["tema"])) or k["tema"] in goruldu:
            h.append("kart %d: tasarım geçersiz ya da iki kez" % i)
        goruldu.add(k.get("tema"))
        for a in ("ad", "dalAd", "sektorEn"):
            if not (isinstance(k.get(a), str) and YAZI.match(k[a]) and k[a].strip() == k[a]):
                h.append("kart %d: %s geçersiz" % (i, a))
        # ortak tema (Yasin, 26 Kasım 2026): kart tasarımın uygun olduğu paketleri taşır; eski tek "paket" alanı da geçerli
        # iki alan birlikte gelirse ikisi de denetlenir: geçerli "paketler" bozuk bir "paket" alanını örtmez
        pk = k.get("paketler", [k.get("paket")])
        if not (isinstance(pk, list) and pk and all(isinstance(x, str) and x in SITE_FIYAT for x in pk) and len(set(pk)) == len(pk)) \
                or ("paket" in k and k["paket"] not in SITE_FIYAT):
            h.append("kart %d: paket geçersiz" % i)
    # satışta seçilebilen iş dalları (G01, Yasin 26 Kasım 2026): sayfadaki "7 gün dene" çipleri bunlardan olmalı (kontrol.py); eski vitrinde yok
    d = v.get("dallar")
    if d is not None and not (isinstance(d, list) and 1 <= len(d) <= 500 and all(isinstance(x, str) and KIMLIK.match(x) for x in d) and len(set(d)) == len(d)):
        h.append("iş dalları geçersiz")
    return h


# "7 gün dene" bağlantısındaki iş dalı: ?dal=, &dal= ya da HTML'de &amp;dal= (ortak/vitrin.js ile aynı kural)
DAL_BAG = re.compile(r"app\.enpovi\.com/basla/?\?(?:[^\"'\s<>]*?&(?:amp;)?)?dal=([a-z0-9-]+)")


def dal_hatalari(metin, dallar):
    """Sayfadaki her ?dal= satışta seçilebilen iş dalı mı (G01). dallar geçersizse (liste değil vb.) hepsi hata: sessizce geçilmez."""
    bul = sorted(set(DAL_BAG.findall(metin)))
    if not (isinstance(dallar, list) and dallar and all(isinstance(x, str) and KIMLIK.match(x) for x in dallar)):
        return ["iş dalı listesi yok ya da geçersiz (veri/vitrin.json dallar), ?dal=%s denetlenemedi" % d for d in bul]
    return ["?dal=%s satışta tasarımı olan bir iş dalı değil (çipi kaldırın ya da \"biz hazırlayalım\"a yönlendirin)" % d for d in bul if d not in dallar]


def gorsel(k):
    return "%s/%s-%d.webp" % (GORSEL.replace(os.sep, "/"), k["dal"], k["no"])


def kart(k, dil):
    e = lambda x: html.escape(x, quote=True)
    src = gorsel(k) if dil == "tr" else "/" + gorsel(k)
    alt = "%s için %s tasarımı, telefonda" % (k["dalAd"], k["ad"]) if dil == "tr" else "%s: %s website design, on a phone" % (k["ad"], k["sektorEn"])
    alt_satir = k["dalAd"] if dil == "tr" else k["sektorEn"]
    return ('    <a class="vk" href="%s%s" target="_blank" rel="noopener"><span class="vk-tel"><img loading="lazy" decoding="async" src="%s" width="360" height="752" alt="%s"></span><b>%s</b><span>%s</span></a>'
            % (APP, e(k["yol"]), e(src), e(alt), e(k["ad"]), e(alt_satir)))


def bolumler(v, dil):
    s = v["sayi"]
    kartlar = "\n" + "\n".join(kart(k, dil) for k in v["temalar"]) + "\n    "
    if dil == "tr":
        metin = "%d sayfa tasarımı ve %d renk paleti. Hepsi telefonda rahat okunacak şekilde hazırlandı. Dokunun, canlı örneği açın." % (s["tema"], s["palet"])
        rozet = "%d tasarım<small>%d renk, siz seçin</small>" % (s["tema"], s["palet"])
    else:
        metin = "%d page designs and %d colour palettes, all made to read comfortably on a phone. Tap to open a live example." % (s["tema"], s["palet"])
        rozet = "%d designs<small>%d colour palettes, you choose</small>" % (s["tema"], s["palet"])
    return {"kartlar": kartlar, "metin": metin, "rozet": rozet}


def uygula(sayfa, v, dil):
    """Sayfaya vitrini yaz (v doğrulanmış olmalı). İşaretlerden biri yoksa ya da birden fazlaysa durur (sayfa yapısı değişmiş)."""
    for ad, yeni in bolumler(v, dil).items():
        n = len(BOLUM[ad].findall(sayfa))
        if n != 1:
            raise SystemExit("vitrin/uygula.py: sayfada vitrin:%s işareti %d kez (1 olmalı)" % (ad, n))
        sayfa = BOLUM[ad].sub(lambda m: m.group(1) + yeni + m.group(3), sayfa, count=1)
    # sayfadaki sürüm: ortak/vitrin.js açılışta platformdakiyle karşılaştırır, farklıysa kartları hemen yeniler
    if len(SURUM.findall(sayfa)) != 1:
        raise SystemExit("vitrin/uygula.py: sayfada vitrin sürümü (data-surum) bulunamadı ya da birden fazla")
    return SURUM.sub(lambda m: m.group(1) + v["surum"] + m.group(3), sayfa, count=1)


def fiyat_farki(v):
    return {k: (SITE_FIYAT[k], v["fiyat"][k]) for k in SITE_FIYAT if v["fiyat"][k] != SITE_FIYAT[k]}


def _yol(*p):
    return os.path.join(KOK, *p)


def eksik(v):
    return [k for k in v["temalar"] if not os.path.isfile(_yol(gorsel(k)))]


def main(argv):
    arg = argv[1:]
    kip = arg[0] if arg[:1] in (["eksik"], ["fiyat"]) else ""
    if kip:
        arg = arg[1:]
    if len(arg) != 1:
        print(__doc__)
        return 2
    try:
        v = json.load(open(arg[0], encoding="utf-8"))
    except (OSError, ValueError) as e:
        print("vitrin okunamadı; dokunulmadı:", e)
        return 1
    h = dogrula(v)
    if h:
        print("vitrin geçersiz; dokunulmadı:\n  " + "\n  ".join(h))
        return 1
    if kip == "fiyat":
        fark = fiyat_farki(v)
        if fark:
            print("::error::Paket fiyatı platformda değişmiş (sitede, platformda): %s. Sitedeki fiyatlar Yasin'in kararıyla elle güncellenir." % fark)
            return 3
        print("fiyat: sitedekiyle aynı")
        return 0
    if kip == "eksik":
        for k in eksik(v):
            print(APP + k["yol"], gorsel(k))
        return 0
    # yayındaki vitrinde iş dalı listesi varken yenisinde yoksa (platform eski sürüm) dokunulmaz: sayfadaki çiplerin denetimi kaybolmasın
    if v.get("dallar") is None and os.path.exists(_yol(VERI)) and json.load(open(_yol(VERI), encoding="utf-8")).get("dallar") is not None:
        print("vitrinde iş dalı listesi (dallar) yok, yayındakinde var; dokunulmadı")
        return 1
    if eksik(v):
        print("ekran görüntüsü eksik; dokunulmadı:", ", ".join(gorsel(k) for k in eksik(v)))
        return 1
    sayfalar = {d: open(_yol(p), encoding="utf-8").read() for d, p in SAYFA.items()}
    yeni = {d: uygula(s, v, d) for d, s in sayfalar.items()}
    for d, p in SAYFA.items():
        if yeni[d] != sayfalar[d]:
            open(_yol(p), "w", encoding="utf-8").write(yeni[d])
    veri = json.dumps(v, ensure_ascii=False, indent=1) + "\n"
    if not os.path.exists(_yol(VERI)) or open(_yol(VERI), encoding="utf-8").read() != veri:
        os.makedirs(_yol("veri"), exist_ok=True)
        open(_yol(VERI), "w", encoding="utf-8").write(veri)
    kullanilan = {os.path.basename(gorsel(k)) for k in v["temalar"]}
    for f in sorted(os.listdir(_yol(GORSEL))):
        if f.endswith(".webp") and f not in kullanilan:
            os.remove(_yol(GORSEL, f))
    print("vitrin: %d kart, %d tasarım, sürüm %s" % (len(v["temalar"]), v["sayi"]["tema"], v["surum"]))
    fark = fiyat_farki(v)
    if fark:
        print("::error::Paket fiyatı platformda değişmiş (sitede, platformda): %s. Sitedeki fiyatlar Yasin'in kararıyla elle güncellenir." % fark)
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
