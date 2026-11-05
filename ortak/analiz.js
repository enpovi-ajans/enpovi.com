/* Enpovi · Google Analytics + küçük çerez notu. Sadece tanıtım sayfaları yükler (ana sayfa, blog, hizmetler, yasal sayfalar, 404).
   İzin verilene kadar çerez yazılmaz (Consent Mode: analytics_storage denied). Reklam/kişiselleştirme her zaman kapalı.
   Paneller, giriş ve yönetim bu dosyayı yüklemez. */
(function () {
  var ID = "G-Z7QNDGMGFT", ANAHTAR = "enpovi_cerez";
  if (location.hostname !== "enpovi.com" && location.hostname !== "www.enpovi.com") return;
  function oku() { try { return localStorage.getItem(ANAHTAR) } catch (x) { return null } }
  function yaz(v) { try { localStorage.setItem(ANAHTAR, v) } catch (x) {} }
  var secim = oku();

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
    analytics_storage: secim === "evet" ? "granted" : "denied" });
  gtag("set", "ads_data_redaction", true);
  gtag("js", new Date());
  gtag("config", ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
  var s = document.createElement("script");
  s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + ID;
  document.head.appendChild(s);

  function yer(el) {
    var b = el && el.closest && el.closest("section,header,footer,nav,[id]");
    return (b && (b.id || b.tagName.toLowerCase())) || "sayfa";
  }
  function olay(ad, el) { gtag("event", ad, { yer: yer(el), sayfa: location.pathname }); }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var h = a.getAttribute("href") || "";
    if (h.indexOf("wa.me/?") > -1) olay("whatsapp_paylas", a);  // yazıyı paylaşma, iletişim sayılmaz
    else if (h.indexOf("wa.me/") > -1) olay("whatsapp_tikla", a);
    else if (h.indexOf("tel:") === 0) olay("telefon_tikla", a);
    else if (h.indexOf("instagram.com/") > -1) olay("instagram_tikla", a);
  }, true);
  var ac = window.open;  // teklif sihirbazı WhatsApp'ı window.open ile açıyor
  window.open = function (u) {
    try { if (String(u).indexOf("wa.me/") > -1) olay("teklif_gonder", document.activeElement); } catch (x) {}
    return ac.apply(window, arguments);
  };

  if (secim) return;
  function not() {
    var st = document.createElement("style");
    st.textContent = ".cz{position:fixed;left:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:65;max-width:340px;display:flex;align-items:center;gap:10px;padding:8px 8px 8px 14px;border-radius:16px;background:rgba(8,34,27,.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);color:rgba(255,255,255,.86);font:500 12.5px/1.4 'Instrument Sans',system-ui,sans-serif;box-shadow:0 0 0 1px rgba(255,255,255,.1),0 16px 32px -14px rgba(0,0,0,.6);opacity:0;transform:translateY(12px);transition:opacity .35s,transform .35s}" +
      ".cz.on{opacity:1;transform:none}.cz a{color:#C4E57A}.cz button{flex:none;border:0;border-radius:999px;font:700 12.5px/1 'Instrument Sans',system-ui,sans-serif;padding:8px 12px;cursor:pointer}" +
      ".cz .ev{background:#9BCB3C;color:#0A2B22}.cz .hy{background:transparent;color:rgba(255,255,255,.7);padding:8px 6px}@media(max-width:420px){.cz{right:12px;max-width:none}}";
    document.head.appendChild(st);
    var d = document.createElement("div");
    d.className = "cz"; d.setAttribute("role", "region"); d.setAttribute("aria-label", "Çerez tercihi");
    d.innerHTML = '<span>Siteyi geliştirmek için ziyaret istatistiği tutuyoruz. <a href="/cerez/">Ayrıntı</a></span><button class="hy" type="button">Hayır</button><button class="ev" type="button">Tamam</button>';
    document.body.appendChild(d);
    var y = document.querySelector(".yapiskan");  // ana sayfadaki alt yapışkan butonların üstünde dur
    if (y && getComputedStyle(y).display !== "none") d.style.bottom = "calc(" + (y.offsetHeight + 24) + "px + env(safe-area-inset-bottom))";
    requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.add("on") }) });
    function kapat(v) {
      yaz(v);
      if (v === "evet") { gtag("consent", "update", { analytics_storage: "granted" }); gtag("event", "page_view"); }
      d.classList.remove("on"); setTimeout(function () { d.remove() }, 400);
    }
    d.querySelector(".ev").onclick = function () { kapat("evet") };
    d.querySelector(".hy").onclick = function () { kapat("hayir") };
  }
  if (document.body) setTimeout(not, 1200); else document.addEventListener("DOMContentLoaded", function () { setTimeout(not, 1200) });
})();
