/* Ana sayfa tema vitrini, anında (Yasin, 25 Kasım 2026: "temalar panelde yayınlandığı an sitede de yayınlansın").
   Sayfadaki kartlar .github/workflows/vitrin.yml'nin en son yazdığı hâldir (arama motoru ve JS'siz ziyaretçi bunu görür).
   Sayfa açılınca app.enpovi.com herkese açık /api/enpovi/vitrin/yayin okunur; sürüm sayfadakinden farklıysa (yeni yayınlanan,
   kaldırılan, panelden sabitlenen ya da gizlenen tema) kartlar ve sayılar hemen yenilenir. Ekran görüntüsü henüz çekilmemiş yeni tema
   canlı sitesinin küçültülmüş görünümüyle gösterilir (iş bir sonraki turda görüntüyü ekler). Okunamaz ya da geçersizse sayfadaki kalır.
   Uzak veri yalnızca textContent / özellik olarak yazılır (HTML yorumlanmaz); adres biçimi sıkı denetlenir. */
(function () {
  var v = document.getElementById("vit");
  if (!v || !window.fetch || !window.JSON) return;
  var en = document.documentElement.lang === "en", APP = "https://app.enpovi.com";
  var KIM = /^[a-z0-9-]{1,40}$/, YAZI = /^[^<>"\u0000-\u001f\u007f]{1,60}$/;
  function sayi(x) { return typeof x === "number" && x % 1 === 0 && x >= 1 && x <= 100000 }
  function gecerli(d) {
    if (!d || typeof d.surum !== "string" || !/^[0-9a-f]{8}$/.test(d.surum) || !d.sayi || !sayi(d.sayi.tema) || !sayi(d.sayi.palet)) return false;
    if (!Array.isArray(d.temalar) || d.temalar.length < 1 || d.temalar.length > 12) return false;
    var gor = {};
    return d.temalar.every(function (k) {
      var ok = k && KIM.test(k.dal) && KIM.test(k.tema) && sayi(k.no) && k.yol === "/tema/" + k.dal + "/" + k.no + "/" &&
        YAZI.test(k.ad) && YAZI.test(k.dalAd) && YAZI.test(k.sektorEn) && !gor[k.tema];
      gor[k.tema] = 1; return ok;
    });
  }
  function canli(tel, k) {
    /* ekran görüntüsü yok: temanın canlı sitesi 360 px genişlikte açılır, karta sığacak kadar küçültülür; dokunulamaz (kart bağlantısı açar) */
    var c = document.createElement("span"), f = document.createElement("iframe");
    c.className = "vk-canli";
    f.src = APP + k.yol + "?kart=1"; f.width = "360"; f.height = "752"; f.loading = "lazy"; f.tabIndex = -1; f.title = "";
    f.setAttribute("aria-hidden", "true"); f.setAttribute("scrolling", "no"); f.setAttribute("sandbox", "allow-scripts allow-same-origin");
    c.appendChild(f); tel.textContent = ""; tel.appendChild(c); olcek(c);
  }
  function olcek(c) { var f = c.firstChild; if (f) f.style.transform = "scale(" + (c.clientWidth / 360 || 0.6) + ")" }
  function kart(k) {
    var a = document.createElement("a"), tel = document.createElement("span"), im = new Image(), b = document.createElement("b"), s = document.createElement("span");
    a.className = "vk"; a.href = APP + k.yol; a.target = "_blank"; a.rel = "noopener";
    tel.className = "vk-tel";
    im.loading = "lazy"; im.decoding = "async"; im.width = 360; im.height = 752;
    im.alt = en ? k.ad + ": " + k.sektorEn + " website design, on a phone" : k.dalAd + " için " + k.ad + " tasarımı, telefonda";
    im.onerror = function () { canli(tel, k) };
    im.src = (en ? "/" : "") + "marka/web/v/" + k.dal + "-" + k.no + ".webp";
    tel.appendChild(im); b.textContent = k.ad; s.textContent = en ? k.sektorEn : k.dalAd;
    a.appendChild(tel); a.appendChild(b); a.appendChild(s); return a;
  }
  function yaz(d) {
    var parca = document.createDocumentFragment();
    d.temalar.forEach(function (k) { parca.appendChild(kart(k)) });
    [].slice.call(v.querySelectorAll(".vk")).forEach(function (x) { x.remove() });
    v.appendChild(parca); v.setAttribute("data-surum", d.surum); v.scrollLeft = 0;
    var m = document.querySelector("[data-vitrin=metin]"), r = document.querySelector("[data-vitrin=rozet]"), t = d.sayi.tema, p = d.sayi.palet;
    if (m) m.textContent = en ? t + " page designs and " + p + " colour palettes, all made to read comfortably on a phone. Tap to open a live example."
      : t + " sayfa tasarımı ve " + p + " renk paleti. Hepsi telefonda rahat okunacak şekilde hazırlandı. Dokunun, canlı örneği açın.";
    if (r) { var sm = document.createElement("small"); sm.textContent = en ? p + " colour palettes, you choose" : p + " renk, siz seçin";
      r.textContent = en ? t + " designs" : t + " tasarım"; r.appendChild(sm) }
  }
  /* iş çipleri (G01, Yasin 26 Kasım 2026): platformda tasarımı kalmayan iş dalının "7 gün dene" bağlantısı gizlenir
     (tıklayan boş adıma düşmesin; "Diğer işler" ve "biz hazırlayalım" kalır). Liste yoksa ya da bozuksa hiçbir şeye dokunulmaz. */
  function dallar(d) {
    var l = d && d.dallar;
    if (!Array.isArray(l) || l.length < 1 || l.length > 500 || !l.every(function (x) { return typeof x === "string" && KIM.test(x) })) return;
    [].slice.call(document.querySelectorAll("a[data-dene]")).forEach(function (a) {
      var m = /[?&]dal=([a-z0-9-]+)/.exec(a.getAttribute("href") || "");
      if (m && l.indexOf(m[1]) < 0) a.style.display = "none";
    });
  }
  window.addEventListener("resize", function () { [].slice.call(v.querySelectorAll(".vk-canli")).forEach(olcek) });
  fetch(APP + "/api/enpovi/vitrin/yayin", { cache: "no-store", credentials: "omit" })
    .then(function (r) { return r.ok ? r.json() : null })
    .then(function (d) { dallar(d); if (gecerli(d) && d.surum !== v.getAttribute("data-surum")) yaz(d) })
    .catch(function () {});
})();
