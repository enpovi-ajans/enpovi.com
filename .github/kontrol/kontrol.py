#!/usr/bin/env python3
"""enpovi.com otomatik kontrolü (GitHub Actions → Kontrol, her PR'da ve main'de).

  python3 .github/kontrol/kontrol.py

Bakılanlar: site içi bağlantı ve görseller var mı, sitemap'teki her adres bir sayfaya karşılık geliyor mu,
her sayfada başlık/açıklama/kanonik var mı, JSON-LD bozuk mu, müşteri paneli/medyası repoya konmuş mu
(paneller yalnızca app.enpovi.com'da). Hata varsa çıkış 1.
"""
import html.parser, json, os, re, sys, urllib.parse

KOK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ALAN = "https://enpovi.com"
hatalar, uyarilar = [], []


class Sayfa(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.baglar, self.title, self.desc, self.canon, self.jsonld, self._ld, self.idler = [], "", None, None, [], None, set()
        self._t = False

    def handle_starttag(self, tag, a):
        a = dict(a)
        if a.get("id"):
            self.idler.add(a["id"])
        for k in ("href", "src"):
            if a.get(k) and not (tag == "link" and a.get("rel") in ("preconnect", "dns-prefetch")):
                self.baglar.append((tag, a[k]))
        if a.get("srcset"):
            self.baglar += [(tag, p.strip().split(" ")[0]) for p in a["srcset"].split(",") if p.strip()]
        if tag == "title":
            self._t = True
        if tag == "meta" and a.get("name") == "description":
            self.desc = a.get("content", "")
        if tag == "link" and a.get("rel") == "canonical":
            self.canon = a.get("href")
        if tag == "script" and a.get("type") == "application/ld+json":
            self._ld = ""

    def handle_endtag(self, tag):
        if tag == "title":
            self._t = False
        if tag == "script" and self._ld is not None:
            self.jsonld.append(self._ld); self._ld = None

    def handle_data(self, d):
        if self._t:
            self.title += d
        if self._ld is not None:
            self._ld += d


def dosya_var(yol):
    """/blog/x/ → blog/x/index.html; /a.jpg → a.jpg"""
    yol = urllib.parse.unquote(yol.split("#")[0].split("?")[0])
    p = os.path.join(KOK, yol.lstrip("/"))
    return os.path.isfile(p) or os.path.isfile(os.path.join(p, "index.html")) or os.path.isfile(p + ".html")


def html_dosyalari():
    for d, alt, dosyalar in os.walk(KOK):
        alt[:] = [x for x in alt if not x.startswith(".") and x != "node_modules"]
        for f in dosyalar:
            if f.endswith(".html"):
                yield os.path.join(d, f)


sayfalar = {}
for f in html_dosyalari():
    r = os.path.relpath(f, KOK)
    s = Sayfa()
    s.feed(open(f, encoding="utf-8").read())
    sayfalar[r] = s
    sablon = r.startswith(("ortak/", "marka/")) or r == "404.html"
    for tag, u in s.baglar:
        if u.startswith(("mailto:", "tel:", "data:", "javascript:", "#", "sms:", "whatsapp:")) or "{" in u or "${" in u:
            continue
        p = urllib.parse.urlparse(u)
        if p.scheme in ("http", "https") and p.netloc not in ("enpovi.com", "www.enpovi.com"):
            continue
        hedef = p.path if p.scheme else urllib.parse.urljoin("/" + r.replace(os.sep, "/"), p.path) if p.path else None
        if hedef and not dosya_var(hedef):
            hatalar.append("%s: kırık bağlantı %s" % (r, u))
    if not sablon and r.endswith("index.html"):
        if not s.title.strip():
            hatalar.append("%s: <title> yok" % r)
        if not s.desc:
            uyarilar.append("%s: meta description yok" % r)
        if not s.canon:
            uyarilar.append("%s: kanonik bağlantı yok" % r)
    for ld in s.jsonld:
        try:
            json.loads(ld)
        except ValueError as e:
            hatalar.append("%s: JSON-LD bozuk (%s)" % (r, e))

# sitemap: her adres bir sayfa
sm = open(os.path.join(KOK, "sitemap.xml"), encoding="utf-8").read()
locs = re.findall(r"<loc>([^<]+)</loc>", sm)
if not locs:
    hatalar.append("sitemap.xml boş")
for u in locs:
    p = urllib.parse.urlparse(u)
    if p.netloc != "enpovi.com" or p.scheme != "https":
        hatalar.append("sitemap: alan dışı adres %s" % u)
    elif not dosya_var(p.path):
        hatalar.append("sitemap: sayfa yok %s" % u)
if len(set(locs)) != len(locs):
    hatalar.append("sitemap: tekrar eden adres")

# robots.txt sitemap'i göstermeli
rb = open(os.path.join(KOK, "robots.txt"), encoding="utf-8").read()
if ALAN + "/sitemap.xml" not in rb:
    hatalar.append("robots.txt: Sitemap satırı yok")
# sitemap'teki her sayfa robots.txt'de izinli olmalı (Disallow: / + Allow listesi)
izin = [l.split(":", 1)[1].strip() for l in rb.splitlines() if l.lower().startswith("allow:")]
for u in locs:
    yol = urllib.parse.urlparse(u).path
    if not any((yol == x[:-1]) if x.endswith("$") else yol.startswith(x) for x in izin):
        hatalar.append("robots.txt: sitemap'teki %s engelli (Allow satırı ekleyin)" % yol)

# müşteri paneli / medya repoya konmaz (CLAUDE.md: paneller yalnızca app.enpovi.com)
for d, alt, dosyalar in os.walk(KOK):
    alt[:] = [x for x in alt if not x.startswith(".")]
    for f in dosyalar:
        r = os.path.relpath(os.path.join(d, f), KOK)
        if f in ("data.js", "plan.json") or f.endswith((".mp4", ".mov")):
            hatalar.append("%s: müşteri paneli/medyası bu repoya konmaz" % r)
        elif os.path.getsize(os.path.join(d, f)) > 3 * 1024 * 1024:
            hatalar.append("%s: 3 MB'tan büyük dosya (görseli küçültün)" % r)

for u in uyarilar:
    print("uyarı:", u)
for h in hatalar:
    print("HATA:", h)
print("%d sayfa, %d sitemap adresi, %d hata, %d uyarı" % (len(sayfalar), len(locs), len(hatalar), len(uyarilar)))
sys.exit(1 if hatalar else 0)
