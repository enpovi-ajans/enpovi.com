/* Enpovi · ölçüm ve çerez notu. Sadece tanıtım sayfaları yükler (ana sayfa, blog, hizmetler, yasal sayfalar, 404); paneller, giriş ve yönetim yüklemez.
   1) Enpovi sayacı (çerezsiz, kimliksiz): ziyaret, WhatsApp, arama, Instagram, form, deneme ve tema kartı tıklaması app.enpovi.com'a yalnızca
      "olay + kaynak + sayfa + düğmenin yeri" olarak gider (IP, kimlik, tarayıcı izi tutulmaz). Her olay türü oturum başına bir kez sayılır (aynı
      ziyaretçinin ikinci WhatsApp tıklaması yeni temas değildir; GA4'e her tıklama gider). Kaynak (utm_*, saha kodu, reklam tıklama kimliğinin
      varlığı, gelinen site) bu sekmenin oturumunda tutulur; ziyaretçi çerez notunda "Tamam" dediyse 30 gün hatırlanır (ertesi gün dönen ziyaretçi
      doğru kampanyaya yazılsın; "Hayır" silinir).
   3) Deneme dönüşümü (Google Ads, Meta): düğme tıklamasında değil, deneme kurulumu tamamlanınca app.enpovi.com/basla/ bu sitenin /donusum/
      sayfasını gizli çerçevede açar; orada izin varsa bir kez (istek kimliğiyle) gönderilir.
   2) Etiketler Yönetim → enpovi.com → Etiketler'den gelir (GET /api/enpovi/etiket, yalnızca kimlik).
      Google Analytics: izin verilene kadar çerezsiz (Consent Mode, analytics_storage denied).
      Google Tag Manager, Google Ads ve Meta Pixel: yalnızca çerez notunda "Tamam" denince yüklenir; "Hayır" ya da cevapsızsa hiç yüklenmez.
   Tercih (localStorage enpovi_cerez): "tam" = analiz + reklam ölçümü (reklam etiketi varken "Tamam"), "evet" = yalnızca analiz (reklam etiketi yokken "Tamam";
   sonradan etiket eklenirse not yeniden sorulur), "hayir" = hiçbiri. */
