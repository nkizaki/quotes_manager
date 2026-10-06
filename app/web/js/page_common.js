(function () {
  "use strict";

  function applyBootstrap(boot) {
    if (!boot || !boot.ok) return;
    var versionEl = document.getElementById("app-version");
    if (versionEl) versionEl.textContent = "ver." + (boot.version || "");
    var isDev = !!boot.devflg;
    var devBadge = document.getElementById("app-dev-badge");
    if (devBadge) devBadge.hidden = !isDev;
    // 本番(DEVFLG=False)はヘッダーのスケール表示をオフ
    var scaleEl = document.getElementById("app-ui-scale");
    if (scaleEl) scaleEl.hidden = !isDev;
    // デバッグ時のみ接続先をスケール表示の後ろに表示
    var dbEl = document.getElementById("app-db-path");
    if (dbEl) {
      if (isDev && boot.db_display) {
        dbEl.hidden = false;
        dbEl.textContent = boot.db_display;
      } else {
        dbEl.hidden = true;
        dbEl.textContent = "";
      }
    }
    if (typeof window.applyDisplayBootstrap === "function") {
      window.applyDisplayBootstrap(boot);
    }
  }

  async function loadBootstrap() {
    try {
      var boot = await window.quotesApi("/api/bootstrap");
      applyBootstrap(boot);
    } catch (err) {
      console.error("bootstrap failed", err);
    }
  }

  window.quotesPageCommon = {
    applyBootstrap: applyBootstrap,
    loadBootstrap: loadBootstrap,
  };

  function onDomReady() {
    if (document.getElementById("app-version")) {
      loadBootstrap();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onDomReady);
  } else {
    onDomReady();
  }
})();
