"""uygula.py testleri: python3 -m unittest discover -s .github/icerik (CI: kontrol.yml)."""
import copy
import json
import os
import re
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(__file__))
import uygula as U  # noqa: E402

KOK = U.KOK


def sayfa(dil):
    return open(os.path.join(KOK, U.SAYFA[dil]), encoding="utf-8").read()


class Uygula(unittest.TestCase):
    def setUp(self):
        self.v = json.load(open(os.path.join(KOK, U.VERI), encoding="utf-8"))

    def test_yayindaki_veri_sayfayla_ayni(self):
        for dil in ("tr", "en"):
            self.assertEqual(U.oku(sayfa(dil)), self.v[dil], dil + ": veri/icerik.json sayfadaki metinle aynı olmalı")
            self.assertEqual(U.uygula(sayfa(dil), self.v[dil]), sayfa(dil), dil + ": aynı içerik sayfayı değiştirmez")
            self.assertEqual(U.dogrula(self.v[dil], dil), [])

    def test_kacis_ve_vurgu(self):
        x = copy.deepcopy(self.v["tr"])
        x["baslik"] = ["Yeni & farklı", "*hemen* başlayın"]
        x["alt"] = 'Düz "metin" & daha fazlası'
        x["sss"][0] = {"s": "Soru & cevap?", "c": "Cevap 'tek' tırnaklı."}
        s = U.uygula(sayfa("tr"), x)
        self.assertIn('<h1 class="gir d1"><span class="satir">Yeni &amp; farklı</span> <span class="satir"><em>hemen</em> başlayın</span></h1>', s)
        self.assertIn('<p class="alt gir d2">Düz "metin" &amp; daha fazlası</p>', s)
        self.assertEqual(U.oku(s), U.temizle(x), "yazılan geri okunur")
        faq = [json.loads(m) for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S) if '"FAQPage"' in m][0]
        self.assertEqual(faq["mainEntity"][0]["name"], "Soru & cevap?")
        self.assertEqual(len(faq["mainEntity"]), len(x["sss"]), "yapılandırılmış veri görünen sorularla aynı")

    def test_dogrulama(self):
        def h(**k):
            x = copy.deepcopy(self.v["tr"]); x.update(k); return U.dogrula(x, "tr")
        self.assertTrue(h(baslik=["tek satır"]))
        self.assertTrue(h(baslik=["a" * 41, "b"]))
        self.assertTrue(h(baslik=["*yarım", "b"]))
        self.assertTrue(h(alt=""))
        self.assertTrue(h(sss=self.v["tr"]["sss"][:2]))
        self.assertTrue(h(sss=self.v["tr"]["sss"] * 2))
        self.assertTrue(h(alt="Türkiye'nin en iyi ajansı"))
        self.assertTrue(h(alt="Sadece 999 TL"))
        self.assertTrue(h(alt="₺500 indirim"))
        self.assertTrue(h(alt="<script>alert(1)</script>"))
        self.assertFalse(h(alt="Yıllık 6.000 TL, 2026 yılında"))
        self.assertTrue(U.dogrula(None, "tr"))

    def test_ortak_ornekler(self):
        """Platformdaki doğrulayıcıyla aynı örnekler (platform test/sabit/enpovi-icerik-ornekler.json aynı dosya)."""
        for o in json.load(open(os.path.join(os.path.dirname(__file__), "ornekler.json"), encoding="utf-8")):
            x = copy.deepcopy(self.v["tr"]); x["alt"] = o["alt"]
            self.assertEqual(U.dogrula(x, "tr") == [], o["gecer"], repr(o["alt"]) + " " + str(U.dogrula(x, "tr")))

    def test_main_gecersizde_dokunmaz_gecerlide_ikisini_yazar(self):
        d = tempfile.mkdtemp()
        try:
            for y in (U.SAYFA["tr"], U.SAYFA["en"], U.VERI):
                os.makedirs(os.path.dirname(os.path.join(d, y)) or d, exist_ok=True)
                shutil.copy(os.path.join(KOK, y), os.path.join(d, y))
            eski = U.KOK
            U.KOK = d
            try:
                g = os.path.join(d, "g.json")
                kotu = {"surum": "2026-11-25T12:00:00.000Z", "tr": {**self.v["tr"], "alt": "en ucuz"}, "en": self.v["en"]}
                json.dump(kotu, open(g, "w"))
                self.assertEqual(U.main(["x", g]), 1)
                self.assertEqual(open(os.path.join(d, U.SAYFA["tr"]), encoding="utf-8").read(), sayfa("tr"))
                iyi = {"surum": "2026-11-25T12:00:00.000Z", "tr": {**self.v["tr"], "alt": "Yeni alt metin."}, "en": {**self.v["en"], "alt": "New subtitle."}}
                json.dump(iyi, open(g, "w"))
                self.assertEqual(U.main(["x", g]), 0)
                self.assertIn("Yeni alt metin.", open(os.path.join(d, U.SAYFA["tr"]), encoding="utf-8").read())
                self.assertIn("New subtitle.", open(os.path.join(d, U.SAYFA["en"]), encoding="utf-8").read())
                self.assertEqual(json.load(open(os.path.join(d, U.VERI)))["surum"], iyi["surum"])
                json.dump({}, open(g, "w"))
                self.assertEqual(U.main(["x", g]), 0, "kayıt yoksa sessizce geçer")
            finally:
                U.KOK = eski
        finally:
            shutil.rmtree(d)


if __name__ == "__main__":
    unittest.main()
