"""vitrin/uygula.py testleri: python3 -m unittest discover -s .github/vitrin (CI: kontrol.yml)."""
import copy
import json
import os
import re
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))
import uygula as U  # noqa: E402

KOK = U.KOK


def sayfa(dil):
    return open(os.path.join(KOK, U.SAYFA[dil]), encoding="utf-8").read()


class Vitrin(unittest.TestCase):
    def setUp(self):
        self.v = json.load(open(os.path.join(KOK, U.VERI), encoding="utf-8"))

    def test_yayindaki_veri_gecerli_ve_sayfayla_ayni(self):
        self.assertEqual(U.dogrula(self.v), [])
        self.assertEqual(U.eksik(self.v), [], "her kartın ekran görüntüsü olmalı")
        for dil in ("tr", "en"):
            self.assertEqual(U.uygula(sayfa(dil), self.v, dil), sayfa(dil), dil + ": aynı vitrin sayfayı değiştirmez")

    def test_kullanilmayan_gorsel_yok(self):
        kullanilan = {os.path.basename(U.gorsel(k)) for k in self.v["temalar"]}
        self.assertEqual(set(os.listdir(os.path.join(KOK, U.GORSEL))), kullanilan)

    def test_sitedeki_fiyat(self):
        """Sayfadaki paket fiyatı SITE_FIYAT ile aynı; yayındaki vitrinde platform fiyatı da aynı."""
        self.assertEqual(U.fiyat_farki(self.v), {})
        tr, en = sayfa("tr"), sayfa("en")
        for f in U.SITE_FIYAT.values():
            yazi = "{:,}".format(f).replace(",", ".")
            self.assertIn(yazi + " TL", tr)
        self.assertTrue(re.search(r"6[.,]000", en) and re.search(r"15[.,]000", en))
        v = copy.deepcopy(self.v)
        v["fiyat"]["profesyonel"] = 16000
        self.assertEqual(U.fiyat_farki(v), {"profesyonel": (15000, 16000)})

    def test_kart_ve_sayi_yazimi(self):
        v = copy.deepcopy(self.v)
        v["temalar"] = [dict(v["temalar"][0], ad="A & B", sektorEn="Kids' salon")]
        v["sayi"] = {"tema": 7, "dal": 9, "palet": 5}
        tr, en = U.uygula(sayfa("tr"), v, "tr"), U.uygula(sayfa("en"), v, "en")
        self.assertEqual(tr.count('class="vk"'), 1)
        self.assertIn("<b>A &amp; B</b>", tr)
        self.assertIn("Kids&#x27; salon", en)
        self.assertIn('src="/marka/web/v/', en)
        self.assertIn('src="marka/web/v/', tr)
        self.assertIn("7 sayfa tasarımı ve 5 renk paleti", tr)
        self.assertIn("7 tasarım<small>5 renk", tr)
        self.assertIn("7 page designs and 5 colour palettes", en)
        self.assertIn("7 designs<small>5 colour palettes", en)
        self.assertNotIn("Kids", tr)
        self.assertIn('id="vit" data-surum="%s"' % v["surum"], tr)
        v["surum"] = "0123abcd"
        self.assertIn('data-surum="0123abcd"', U.uygula(sayfa("en"), v, "en"))

    def test_dogrulama(self):
        def bozuk(f):
            v = copy.deepcopy(self.v)
            f(v)
            return U.dogrula(v)
        self.assertTrue(bozuk(lambda v: v.update(surum="x")))
        self.assertTrue(bozuk(lambda v: v.update(temalar=[])))
        self.assertTrue(bozuk(lambda v: v.update(temalar=v["temalar"] * 2)), "en çok 12 / aynı tasarım iki kez")
        self.assertTrue(bozuk(lambda v: v["temalar"][0].update(ad="<script>")))
        self.assertTrue(bozuk(lambda v: v["temalar"][0].update(yol="https://kotu.example/")))
        self.assertTrue(bozuk(lambda v: v["temalar"][0].update(dal="../x")))
        self.assertTrue(bozuk(lambda v: v["temalar"][0].update(no=True)))
        self.assertTrue(bozuk(lambda v: v["temalar"][0].update(paket="kurumsal")))
        self.assertTrue(bozuk(lambda v: v["temalar"][0].update(paketler=["kurumsal"])))
        self.assertTrue(bozuk(lambda v: v["temalar"][0].update(paketler=[])))
        self.assertTrue(bozuk(lambda v: v["temalar"][0].update(paketler="baslangic")))
        self.assertTrue(bozuk(lambda v: v["temalar"][0].update(paketler=["baslangic", "baslangic"])))
        # ortak tema (26 Kasım 2026): yeni biçim paketler[]; eski tek paket alanı da geçerli
        def yeni(v):
            for k in v["temalar"]:
                k["paketler"] = ["baslangic", "profesyonel"]; k.pop("paket", None)
        self.assertFalse(bozuk(yeni))
        # yayındaki biçim (paketler var, paket yok) üstüne bozuk eski alan: yine hata (26 Kasım 2026 vitrin işi kırmızısı)
        def yeni_bozuk(v):
            yeni(v); v["temalar"][0]["paket"] = "kurumsal"
        self.assertTrue(bozuk(yeni_bozuk))
        # iş dalları (G01): isteğe bağlı, varsa sıkı
        self.assertFalse(bozuk(lambda v: v.pop("dallar", None)))
        self.assertTrue(bozuk(lambda v: v.update(dallar=[])))
        self.assertTrue(bozuk(lambda v: v.update(dallar=["../x"])))
        self.assertTrue(bozuk(lambda v: v.update(dallar=["cicekci", "cicekci"])))
        self.assertTrue(bozuk(lambda v: v.update(dallar="cicekci")))
        self.assertTrue(bozuk(lambda v: v["sayi"].update(tema="41")))
        self.assertTrue(bozuk(lambda v: v["fiyat"].pop("baslangic")))
        self.assertEqual(U.dogrula([]), ["vitrin bir nesne değil"])

    def test_is_dali_baglantilari(self):
        # G01: sayfadaki her "7 gün dene" iş dalı yayındaki listede; bilinmeyen dal, liste yok ya da bozuk liste hata
        for dil in ("tr", "en"):
            self.assertEqual(U.dal_hatalari(sayfa(dil), self.v.get("dallar")), [], dil)
            self.assertTrue(U.DAL_BAG.findall(sayfa(dil)), dil + ": sayfada iş çipi var")
        b = '<a href="https://app.enpovi.com/basla/?dal=restoran">'
        self.assertTrue(U.dal_hatalari(b, self.v["dallar"]))
        self.assertTrue(U.dal_hatalari('<a href="https://app.enpovi.com/basla/?paket=baslangic&amp;dal=restoran">', self.v["dallar"]))
        self.assertTrue(U.dal_hatalari('<a href="https://app.enpovi.com/basla/?paket=x&dal=restoran">', self.v["dallar"]))
        self.assertEqual(U.dal_hatalari('<a href="https://app.enpovi.com/basla/?dal=cicekci">', ["cicekci"]), [])
        for bozuk in (None, [], "cicekci,restoran", ["../x"]):
            self.assertTrue(U.dal_hatalari(b, bozuk), repr(bozuk))

    def test_dallar_kaybolursa_dokunulmaz(self):
        import tempfile
        v = copy.deepcopy(self.v); v.pop("dallar", None)
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            json.dump(v, f)
        try:
            self.assertEqual(U.main(["uygula.py", f.name]), 1)
        finally:
            os.unlink(f.name)

    def test_isaret_yoksa_durur(self):
        with self.assertRaises(SystemExit):
            U.uygula(sayfa("tr").replace("<!-- vitrin:kartlar -->", ""), self.v, "tr")


if __name__ == "__main__":
    unittest.main()
