/**
 * 共通マスタ編集 UI（賃率マスタと同じ操作: 一意列クリック → 編集 → 保存/削除）
 *
 * window.MASTER_EDIT_CONFIG = {
 *   apiBase: '/api/sales_master',
 *   uniqueKey: 'コード',          // テーブル上のクリック対象・一意キー
 *   uniqueAuto: true,             // true: 空で新規保存可（採番/連番）
 *   fields: [{ key: 'コード', id: 'me-code' }, ...],
 *   intKeys: ['一般', ...],       // 整数表示・入力
 *   deleteExtraKeys: ['営業担当'], // 削除確認メッセージ用
 *   valuesOnly: true              // 1件固定: テーブルなし・追加/削除なし・読込時にフォームへ反映
 * };
 */
(function () {
  'use strict';

  var cfg = window.MASTER_EDIT_CONFIG;
  if (!cfg || !cfg.apiBase || !cfg.uniqueKey || !cfg.fields) {
    console.error('MASTER_EDIT_CONFIG が未設定です');
    return;
  }

  var theadRow = document.getElementById('master-edit-thead-row');
  var tbody = document.getElementById('master-edit-tbody');
  var msgEl = document.getElementById('master-edit-message');
  var btnSave = document.getElementById('me-btn-save');
  var btnDelete = document.getElementById('me-btn-delete');

  var saveConfirmOverlay = document.getElementById('me-save-confirm-overlay');
  var saveConfirmYes = document.getElementById('me-save-confirm-yes');
  var saveConfirmNo = document.getElementById('me-save-confirm-no');
  var saveConfirmMsg = document.getElementById('me-save-confirm-message');
  var saveDoneOverlay = document.getElementById('me-save-done-overlay');
  var saveDoneOk = document.getElementById('me-save-done-ok');
  var deleteConfirmOverlay = document.getElementById('me-delete-confirm-overlay');
  var deleteConfirmMsg = document.getElementById('me-delete-confirm-message');
  var deleteConfirmYes = document.getElementById('me-delete-confirm-yes');
  var deleteConfirmNo = document.getElementById('me-delete-confirm-no');
  var deleteDoneOverlay = document.getElementById('me-delete-done-overlay');
  var deleteDoneOk = document.getElementById('me-delete-done-ok');

  var uniqueKey = cfg.uniqueKey;
  var uniqueAuto = cfg.uniqueAuto !== false;
  var valuesOnly = Boolean(cfg.valuesOnly);
  var intKeys = cfg.intKeys || [];
  var deleteExtraKeys = cfg.deleteExtraKeys || [];
  var fields = cfg.fields;
  var dataColumns = [];
  var cachedRows = [];

  function fieldEl(field) {
    return document.getElementById(field.id);
  }

  function uniqueField() {
    for (var i = 0; i < fields.length; i++) {
      if (fields[i].key === uniqueKey) return fieldEl(fields[i]);
    }
    return null;
  }

  function setMessage(text, kind) {
    if (!msgEl) return;
    msgEl.textContent = text || '';
    msgEl.classList.remove('is-error', 'is-ok');
    if (kind === 'error') msgEl.classList.add('is-error');
    if (kind === 'ok') msgEl.classList.add('is-ok');
  }

  function formatInt(v) {
    if (v === null || v === undefined || v === '') return '';
    var n = Number(String(v).replace(/,/g, ''));
    if (!isFinite(n)) return '';
    return String(Math.round(n));
  }

  function clearForm() {
    for (var i = 0; i < fields.length; i++) {
      var el = fieldEl(fields[i]);
      if (el) el.value = '';
    }
  }

  function fillFormFromRow(row) {
    if (!row) return;
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      var el = fieldEl(f);
      if (!el) continue;
      var v = row[f.key];
      if (intKeys.indexOf(f.key) !== -1) {
        el.value = formatInt(v);
      } else {
        el.value = v != null && v !== undefined ? String(v) : '';
      }
    }
  }

  function collectPayload() {
    var out = {};
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      var el = fieldEl(f);
      out[f.key] = el ? el.value : '';
    }
    return out;
  }

  function openOverlay(el) {
    if (!el) return;
    el.hidden = false;
    el.setAttribute('aria-hidden', 'false');
  }

  function closeOverlay(el) {
    if (!el) return;
    el.hidden = true;
    el.setAttribute('aria-hidden', 'true');
  }

  function renderTable() {
    if (!theadRow || !tbody) return;
    theadRow.innerHTML = '';
    tbody.innerHTML = '';
    for (var i = 0; i < dataColumns.length; i++) {
      var th = document.createElement('th');
      th.textContent = dataColumns[i];
      theadRow.appendChild(th);
    }
    for (var r = 0; r < cachedRows.length; r++) {
      var row = cachedRows[r];
      var tr = document.createElement('tr');
      for (var c = 0; c < dataColumns.length; c++) {
        var col = dataColumns[c];
        var td = document.createElement('td');
        var v = row[col];
        if (col === uniqueKey) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'master-edit-id-btn';
          btn.textContent = v != null && v !== undefined ? String(v) : '';
          btn.setAttribute('data-row-index', String(r));
          td.appendChild(btn);
        } else if (intKeys.indexOf(col) !== -1) {
          td.textContent = formatInt(v);
          td.className = 'master-edit-td-num';
        } else {
          td.textContent = v != null && v !== undefined ? String(v) : '';
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }

  function bindTableClicks() {
    if (valuesOnly || !tbody) return;
    tbody.addEventListener('click', function (e) {
      var btn = e.target.closest('.master-edit-id-btn');
      if (!btn) return;
      var idx = parseInt(btn.getAttribute('data-row-index') || '', 10);
      if (isNaN(idx) || idx < 0 || idx >= cachedRows.length) return;
      fillFormFromRow(cachedRows[idx]);
      var uk = cachedRows[idx][uniqueKey];
      setMessage(uniqueKey + ' ' + uk + ' を読み込みました', 'ok');
    });
  }

  function load() {
    setMessage('読み込み中…', '');
    fetch(cfg.apiBase)
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data.error) {
          setMessage(data.error, 'error');
          return;
        }
        dataColumns = data.columns && data.columns.length ? data.columns.slice() : [];
        cachedRows = data.rows && data.rows.length ? data.rows.slice() : [];
        if (valuesOnly) {
          if (!cachedRows.length) {
            setMessage('データがありません', 'error');
            return;
          }
          fillFormFromRow(cachedRows[0]);
          setMessage('値を編集して保存できます', '');
          return;
        }
        if (dataColumns.length === 0) {
          setMessage('列情報がありません', 'error');
          return;
        }
        renderTable();
        setMessage(
          cachedRows.length ? cachedRows.length + ' 件を表示しています' : 'データがありません',
          ''
        );
      })
      .catch(function (err) {
        setMessage('通信エラー: ' + err.message, 'error');
      });
  }

  function showSaveError(detail) {
    setMessage('', '');
    if (typeof window.showMasterSaveError === 'function') {
      window.showMasterSaveError(detail);
    } else {
      setMessage(detail || '保存に失敗しました', 'error');
    }
  }

  function parseResponse(res) {
    return res.text().then(function (text) {
      var data = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = { error: '応答を解釈できませんでした' };
        }
      }
      return { ok: res.ok, data: data };
    });
  }

  function execSave() {
    var payload = collectPayload();
    var uEl = uniqueField();
    var uniqueVal = uEl ? String(uEl.value || '').trim() : '';
    if (!uniqueAuto && !uniqueVal) {
      setMessage('新規登録時は' + uniqueKey + 'を入力してください', 'error');
      return;
    }
    setMessage('保存中…', '');
    fetch(cfg.apiBase + '/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(parseResponse)
      .then(function (out) {
        if (!out.ok || out.data.error) {
          showSaveError(out.data.error || '保存に失敗しました');
          return;
        }
        if (out.data.inserted && out.data.id != null && uEl) {
          uEl.value = String(out.data.id);
        }
        load();
        openOverlay(saveDoneOverlay);
        setMessage('', '');
      })
      .catch(function (err) {
        showSaveError('通信エラー: ' + err.message);
      });
  }

  function execDelete() {
    var uEl = uniqueField();
    var id = uEl && uEl.value.trim();
    if (!id) {
      alert('削除する行を選ぶか、' + uniqueKey + ' を入力してください。');
      return;
    }
    var payload = {};
    payload[uniqueKey] = id;
    setMessage('削除中…', '');
    fetch(cfg.apiBase + '/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(parseResponse)
      .then(function (out) {
        if (!out.ok || out.data.error) {
          setMessage(out.data.error || '削除に失敗しました', 'error');
          return;
        }
        clearForm();
        load();
        openOverlay(deleteDoneOverlay);
        setMessage('', '');
      })
      .catch(function (err) {
        setMessage('通信エラー: ' + err.message, 'error');
      });
  }

  function formatIntBlur(el) {
    if (!el) return;
    var t = el.value.trim();
    if (t === '') return;
    var n = Number(t.replace(/,/g, ''));
    if (!isFinite(n)) return;
    el.value = String(Math.round(n));
  }

  for (var fi = 0; fi < fields.length; fi++) {
    (function (f) {
      var el = fieldEl(f);
      if (!el || intKeys.indexOf(f.key) === -1) return;
      el.addEventListener('blur', function () {
        formatIntBlur(el);
      });
    })(fields[fi]);
  }

  if (btnSave) {
    btnSave.addEventListener('click', function () {
      if (saveConfirmMsg) {
        if (valuesOnly) {
          saveConfirmMsg.textContent = '保存しますか？';
        } else {
          var uEl = uniqueField();
          var isNew = !uEl || !String(uEl.value || '').trim();
          saveConfirmMsg.textContent = isNew ? '登録しますか？' : '保存しますか？';
        }
      }
      openOverlay(saveConfirmOverlay);
    });
  }
  if (saveConfirmNo) {
    saveConfirmNo.addEventListener('click', function () {
      closeOverlay(saveConfirmOverlay);
    });
  }
  if (saveConfirmYes) {
    saveConfirmYes.addEventListener('click', function () {
      closeOverlay(saveConfirmOverlay);
      execSave();
    });
  }
  if (saveDoneOk) {
    saveDoneOk.addEventListener('click', function () {
      closeOverlay(saveDoneOverlay);
    });
  }

  if (btnDelete) {
    btnDelete.addEventListener('click', function () {
      var uEl = uniqueField();
      var id = uEl && uEl.value.trim();
      if (!id) {
        alert('削除する行を選ぶか、' + uniqueKey + ' を入力してください。');
        return;
      }
      var parts = [uniqueKey + ':' + id];
      for (var i = 0; i < deleteExtraKeys.length; i++) {
        var k = deleteExtraKeys[i];
        for (var j = 0; j < fields.length; j++) {
          if (fields[j].key !== k) continue;
          var el = fieldEl(fields[j]);
          var v = el ? el.value.trim() : '';
          if (v) parts.push(v);
        }
      }
      if (deleteConfirmMsg) {
        deleteConfirmMsg.textContent = parts.join(' ') + ' を削除しますか？';
      }
      openOverlay(deleteConfirmOverlay);
    });
  }
  if (deleteConfirmNo) {
    deleteConfirmNo.addEventListener('click', function () {
      closeOverlay(deleteConfirmOverlay);
    });
  }
  if (deleteConfirmYes) {
    deleteConfirmYes.addEventListener('click', function () {
      closeOverlay(deleteConfirmOverlay);
      execDelete();
    });
  }
  if (deleteDoneOk) {
    deleteDoneOk.addEventListener('click', function () {
      closeOverlay(deleteDoneOverlay);
    });
  }

  [saveConfirmOverlay, deleteConfirmOverlay].forEach(function (ov) {
    if (!ov) return;
    ov.addEventListener('click', function (e) {
      if (e.target === ov) closeOverlay(ov);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var overlays = [saveDoneOverlay, deleteDoneOverlay, saveConfirmOverlay, deleteConfirmOverlay];
    for (var i = 0; i < overlays.length; i++) {
      if (overlays[i] && !overlays[i].hidden) {
        e.preventDefault();
        closeOverlay(overlays[i]);
        return;
      }
    }
  });

  bindTableClicks();
  load();
})();
