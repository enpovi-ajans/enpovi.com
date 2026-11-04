/* Enpovi · Google Analytics (çerezsiz). Sadece tanıtım sayfaları yükler (ana sayfa, blog, hizmetler, gizlilik).
   Çerez yazmaz, reklam/kişiselleştirme sinyalleri kapalı. Paneller, giriş ve yönetim bu dosyayı yüklemez. */
(function () {
  var ID = "G-Z7QNDGMGFT";
  if (location.hostname !== "enpovi.com" && location.hostname !== "www.enpovi.com") return;
  var s = document.createElement("script");
  s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + ID;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "granted" });
  gtag("js", new Date());
  gtag("config", ID, { client_storage: "none", allow_google_signals: false, allow_ad_personalization_signals: false });

  function yer(el) {
    var b = el && el.closest && el.closest("section,header,footer,nav,[id]");
    return (b && (b.id || b.tagName.toLowerCase())) || "sayfa";
  }
  function olay(ad, el) { gtag("event", ad, { yer: yer(el), sayfa: location.pathname }); }

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var h = a.getAttribute("href") || "";
    if (h.indexOf("wa.me/") > -1) olay("whatsapp_tikla", a);
    else if (h.indexOf("tel:") === 0) olay("telefon_tikla", a);
    else if (h.indexOf("instagram.com/") > -1) olay("instagram_tikla", a);
  }, true);

  // Teklif sihirbazı WhatsApp'ı window.open ile açıyor
  var ac = window.open;
  window.open = function (u) {
    try { if (String(u).indexOf("wa.me/") > -1) olay("teklif_gonder", document.activeElement); } catch (x) {}
    return ac.apply(window, arguments);
  };
})();
