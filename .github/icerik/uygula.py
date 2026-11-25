"""enpovi.com içerik düzenleme (Yasin, 25 Kasım 2026: "enpovi.com'u yönetim panelimizden yönetebilelim, içerikleri değiştirebilelim").

Yönetim → enpovi.com → İçerik'te kaydedilen metin app.enpovi.com/api/enpovi/icerik adresinden okunur ve ana sayfaya
(Türkçe index.html, İngilizce en/index.html) yazılır. Düzenlenen alanlar:
  baslik: ana başlığın iki satırı (*kelime* vurgulu yazılır), alt: başlığın altındaki metin, sss: Merak edilenler (soru + cevap).
Sıkça sorulanlar yapılandırılmış veride (FAQPage) de aynen güncellenir. Metin düz yazıdır: HTML yazılamaz, her şey kaçışlanır.
Yayında olan içerik veri/icerik.json'da durur (panel "yayında mı" diye buna bakar).

Kullanım:
  python3 .github/icerik/uygula.py <icerik.json>   uygula (değişiklik yoksa dokunmaz); geçersizse hiçbir dosya değişmez, çıkış 1
  python3 .github/icerik/uygula.py --cikar          sayfalardaki bugünkü metni veri/icerik.json'a yaz
Çalışan yer: .github/workflows/icerik.yml (10 dakikada bir + elle). Ajans araclar/blog/ingilizce.py de en/ sayfasını üretirken bunu kullanır.
"""
import html
import json
import os
import re
import sys

KOK = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SAYFA = {"tr": "index.html", "en": os.path.join("en", "index.html")}
VERI = os.path.join("veri", "icerik.json")
SINIR = {"satir": 40, "alt": 220, "soru": 140, "cevap": 700, "sss_en_az": 3, "sss_en_cok": 12}
# Değişmez içerik kuralları (ajans CLAUDE.md): üstünlük iddiası ve fiyat yazılmaz (fiyat kartları ayrı, tek kaynaktan).
YASAK = [(re.compile(r"\ben (iyi|ucuz|ucuzu|iyisi|uygun fiyatl[ıi])\b|\b(1|bir) numara\b|\brakipsiz\b", re.I), "üstünlük iddiası yazılmaz (\"en iyi\", \"en ucuz\" gibi)"),
         (re.compile(r"\bthe (best|cheapest)\b|\bnumber one\b", re.I), "no superlative claims (\"the best\", \"the cheapest\")"),
]
# Fiyat: yalnızca web sitesi paketleri (Başlangıç 6.000, Profesyonel 15.000 TL/yıl; Yasin 19 Kasım 2026). Başka tutar yazılmaz.
PAKET_TUTAR = {"6000", "15000"}
TUTAR = re.compile(r"(?<![\d.,])(\d{1,3}(?:[.,]\d{3})+)(?![\d])|(\d+)\s*(?:TL|₺|lira)\b|₺\s*(\d[\d.,]*)", re.I)  # binlik ayraçlı sayı ya da para birimli tutar

H1 = re.compile(r'(<h1 class="gir d1">)(.*?)(</h1>)', re.S)
ALT = re.compile(r'(<p class="alt gir d2">)(.*?)(</p>)', re.S)
SSS = re.compile(r'(<div class="sss r d1">\n)(.*?)(\n  </div>)', re.S)
LD = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.S)


def _bir(desen, s, ad):
    m = list(desen.finditer(s))
    if len(m) != 1:
        raise SystemExit(f"uygula.py: sayfada {ad} bulunamadı ya da birden fazla ({len(m)}); sayfa yapısı değişmiş")
    return m[0]


def metin(v):
    """Düz metin: boşluklar sadeleşir, kontrol karakteri atılır."""
    return re.sub(r"\s+", " ", re.sub(r"[\x00-\x1f\x7f]", " ", str(v or ""))).strip()


