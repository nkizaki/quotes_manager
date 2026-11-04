/**
 * 起動時ウィンドウ高さに応じて --ui-scale / --font-scale を設定する。
 * いずれも基準値 × ユーザー設定倍率（font_size_percent）を掛ける。
 * 初回描画は font_scale_boot.js（head）が担当し、ここでは bootstrap と同期する。
 */
(function () {
  var STORAGE_KEY = "shipInspFontSizePercent";
  /* label_print と同じ閾値・倍率 */
  var SCALE_HEIGHT_900 = 900;
  var SCALE_HEIGHT_700 = 700;
  var startupWindowHeight = null;
  var fontSizePercent =
    typeof window.__SHIP_INSP_FONT_SIZE_PERCENT__ === "number"
      ? window.__SHIP_INSP_FONT_SIZE_PERCENT__
      : 100;

  function uiScaleFromWindowHeight(height) {
    if (height <= SCALE_HEIGHT_700) return 0.67;
    if (height <= SCALE_HEIGHT_900) return 0.8;
    return 1;
  }

  function fontScaleFromWindowHeight(height) {
    if (height <= SCALE_HEIGHT_700) return 0.67;
    if (height <= SCALE_HEIGHT_900) return 0.8;
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
    if (el && !el.hidden) {
      el.textContent = "scale: " + uiScale.toFixed(2) + " / font: " + fontScale.toFixed(2) + " (" + fontSizePercent + "%)";
    }
  }

  function setFontSizePercent(percent) {
    fontSizePercent = normalizeFontSizePercent(percent);
    applyDisplayScale();
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
  }

  var FONT_SIZE_API = "/api/config/font-size";
  var ZOOM_STEP = 10;
  var wheelAccum = 0;
  var saveTimer = null;

  function scheduleFontSizeSave() {
    if (saveTimer) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(function () {
      saveTimer = null;
      if (typeof window.quotesApi !== "function") return;
      window
        .quotesApi(FONT_SIZE_API, { font_size_percent: fontSizePercent })
        .catch(function () {
          /* 表示は既に反映済み */
        });
    }, 400);
  }

  function zoomBy(deltaPercent) {
    setFontSizePercent(fontSizePercent + deltaPercent);
    scheduleFontSizeSave();
  }

  document.addEventListener(
    "wheel",
    function (e) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      var dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 40;
      else if (e.deltaMode === 2) dy *= 800;
      wheelAccum += dy;
      if (Math.abs(wheelAccum) < 40) return;
      var direction = wheelAccum > 0 ? -1 : 1;
      wheelAccum = 0;
      zoomBy(direction * ZOOM_STEP);
    },
    { capture: true, passive: false }
  );

  document.addEventListener(
    "keydown",
    function (e) {
      if (!e.ctrlKey || e.altKey || e.metaKey) return;
      var key = e.key;
      if (key === "0") {
        e.preventDefault();
        setFontSizePercent(100);
        scheduleFontSizeSave();
        return;
      }
      if (key === "+" || key === "=" || key === "Add") {
        e.preventDefault();
        zoomBy(ZOOM_STEP);
        return;
      }
      if (key === "-" || key === "_" || key === "Subtract") {
        e.preventDefault();
        zoomBy(-ZOOM_STEP);
      }
    },
    true
  );

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
