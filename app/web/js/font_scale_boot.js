/**
 * CSS 読込直後・body 描画前にスケールを同期適用する（FOUC 防止）。
 * 優先順位: font_size_pref.js → localStorage → 100
 */
(function () {
  var STORAGE_KEY = "shipInspFontSizePercent";
  var SCALE_HEIGHT_850 = 850;
  var SCALE_HEIGHT_700 = 700;

  function normalize(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return 100;
    n = Math.round(n);
    if (n < 50) return 50;
    if (n > 300) return 300;
    return n;
  }

  function readFromPref() {
    if (typeof window.__SHIP_INSP_FONT_SIZE_PERCENT__ === "number") {
      return normalize(window.__SHIP_INSP_FONT_SIZE_PERCENT__);
    }
    return null;
  }

  function readFromStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw != null && raw !== "" ? normalize(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeStorage(percent) {
    try {
      localStorage.setItem(STORAGE_KEY, String(percent));
    } catch (e) {
      /* ignore */
    }
  }

  function uiScaleFromHeight(height) {
    if (height <= SCALE_HEIGHT_700) return 0.67;
    if (height <= SCALE_HEIGHT_850) return 0.8;
    return 1;
  }

  function fontScaleFromHeight(height) {
    if (height <= SCALE_HEIGHT_700) return 0.67;
    if (height <= SCALE_HEIGHT_850) return 0.8;
    return 1;
  }

  var fromPref = readFromPref();
  var percent = fromPref != null ? fromPref : readFromStorage();
  if (percent == null) percent = 100;
  writeStorage(percent);

  var h = window.innerHeight || 1080;
  var ratio = percent / 100;
  var uiScale = uiScaleFromHeight(h) * ratio;
  var fontScale = fontScaleFromHeight(h) * ratio;
  var root = document.documentElement;
  root.style.setProperty("--ui-scale", String(uiScale));
  root.style.setProperty("--font-scale", String(fontScale));
  root.dataset.fontSizePercent = String(percent);
  window.__SHIP_INSP_FONT_SIZE_PERCENT__ = percent;
})();
