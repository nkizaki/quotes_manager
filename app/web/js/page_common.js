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

  /**
   * Enter / Tab で「現在入力可能な」input/select だけを順に辿る。
   * readonly・disabled・dynamic-disabled・field-disabled 内は飛ばす。
   */
  function isEditableFocusTarget(el) {
    if (!el || el.disabled) return false;
    if (el.tabIndex < 0) return false;
    if (el.readOnly) return false;
    if (el.classList && el.classList.contains("dynamic-disabled")) return false;
    if (el.classList && el.classList.contains("quote-calc-readonly-field")) return false;
    if (el.closest && el.closest(".field-disabled")) return false;
    var tag = el.tagName;
    if (tag !== "INPUT" && tag !== "SELECT") return false;
    var type = el.type || "";
    if (type === "hidden" || type === "button" || type === "submit" || type === "reset" || type === "file") {
      return false;
    }
    if (el.offsetParent === null && el.getClientRects().length === 0) return false;
    if (el.closest("[hidden], [aria-hidden='true']")) return false;
    return true;
  }

  function findAdjacentEditableFocusTarget(current, direction) {
    var candidates = document.querySelectorAll("input, select");
    var list = [];
    var i;
    for (i = 0; i < candidates.length; i++) {
      if (isEditableFocusTarget(candidates[i])) list.push(candidates[i]);
    }
    if (!list.length) return null;

    var idx = list.indexOf(current);
    if (idx < 0) {
      for (i = 0; i < candidates.length; i++) {
        if (candidates[i] !== current) continue;
        if (direction > 0) {
          for (var k = i + 1; k < candidates.length; k++) {
            if (isEditableFocusTarget(candidates[k])) return candidates[k];
          }
        } else {
          for (var p = i - 1; p >= 0; p--) {
            if (isEditableFocusTarget(candidates[p])) return candidates[p];
          }
        }
        return null;
      }
      return null;
    }
    var nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= list.length) return null;
    return list[nextIdx];
  }

  function focusEditableTarget(next) {
    if (!next) return;
    next.focus();
    if (typeof next.select === "function" && next.tagName === "INPUT") {
      var t = (next.type || "").toLowerCase();
      if (t === "text" || t === "number" || t === "search" || t === "") {
        try {
          next.select();
        } catch (err) {
          /* ignore */
        }
      }
    }
  }

  function bindEditableFieldFocusNav() {
    document.addEventListener("keydown", function (e) {
      var isEnter = e.key === "Enter";
      var isTab = e.key === "Tab";
      if (!isEnter && !isTab) return;
      if (e.isComposing || e.keyCode === 229) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      var el = e.target;
      if (!el || !el.tagName) return;
      var tag = el.tagName;
      if (tag === "TEXTAREA" || tag === "BUTTON" || tag === "A") return;
      if (tag !== "INPUT" && tag !== "SELECT") return;
      if (el.type === "button" || el.type === "submit" || el.type === "reset") return;
      if (el.closest(".search-dialog-overlay, [role='alertdialog'], [role='dialog']")) return;

      var direction = isTab && e.shiftKey ? -1 : 1;
      var next = findAdjacentEditableFocusTarget(el, direction);
      // Tab で次が無いときはブラウザ既定（フォーカス移動終端）に任せる
      if (isTab && !next) return;

      e.preventDefault();
      focusEditableTarget(next);
    });
  }

  window.quotesPageCommon = {
    applyBootstrap: applyBootstrap,
    loadBootstrap: loadBootstrap,
    isEditableFocusTarget: isEditableFocusTarget,
    findAdjacentEditableFocusTarget: findAdjacentEditableFocusTarget,
    bindEditableFieldFocusNav: bindEditableFieldFocusNav,
  };

  window.quotesBindEditableFieldFocusNav = bindEditableFieldFocusNav;

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
