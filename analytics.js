// analytics.js — Google Analytics 4 (G-FW103YN1DX, the same property as
// nbdfinder.com, so Hubba traffic rolls into the existing account). Because
// it's a subdomain of nbdfinder.com, GA's cookie sits at the root domain and
// sessions carry across the two sites automatically — no cross-domain setup.
//
// Opt-in, to match NBD Finder's privacy posture: Consent Mode v2 defaults
// everything to denied and the gtag.js script is NOT loaded until the visitor
// clicks Accept. Declining (or ignoring) means zero analytics cookies/requests.
// The choice is remembered per-origin in localStorage.
"use strict";
(function () {
  var GA_ID = "G-FW103YN1DX";
  var KEY = "hubba_consent_v1"; // "granted" | "denied"

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  gtag("js", new Date());
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
  });
  gtag("config", GA_ID, { anonymize_ip: true });

  var loaded = false;
  function loadGA() {
    if (loaded) return;
    loaded = true;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
  }
  function grant() {
    gtag("consent", "update", { analytics_storage: "granted" });
    loadGA();
  }

  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}
  if (stored === "granted") { grant(); return; }
  if (stored === "denied") { return; }

  // first visit — show a small opt-in bar (deferred script, so body exists)
  var bar = document.createElement("div");
  bar.id = "consent-bar";
  bar.setAttribute("role", "dialog");
  bar.setAttribute("aria-label", "Analytics consent");
  bar.innerHTML =
    '<span class="consent-text">Analytics cookies help us see how many skaters visit — ' +
    'no ads, no selling data. ' +
    '<a href="https://nbdfinder.com/privacy" target="_blank" rel="noopener">Privacy</a></span>' +
    '<span class="consent-actions">' +
    '<button type="button" id="consent-decline">Decline</button>' +
    '<button type="button" id="consent-accept">Accept</button></span>';
  document.body.appendChild(bar);
  document.getElementById("consent-accept").addEventListener("click", function () {
    try { localStorage.setItem(KEY, "granted"); } catch (e) {}
    grant();
    bar.remove();
  });
  document.getElementById("consent-decline").addEventListener("click", function () {
    try { localStorage.setItem(KEY, "denied"); } catch (e) {}
    bar.remove();
  });
})();