def h1_html(satirlar):
    def vurgu(t):  # *kelime* → <em>kelime</em> (yalnızca bu); gerisi kaçışlanır
        p = t.split("*")
        return "".join(html.escape(x, quote=False) if i % 2 == 0 else "<em>" + html.escape(x, quote=False) + "</em>" for i, x in enumerate(p))
    return " ".join('<span class="satir">' + vurgu(x) + "</span>" for x in satirlar)


def h1_metin(ic):
    satir = re.findall(r'<span class="satir">(.*?)</span>(?=\s*(?:<span class="satir">|$))', ic.strip(), re.S)
    return [html.unescape(re.sub(r"</?em>", "*", x)) for x in satir]


def oku(s):
    """Sayfadaki bugünkü düzenlenebilir metin."""
    h, a, q = _bir(H1, s, "ana başlık"), _bir(ALT, s, "alt metin"), _bir(SSS, s, "sık sorulanlar")
    sss = [{"s": html.unescape(x), "c": html.unescape(y)} for x, y in re.findall(r"<details><summary>(.*?)</summary><p>(.*?)</p></details>", q.group(2), re.S)]
    return {"baslik": h1_metin(h.group(2)), "alt": html.unescape(a.group(2)), "sss": sss}


def dogrula(d, dil):
    """Hata listesi (boşsa geçerli). d: {baslik:[2 satır], alt, sss:[{s,c}]}"""
    h = []
    if not isinstance(d, dict):
        return [f"{dil}: içerik yok"]
    b = d.get("baslik")
    if not isinstance(b, list) or len(b) != 2 or not all(metin(x) for x in b):
        h.append(f"{dil}: ana başlık iki satır olmalı")
    else:
        for x in b:
            if len(metin(x).replace("*", "")) > SINIR["satir"]:
                h.append(f"{dil}: başlık satırı en fazla {SINIR['satir']} karakter")
            if metin(x).count("*") % 2:
                h.append(f"{dil}: vurgu için kelimeyi iki yıldız arasına yazın (*kelime*)")
    if not metin(d.get("alt")) or len(metin(d.get("alt"))) > SINIR["alt"]:
        h.append(f"{dil}: alt metin 1–{SINIR['alt']} karakter olmalı")
    s = d.get("sss")
    if not isinstance(s, list) or not SINIR["sss_en_az"] <= len(s) <= SINIR["sss_en_cok"]:
        h.append(f"{dil}: {SINIR['sss_en_az']}–{SINIR['sss_en_cok']} soru olmalı")
    else:
        for i, x in enumerate(s, 1):
            if not isinstance(x, dict) or not metin(x.get("s")) or not metin(x.get("c")):
                h.append(f"{dil}: {i}. sorunun sorusu ve cevabı dolu olmalı")
            elif len(metin(x["s"])) > SINIR["soru"] or len(metin(x["c"])) > SINIR["cevap"]:
                h.append(f"{dil}: {i}. soru en fazla {SINIR['soru']}, cevap en fazla {SINIR['cevap']} karakter")
    if not h:
        tum = " ".join([*b, d["alt"], *[x["s"] + " " + x["c"] for x in s]])
        for desen, neden in YASAK:
            if desen.search(tum):
                h.append(f"{dil}: {neden}")
        if re.search(r"[<>]", tum):
            h.append(f"{dil}: < ve > işaretleri kullanılmaz (düz metin)")
        for m in TUTAR.finditer(tum):
            if re.sub(r"[.,]", "", m.group(1) or m.group(2) or m.group(3)) not in PAKET_TUTAR:
                h.append(f"{dil}: fiyat ya da tutar yalnızca web paketleri için yazılır (6.000 / 15.000 TL): {m.group(0)}")
                break
    return h


def temizle(d):
    return {"baslik": [metin(x) for x in d["baslik"]], "alt": metin(d["alt"]), "sss": [{"s": metin(x["s"]), "c": metin(x["c"])} for x in d["sss"]]}


