/**
 * 起動時ウィンドウ高さに応じて --ui-scale / --font-scale を設定する。
 * いずれも基準値 × ユーザー設定倍率（font_size_percent）を掛ける。
 * 初回描画は font_scale_boot.js（head）が担当し、ここでは bootstrap と同期する。
 */
(function () {
  var STORAGE_KEY = "shipInspFontSizePercent";
  var SCALE_HEIGHT_850 = 850;
  var SCALE_HEIGHT_700 = 700;
  var startupWindowHeight = null;
  var fontSizePercent =
    typeof window.__SHIP_INSP_FONT_SIZE_PERCENT__ === "number"
      ? window.__SHIP_INSP_FONT_SIZE_PERCENT__
      : 100;

  function uiScaleFromWindowHeight(height) {
    if (height <= SCALE_HEIGHT_700) return 0.67;
    if (height <= SCALE_HEIGHT_850) return 0.8;
    return 1;
  }

  function fontScaleFromWindowHeight(height) {
    if (height <= SCALE_HEIGHT_700) return 0.67;
    if (height <= SCALE_HEIGHT_850) return 0.8;
    return 1;
  }

  function normalizeFontSizePercent(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return 100;
    n = Math.round(n);
    if (n < 50) return 50;
    if (n > 300) return 300;
    return n;
  }

  function persistFontSizePercent(percent) {
    try {
      localStorage.setItem(STORAGE_KEY, String(percent));
    } catch (e) {
      /* ignore */
    }
    window.__SHIP_INSP_FONT_SIZE_PERCENT__ = percent;
  }

  function applyDisplayScale(height) {
    var h = height != null ? height : (startupWindowHeight != null ? startupWindowHeight : window.innerHeight);
    var userRatio = fontSizePercent / 100;
    var uiScale = uiScaleFromWindowHeight(h) * userRatio;
    var fontScale = fontScaleFromWindowHeight(h) * userRatio;
    var root = document.documentElement;
    root.style.setProperty("--ui-scale", String(uiScale));
    root.style.setProperty("--font-scale", String(fontScale));
    root.dataset.fontSizePercent = String(fontSizePercent);
    persistFontSizePercent(fontSizePercent);
    var el = document.getElementById("app-ui-scale");
    if (el) {
      el.textContent = "scale: " + uiScale.toFixed(2) + " / font: " + fontScale.toFixed(2) + " (" + fontSizePercent + "%)";
    }
  }

  function setFontSizePercent(percent, options) {
    fontSizePercent = normalizeFontSizePercent(percent);
    applyDisplayScale();
    var input = document.getElementById("font-size-percent-input");
    if (input && !(options && options.skipInputSync)) {
      input.value = String(fontSizePercent);
    }
    return fontSizePercent;
  }

  function applyDisplayBootstrap(boot) {
    if (!boot || !boot.ok) return;
    var pct =
      boot.font_size_percent != null
        ? boot.font_size_percent
        : boot.display && boot.display.font_size_percent;
    if (pct != null) {
      fontSizePercent = normalizeFontSizePercent(pct);
    }
    if (startupWindowHeight == null) {
      startupWindowHeight =
        (boot.display && boot.display.work_area_height) || window.innerHeight;
    }
    applyDisplayScale();
    var input = document.getElementById("font-size-percent-input");
    if (input) input.value = String(fontSizePercent);
  }

  window.applyDisplayBootstrap = applyDisplayBootstrap;
  window.setFontSizePercent = setFontSizePercent;
  window.getFontSizePercent = function () {
    return fontSizePercent;
  };

  function loadBootstrap() {
    if (typeof window.quotesWaitForBridge !== "function") {
      applyDisplayScale();
      return;
    }
    window.quotesWaitForBridge()
      .then(function (bridge) { return bridge.bootstrap(); })
      .then(applyDisplayBootstrap)
      .catch(function () { applyDisplayScale(); });
  }

  // boot 済みでも、作業領域高さが後から分かるため bootstrap 後に再適用する
  applyDisplayScale();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadBootstrap);
  } else {
    loadBootstrap();
  }
})();