(function () {
  var ANAHTAR = "enpovi_cerez", API = "https://app.enpovi.com/api/enpovi/", VARSAYILAN = { ga4: "G-Z7QNDGMGFT" };
  if (location.hostname !== "enpovi.com" && location.hostname !== "www.enpovi.com") return;
  function oku(d, k) { try { return d.getItem(k) } catch (x) { return null } }
  function yaz(d, k, v) { try { d.setItem(k, v) } catch (x) {} }
  var secim = oku(localStorage, ANAHTAR), et = null, reklamYuklu = false;

  /* ---------- kaynak (ilk temas, bu oturum) ---------- */
  function parca(v) { return String(v || "").replace(/[İIı]/g, "i").toLowerCase().replace(/[çğöşü]/g, function (c) { return { "ç": "c", "ğ": "g", "ö": "o", "ş": "s", "ü": "u" }[c] }).trim().replace(/\s+/g, "-").replace(/[^a-z0-9._-]/g, "").slice(0, 40) }
  function kaynakBul() {
    var q = new URLSearchParams(location.search), k = { k: parca(q.get("utm_source")), o: parca(q.get("utm_medium")), c: parca(q.get("utm_campaign")), z: parca(q.get("saha")) };
    if (k.k || k.z) return k;
    // reklam tıklama kimliği: değeri saklanmaz, yalnızca hangi reklam ağından gelindiği (Instagram uygulama içi tarayıcı çoğu zaman yönlendiren göndermez)
    if (q.get("gclid") || q.get("gbraid") || q.get("wbraid")) return { k: "google", o: "cpc", c: k.c, z: "" };
    if (q.get("fbclid")) return { k: "meta", o: k.o || "cpc", c: k.c, z: "" };
    if (k.o || k.c) return k; // yalnızca kampanya/ortam yazılmış bağlantı
    var r = ""; try { r = new URL(document.referrer).hostname.replace(/^(www|m|l|lm)\./, "") } catch (x) {}
    if (!r || /(^|\.)enpovi\.com$/.test(r)) return null;
    if (/(^|\.)google\./.test(r) || r === "bing.com" || r === "yandex.com.tr" || r === "duckduckgo.com") return { k: r.split(".")[0], o: "organik", c: "", z: "" };
    return { k: parca(r.replace(/\.(com|net|org)(\.tr)?$/, "")), o: "referans", c: "", z: "" };
  }
  var KALICI = "enp_kanal_30", GUN30 = 30 * 864e5;
  var kanal = null; try { kanal = JSON.parse(oku(sessionStorage, "enp_kanal") || "null") } catch (x) {}
  if (!kanal && secim === "tam") { // reklam ölçümüne izin verildiyse son 30 gündeki kampanya (yeni oturumda; eski "evet" yalnızca istatistik izni)
    try { var kk = JSON.parse(oku(localStorage, KALICI) || "null"); if (kk && kk.t > Date.now() - GUN30 && kk.kanal) { kanal = kk.kanal; yaz(sessionStorage, "enp_kanal", JSON.stringify(kanal)) } } catch (x) {}
  }
  var yeni = kaynakBul(), isaretli = /[?&](utm_source|utm_medium|utm_campaign|saha|gclid|gbraid|wbraid|fbclid)=/.test(location.search);
  if (yeni && (isaretli || !kanal)) { kanal = yeni; yaz(sessionStorage, "enp_kanal", JSON.stringify(kanal)) } // yeni kampanya tıklaması öncekinin yerine geçer
  kanal = kanal || { k: "", o: "", c: "", z: "" };
  /* 30 gün yalnızca reklam/kampanya bağlantısı için (arama motoru ve başka siteden gelen değil) ve reklam ölçümü izniyle; süre bağlantıya ilk
     gelinen andan sayılır (aynı kampanyayla her ziyarette uzamaz, yeni kampanya bağlantısı öncekinin yerine geçer) */
  function kanalHatirla() {
    if (secim !== "tam" || !(kanal.k || kanal.z || kanal.c) || kanal.o === "organik" || kanal.o === "referans") return;
    var v = JSON.stringify(kanal), es = null; try { es = JSON.parse(oku(localStorage, KALICI) || "null") } catch (x) {}
    if (es && JSON.stringify(es.kanal) === v && es.t > Date.now() - GUN30) return;
    yaz(localStorage, KALICI, JSON.stringify({ kanal: kanal, t: Date.now() }));
  }
  kanalHatirla();
  window.enpoviKanal = function () { return { k: kanal.k, o: kanal.o, c: kanal.c, z: kanal.z } }; // "Sitenizi biz hazırlayalım" formu talebe ekler (Kampanyalar'da talep ve satış)
  var donusum = location.pathname === "/donusum/"; // deneme dönüşümü sayfası (yalnızca app.enpovi.com/basla/ gizli çerçevede açar)

  /* deneme bağlantıları: kaynak app.enpovi.com/basla/'ya taşınır (sayfada yoksa) */
  function denemeBaglantilari() {
    document.querySelectorAll('a[href^="https://app.enpovi.com/basla"]').forEach(function (a) {
      try {
        var u = new URL(a.href);
        [["utm_source", kanal.k], ["utm_medium", kanal.o], ["utm_campaign", kanal.c], ["saha", kanal.z]].forEach(function (x) { if (x[1] && !u.searchParams.has(x[0])) u.searchParams.set(x[0], x[1]) });
        a.href = u.toString();
      } catch (x) {}
    });
  }

  /* ---------- Enpovi sayacı ---------- */
  function say(t, y) { // çerez gönderilmez (credentials: omit); fetch yoksa sendBeacon. Her tür oturumda bir kez (ziyaret dahil).
    if (donusum) return;
    var anahtar = "enp_o_" + t; if (oku(sessionStorage, anahtar)) return; yaz(sessionStorage, anahtar, "1");
    if (t.indexOf("sayfa") === 0) t = "sayfa"; // anahtar sayfa yoluyla: her sayfa oturumda bir kez
    var g = JSON.stringify({ t: t, s: location.pathname, y: y || "", k: kanal.k, o: kanal.o, c: kanal.c, z: kanal.z });
    try { fetch(API + "olay", { method: "POST", body: g, keepalive: true, mode: "cors", credentials: "omit", headers: { "content-type": "text/plain" } }).catch(function () {}) }
    catch (x) { try { navigator.sendBeacon(API + "olay", new Blob([g], { type: "text/plain" })) } catch (y) {} }
  }
  // ziyaret = oturum başına bir kez (kanal tablosu); oturumun sonraki her sayfası "sayfa" olarak bir kez (Sayfalar tablosunda ziyaret)
  if (!oku(sessionStorage, "enp_g")) { yaz(sessionStorage, "enp_g", "1"); yaz(sessionStorage, "enp_o_sayfa" + location.pathname, "1"); say("gor") }
  else say("sayfa" + location.pathname);

  /* ---------- Google ve Meta ---------- */
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments) }
  window.gtag = gtag;
  var tam = secim === "tam";
  gtag("consent", "default", { ad_storage: tam ? "granted" : "denied", ad_user_data: tam ? "granted" : "denied", ad_personalization: "denied",
    analytics_storage: tam || secim === "evet" ? "granted" : "denied" });
  gtag("set", "ads_data_redaction", true);
  gtag("js", new Date());
  var gtagYuklu = false;
  function betik(src) { var s = document.createElement("script"); s.async = true; s.src = src; document.head.appendChild(s) }
  function gtagJs(id) { if (!gtagYuklu) { gtagYuklu = true; betik("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id)) } }
  function reklamVar() { return !!(et && (et.gtm || et.ads || et.meta)) }
  function googleYukle() { // GA4 izin modu ile her zaman (izin yoksa çerezsiz)
    if (!et.ga4) return;
    gtag("config", et.ga4, { allow_google_signals: false, allow_ad_personalization_signals: false, send_page_view: !donusum });
    gtagJs(et.ga4);
  }
  function reklamYukle() { // yalnızca "Tamam" sonrası
    if (reklamYuklu || !et) return; reklamYuklu = true;
    if (et.ads) { gtag("config", et.ads, { allow_ad_personalization_signals: false }); gtagJs(et.ads) }
    if (et.gtm) { dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" }); betik("https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(et.gtm)) }
    if (et.meta) {
      var f = window.fbq = function () { f.callMethod ? f.callMethod.apply(f, arguments) : f.queue.push(arguments) };
      if (!window._fbq) window._fbq = f; f.push = f; f.loaded = true; f.version = "2.0"; f.queue = [];
      betik("https://connect.facebook.net/en_US/fbevents.js");
      window.fbq("set", "autoConfig", false, et.meta); // otomatik olay ve düğme/sayfa bilgisi toplama kapalı: yalnızca PageView, Lead, Contact, StartTrial
      window.fbq("init", et.meta); if (!donusum) window.fbq("track", "PageView");
    }
  }
  var GA = { wa: "whatsapp_tikla", tel: "telefon_tikla", ig: "instagram_tikla", dene: "deneme_tikla", form: "generate_lead", teklif: "teklif_gonder", paylas: "whatsapp_paylas", tema: "tema_karti_tikla" };
  /* düğmenin yeri: data-yer, yoksa içinde bulunduğu bölümün kimliği (kapakTel → kapak-tel), yoksa üst/alt/menü; panelde "Düğmeler" tablosu */
  function yer(el) {
    if (window.enpoviYer) { var o = window.enpoviYer; window.enpoviYer = ""; return o }
    var d = el && el.closest && el.closest("[data-yer]"); if (d) return kod(d.getAttribute("data-yer"));
    var u = el && el.parentElement, b = u && u.closest && u.closest("[id],section,header,footer,nav,main,article"); // düğmenin kendi kimliği değil, içinde bulunduğu bölüm
    return b ? kod(b.id || b.tagName) : "sayfa";
  }
  function kod(v) { return String(v || "").replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24) || "sayfa" }
  /* olay: Enpovi sayacı + GA4 (+ izin varsa Ads dönüşümü ve Meta). teklif (sihirbazdan WhatsApp) sayaçta WhatsApp sayılır; paylas iletişim değildir.
     Deneme tıklaması dönüşüm değildir (deneme /donusum/'de, kurulum tamamlanınca sayılır). */
  function olay(t, el, ek) {
    var y = yer(el);
    if (t !== "paylas") say(t === "teklif" ? "wa" : t, y);
    gtag("event", GA[t], Object.assign({ yer: y, sayfa: location.pathname }, ek || {}));
    if (secim !== "tam" || !et) return;
    var d = t === "teklif" ? "wa" : t;
    if (d === "dene" || d === "tema" || d === "ig") return;
    if (et.ads && et.adsEtiket && et.adsEtiket[d]) gtag("event", "conversion", { send_to: et.ads + "/" + et.adsEtiket[d] });
    if (window.fbq && d === "form") window.fbq("track", "Lead");
    else if (window.fbq && (d === "wa" || d === "tel")) window.fbq("track", "Contact");
  }
  /* /donusum/?o=deneme&i=<istek>&p=<paket>: deneme kurulumu tamamlandı. İzin "Tamam" ise Ads dönüşümü ve Meta StartTrial; GA4 olayı izin moduna göre.
     Aynı istek bir kez (yeniden yüklemede tekrar gönderilmez; Google ve Meta tarafında da istek kimliğiyle tekilleşir). */
  function donusumGonder() {
    var q = new URLSearchParams(location.search), i = q.get("i") || "", p = q.get("p") === "profesyonel" ? "profesyonel" : "baslangic";
    if (q.get("o") !== "deneme" || !/^[a-z0-9]{16,40}$/.test(i)) return;
    var gonderilen = []; try { gonderilen = JSON.parse(oku(localStorage, "enp_donusum") || "[]") } catch (x) {}
    if (!Array.isArray(gonderilen)) gonderilen = [];
    if (gonderilen.indexOf(i) > -1) return;
    gtag("event", "deneme_basladi", { paket: p, transaction_id: i });
    if (secim === "tam" && etHata) return; // reklam kimlikleri okunamadı: "gönderildi" diye işaretlenmez (Ads/Meta'ya gitmedi)
    yaz(localStorage, "enp_donusum", JSON.stringify(gonderilen.concat(i).slice(-20)));
    if (secim !== "tam" || !et) return;
    if (et.ads && et.adsEtiket && et.adsEtiket.dene) gtag("event", "conversion", { send_to: et.ads + "/" + et.adsEtiket.dene, transaction_id: i });
    if (window.fbq) window.fbq("track", "StartTrial", { currency: "TRY", value: 0, predicted_ltv: 0 }, { eventID: "deneme-" + i });
  }
  window.enpoviOlay = olay; // sayfadaki form (ör. "sitenizi biz hazırlayalım") gönderilince: enpoviOlay("form", el)

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var h = a.getAttribute("href") || "";
    if (h.indexOf("wa.me/?") > -1) olay("paylas", a);
    else if (h.indexOf("wa.me/") > -1) olay("wa", a);
    else if (h.indexOf("tel:") === 0) olay("tel", a);
    else if (h.indexOf("instagram.com/") > -1) olay("ig", a);
    else if (h.indexOf("https://app.enpovi.com/basla") === 0) olay("dene", a);
    else if (h.indexOf("https://app.enpovi.com/tema/") === 0) olay("tema", a);
  }, true);
  var ac = window.open; // teklif sihirbazı WhatsApp'ı window.open ile açar
  window.open = function (u) {
    try { if (String(u).indexOf("wa.me/") > -1) olay("teklif", document.activeElement) } catch (x) {} // form gönderilemeyince açılan WhatsApp: yeri "form-yedek"
    window.enpoviYer = "";
    return ac.apply(window, arguments);
  };

  var etHata = false;
  function etiketlerHazir(x) {
    etHata = !(x && typeof x === "object");
    et = etHata ? VARSAYILAN : x;
    googleYukle();
    if (tam) reklamYukle();
    if (donusum) { donusumGonder(); return } // çerçevede çerez notu gösterilmez
    if (!secim || (secim === "evet" && reklamVar())) notGoster();
  }
  /* etiketler okunamazsa: dönüşüm sayfasında, reklam izni varsa 2 kez daha denenir (Ads/Meta kimliği olmadan dönüşüm kaybolmasın) */
  function etiketAl(n) {
    function bitti(x) { if (!x && donusum && secim === "tam" && n < 2) setTimeout(function () { etiketAl(n + 1) }, 2000 * (n + 1)); else etiketlerHazir(x) }
    try { fetch(API + "etiket", { credentials: "omit" }).then(function (r) { return r.ok ? r.json() : null }).then(bitti, function () { bitti(null) }) } catch (x) { bitti(null) }
  }
  etiketAl(0);

  /* ---------- çerez notu ---------- */
  function notGoster() { hazir(function () { setTimeout(notOlustur, 1200) }) }
  function notOlustur() {
    var reklam = reklamVar();
    var st = document.createElement("style");
    st.textContent = ".cz{position:fixed;left:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:65;max-width:360px;display:flex;align-items:center;gap:8px;padding:8px 8px 8px 12px;border-radius:16px;background:rgba(8,34,27,.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);color:rgba(255,255,255,.86);font:500 12.5px/1.4 'Inter',system-ui,sans-serif;box-shadow:0 0 0 1px rgba(255,255,255,.1),0 16px 32px -14px rgba(0,0,0,.6);opacity:0;transform:translateY(12px);transition:opacity .3s,transform .3s}" +
      ".cz.on{opacity:1;transform:none}.cz a{color:#C4E57A}.cz button{flex:none;min-height:44px;border:0;border-radius:999px;font:700 12.5px/1 'Inter',system-ui,sans-serif;padding:8px 12px;cursor:pointer}" +
      ".cz .ev{background:#9BCB3C;color:#0A2B22}.cz .hy{background:transparent;color:rgba(255,255,255,.7);padding:8px}@media(max-width:420px){.cz{right:12px;max-width:none}}@media(prefers-reduced-motion:reduce){.cz{transition:none}}";
    document.head.appendChild(st);
    var d = document.createElement("div");
    d.className = "cz"; d.setAttribute("role", "region"); d.setAttribute("aria-label", "Çerez tercihi");
    d.innerHTML = "<span>" + (reklam ? "Ziyaret istatistiği ve reklam ölçümü (Google, Meta) için çerez kullanıyoruz." : "Siteyi geliştirmek için ziyaret istatistiği tutuyoruz.") +
      ' <a href="/cerez/">Ayrıntı</a></span><button class="hy" type="button">Hayır</button><button class="ev" type="button">Tamam</button>';
    document.body.appendChild(d);
    var y = document.querySelector(".yapiskan"); // ana sayfadaki alt yapışkan düğmelerin üstünde dur
    if (y && getComputedStyle(y).display !== "none") d.style.bottom = "calc(" + (y.offsetHeight + 24) + "px + env(safe-area-inset-bottom))";
    requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.add("on") }) });
    function kapat(v) {
      yaz(localStorage, ANAHTAR, v); secim = v;
      if (v === "hayir") { try { localStorage.removeItem(KALICI) } catch (x) {} } else kanalHatirla();
      if (v === "tam") {
        gtag("consent", "update", { analytics_storage: "granted", ad_storage: "granted", ad_user_data: "granted" });
        gtag("event", "page_view"); reklamYukle();
      } else if (v === "evet") { gtag("consent", "update", { analytics_storage: "granted" }); gtag("event", "page_view") }
      else { // Hayır (eski "evet" cevabını da geri alır): izin kapanır, analiz ve reklam çerezleri silinir
        gtag("consent", "update", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied" });
        document.cookie.split(";").forEach(function (c) { var n = c.split("=")[0].trim(); if (/^(_ga|_gcl|_fbp$|_fbc$)/.test(n)) ["", "." + location.hostname.replace(/^www\./, ""), location.hostname].forEach(function (d) { document.cookie = n + "=; Max-Age=0; path=/" + (d ? "; domain=" + d : "") }) });
      }
      d.classList.remove("on"); setTimeout(function () { d.remove() }, 350);
    }
    d.querySelector(".ev").onclick = function () { kapat(reklam ? "tam" : "evet") }; // reklam etiketi yokken verilen izin yalnızca istatistik içindir; etiket eklenince yeniden sorulur
    d.querySelector(".hy").onclick = function () { kapat("hayir") };
  }
  function hazir(f) { if (document.readyState !== "loading") f(); else document.addEventListener("DOMContentLoaded", f) }
  if (!donusum) hazir(denemeBaglantilari);
})();
