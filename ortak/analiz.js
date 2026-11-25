/* Enpovi · ölçüm ve çerez notu. Sadece tanıtım sayfaları yükler (ana sayfa, blog, hizmetler, yasal sayfalar, 404); paneller, giriş ve yönetim yüklemez.
   1) Enpovi sayacı (çerezsiz, kimliksiz): ziyaret, WhatsApp, arama, Instagram, form ve deneme tıklaması app.enpovi.com'a yalnızca "olay + kaynak" olarak gider
      (IP, kimlik, tarayıcı izi tutulmaz). Kaynak (utm_*, saha kodu, gelinen site) yalnızca bu sekmenin oturumunda (sessionStorage) tutulur.
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
    if (q.get("gclid")) return { k: "google", o: "cpc", c: "", z: "" };
    var r = ""; try { r = new URL(document.referrer).hostname.replace(/^(www|m|l|lm)\./, "") } catch (x) {}
    if (!r || /(^|\.)enpovi\.com$/.test(r)) return null;
    if (/(^|\.)google\./.test(r) || r === "bing.com" || r === "yandex.com.tr" || r === "duckduckgo.com") return { k: r.split(".")[0], o: "organik", c: "", z: "" };
    return { k: parca(r.replace(/\.(com|net|org)(\.tr)?$/, "")), o: "referans", c: "", z: "" };
  }
  var kanal = null; try { kanal = JSON.parse(oku(sessionStorage, "enp_kanal") || "null") } catch (x) {}
  var yeni = kaynakBul(), isaretli = /[?&](utm_source|saha|gclid)=/.test(location.search);
  if (yeni && (isaretli || !kanal)) { kanal = yeni; yaz(sessionStorage, "enp_kanal", JSON.stringify(kanal)) } // yeni kampanya tıklaması öncekinin yerine geçer
  kanal = kanal || { k: "", o: "", c: "", z: "" };

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
  function say(t) { // çerez gönderilmez (credentials: omit); fetch yoksa sendBeacon
    var g = JSON.stringify({ t: t, s: location.pathname, k: kanal.k, o: kanal.o, c: kanal.c, z: kanal.z });
    try { fetch(API + "olay", { method: "POST", body: g, keepalive: true, mode: "cors", credentials: "omit", headers: { "content-type": "text/plain" } }).catch(function () {}) }
    catch (x) { try { navigator.sendBeacon(API + "olay", new Blob([g], { type: "text/plain" })) } catch (y) {} }
  }
  if (!oku(sessionStorage, "enp_g")) { yaz(sessionStorage, "enp_g", "1"); say("gor") } // ziyaret = oturum başına bir kez

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
    gtag("config", et.ga4, { allow_google_signals: false, allow_ad_personalization_signals: false });
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
      window.fbq("set", "autoConfig", false, et.meta); // otomatik olay ve düğme/sayfa bilgisi toplama kapalı: yalnızca PageView, Lead, Contact
      window.fbq("init", et.meta); window.fbq("track", "PageView");
    }
  }
  var GA = { wa: "whatsapp_tikla", tel: "telefon_tikla", ig: "instagram_tikla", dene: "deneme_tikla", form: "generate_lead", teklif: "teklif_gonder", paylas: "whatsapp_paylas" };
  function yer(el) { var b = el && el.closest && el.closest("section,header,footer,nav,[id]"); return (b && (b.id || b.tagName.toLowerCase())) || "sayfa" }
  /* olay: Enpovi sayacı + GA4 (+ izin varsa Ads dönüşümü ve Meta). teklif (sihirbazdan WhatsApp) sayaçta WhatsApp sayılır; paylas iletişim değildir. */
  function olay(t, el, ek) {
    if (t !== "paylas") say(t === "teklif" ? "wa" : t);
    gtag("event", GA[t], Object.assign({ yer: yer(el), sayfa: location.pathname }, ek || {}));
    if (secim !== "tam" || !et) return;
    var d = t === "teklif" ? "wa" : t;
    if (et.ads && et.adsEtiket && et.adsEtiket[d]) gtag("event", "conversion", { send_to: et.ads + "/" + et.adsEtiket[d] });
    if (window.fbq && (d === "dene" || d === "form")) window.fbq("track", "Lead");
    else if (window.fbq && (d === "wa" || d === "tel")) window.fbq("track", "Contact");
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
  }, true);
  var ac = window.open; // teklif sihirbazı WhatsApp'ı window.open ile açar
  window.open = function (u) {
    try { if (String(u).indexOf("wa.me/") > -1) olay("teklif", document.activeElement) } catch (x) {}
    return ac.apply(window, arguments);
  };

  function etiketlerHazir(x) {
    et = x && typeof x === "object" ? x : VARSAYILAN;
    googleYukle();
    if (tam) reklamYukle();
    if (!secim || (secim === "evet" && reklamVar())) notGoster();
  }
  try {
    fetch(API + "etiket", { credentials: "omit" }).then(function (r) { return r.ok ? r.json() : null }).then(etiketlerHazir, function () { etiketlerHazir(null) });
  } catch (x) { etiketlerHazir(null) }

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
  hazir(denemeBaglantilari);
})();