def uygula(s, d):
    """Sayfaya içerik yaz (d doğrulanmış olmalı). Yapılandırılmış verideki FAQPage de güncellenir."""
    d = temizle(d)
    s = H1.sub(lambda m: m.group(1) + h1_html(d["baslik"]) + m.group(3), s, count=1)
    s = ALT.sub(lambda m: m.group(1) + html.escape(d["alt"], quote=False) + m.group(3), s, count=1)
    sss = "\n".join(f"    <details><summary>{html.escape(x['s'], quote=False)}</summary><p>{html.escape(x['c'], quote=False)}</p></details>" for x in d["sss"])
    s = SSS.sub(lambda m: m.group(1) + sss + m.group(3), s, count=1)

    def ld(m):
        try:
            o = json.loads(m.group(1))
        except ValueError:
            return m.group(0)
        if not isinstance(o, dict) or o.get("@type") != "FAQPage":
            return m.group(0)
        o["mainEntity"] = [{"@type": "Question", "name": x["s"], "acceptedAnswer": {"@type": "Answer", "text": x["c"]}} for x in d["sss"]]
        return '<script type="application/ld+json">' + json.dumps(o, ensure_ascii=False).replace("</", "<\\/") + "</script>"
    s2 = LD.sub(ld, s)
    if s2.count('"FAQPage"') != 1:
        raise SystemExit("uygula.py: yapılandırılmış veride tek FAQPage bulunamadı")
    return s2


def _yol(*p):
    return os.path.join(KOK, *p)


def main(argv):
    if argv[1:] == ["--cikar"]:
        v = {"surum": "", "tr": oku(open(_yol(SAYFA["tr"]), encoding="utf-8").read()), "en": oku(open(_yol(SAYFA["en"]), encoding="utf-8").read())}
        os.makedirs(_yol("veri"), exist_ok=True)
        open(_yol(VERI), "w", encoding="utf-8").write(json.dumps(v, ensure_ascii=False, indent=1) + "\n")
        print("veri/icerik.json yazıldı")
        return 0
    if len(argv) != 2:
        print(__doc__)
        return 2
    try:
        g = json.load(open(argv[1], encoding="utf-8"))
    except (OSError, ValueError) as e:
        print("uygula.py: içerik okunamadı:", e)
        return 1
    if not isinstance(g, dict) or not g.get("surum") or not isinstance(g.get("surum"), str) or not re.fullmatch(r"[0-9TZ:.\-]{10,40}", g["surum"]):
        print("uygula.py: kayıtlı içerik yok ya da sürümü geçersiz; dokunulmadı")
        return 0 if isinstance(g, dict) and not g.get("surum") else 1
    hatalar = dogrula(g.get("tr"), "tr") + dogrula(g.get("en"), "en")
    if hatalar:
        print("uygula.py: içerik geçersiz, hiçbir dosya değişmedi:\n  " + "\n  ".join(hatalar))
        return 1
    try:
        once = json.load(open(_yol(VERI), encoding="utf-8"))
    except (OSError, ValueError):
        once = {}
    yeni = {"surum": g["surum"], "tr": temizle(g["tr"]), "en": temizle(g["en"])}
    if once == yeni:
        print("uygula.py: yayında olan sürümle aynı; dokunulmadı")
        return 0
    yaz = {}
    for dil, yol in SAYFA.items():
        yaz[yol] = uygula(open(_yol(yol), encoding="utf-8").read(), yeni[dil])
    for yol, s in yaz.items():  # hepsi hazırlandıktan sonra yazılır (yarım yazım yok)
        open(_yol(yol), "w", encoding="utf-8").write(s)
    open(_yol(VERI), "w", encoding="utf-8").write(json.dumps(yeni, ensure_ascii=False, indent=1) + "\n")
    print("uygula.py: sürüm", g["surum"], "uygulandı")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
