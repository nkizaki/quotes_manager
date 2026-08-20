(function () {
  "use strict";

  var FONT_SIZE_API = "/api/config/font-size";
  var fontSizeInput = document.getElementById("font-size-percent-input");
  var fontSizeSaveTimer = null;

  function applyFontSizeLocal(percent) {
    if (typeof window.setFontSizePercent === "function") {
      return window.setFontSizePercent(percent);
    }
    return percent;
  }

  async function saveFontSize(percent) {
    var normalized = applyFontSizeLocal(percent);
    try {
      var data = await window.quotesApi(FONT_SIZE_API, { font_size_percent: normalized });
      if (!data || data.ok !== true) {
        window.alert((data && data.error) || "文字サイズの保存に失敗しました。");
        return;
      }
      if (data.font_size_percent != null) {
        applyFontSizeLocal(data.font_size_percent);
      }
    } catch (e) {
      window.alert("文字サイズの保存に失敗しました。");
    }
  }

  function scheduleFontSizeSave() {
    if (!fontSizeInput) return;
    if (fontSizeSaveTimer) window.clearTimeout(fontSizeSaveTimer);
    fontSizeSaveTimer = window.setTimeout(function () {
      void saveFontSize(fontSizeInput.value);
    }, 400);
  }

  if (fontSizeInput) {
    fontSizeInput.addEventListener("input", function () {
      applyFontSizeLocal(fontSizeInput.value);
      scheduleFontSizeSave();
    });
    fontSizeInput.addEventListener("change", function () {
      if (fontSizeSaveTimer) window.clearTimeout(fontSizeSaveTimer);
      void saveFontSize(fontSizeInput.value);
    });
    fontSizeInput.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (fontSizeSaveTimer) window.clearTimeout(fontSizeSaveTimer);
      void saveFontSize(fontSizeInput.value);
      fontSizeInput.blur();
    });
  }
})();
