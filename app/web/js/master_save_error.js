/**
 * マスタ編集の保存失敗時に表示する共通エラーモーダル
 * showMasterSaveError(detail) — タイトル「エラー」、本文「更新に失敗しました\n{detail}」
 */
(function () {
  'use strict';

  var overlay = null;
  var messageEl = null;

  function closeOverlay() {
    if (!overlay) return;
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
  }

  function openOverlay() {
    if (!overlay) return;
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
  }

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'master-save-error-overlay';
    overlay.className = 'search-dialog-overlay';
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML =
      '<div class="search-dialog-panel" role="alertdialog" aria-modal="true" aria-labelledby="master-save-error-title">' +
      '<div class="search-dialog-head">' +
      '<span id="master-save-error-title" class="search-dialog-title">エラー</span>' +
      '</div>' +
      '<div class="search-dialog-body">' +
      '<p class="search-dialog-message" id="master-save-error-message"></p>' +
      '<div class="search-dialog-actions">' +
      '<button type="button" id="master-save-error-ok" class="search-dialog-btn search-dialog-btn-primary">OK</button>' +
      '</div></div></div>';
    document.body.appendChild(overlay);
    messageEl = document.getElementById('master-save-error-message');
    if (messageEl) {
      messageEl.style.whiteSpace = 'pre-line';
    }
    var okBtn = document.getElementById('master-save-error-ok');
    if (okBtn) {
      okBtn.addEventListener('click', closeOverlay);
    }
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeOverlay();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay && !overlay.hidden) {
        e.preventDefault();
        closeOverlay();
      }
    });
  }

  window.showMasterSaveError = function (detail) {
    ensureOverlay();
    var text = detail != null && String(detail).trim() !== '' ? String(detail) : '不明なエラー';
    if (messageEl) {
      messageEl.textContent = '更新に失敗しました\n' + text;
    }
    openOverlay();
  };
})();
