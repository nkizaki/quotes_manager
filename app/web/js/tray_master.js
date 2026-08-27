(function () {
  'use strict';

  var COLUMN_SLUG = {
    ID: 'id',
    トレー名: 'name',
    材質: 'material',
    収容数: 'capacity',
    単価: 'price'
  };

  function cellClassForColumn(colName) {
    var slug = COLUMN_SLUG[colName];
    return slug ? 'tm-cell tm-cell--' + slug : 'tm-cell';
  }

  var theadRow = document.getElementById('tray-master-thead-row');
  var tbody = document.getElementById('tray-master-tbody');
  var msgEl = document.getElementById('tray-master-message');

  var elId = document.getElementById('tm-id');
  var elName = document.getElementById('tm-name');
  var elMaterial = document.getElementById('tm-material');
  var elCapacity = document.getElementById('tm-capacity');
  var elPrice = document.getElementById('tm-price');
  var btnSave = document.getElementById('tm-btn-save');
  var btnDelete = document.getElementById('tm-btn-delete');

  var saveConfirmOverlay = document.getElementById('tm-save-confirm-overlay');
  var saveConfirmYes = document.getElementById('tm-save-confirm-yes');
  var saveConfirmNo = document.getElementById('tm-save-confirm-no');
  var saveConfirmMsg = document.getElementById('tm-save-confirm-message');
  var saveDoneOverlay = document.getElementById('tm-save-done-overlay');
  var saveDoneOk = document.getElementById('tm-save-done-ok');
  var deleteConfirmOverlay = document.getElementById('tm-delete-confirm-overlay');
  var deleteConfirmMsg = document.getElementById('tm-delete-confirm-message');
  var deleteConfirmYes = document.getElementById('tm-delete-confirm-yes');
  var deleteConfirmNo = document.getElementById('tm-delete-confirm-no');
  var deleteDoneOverlay = document.getElementById('tm-delete-done-overlay');
  var deleteDoneOk = document.getElementById('tm-delete-done-ok');

  var dataColumns = [];
  var cachedRows = [];

  function setMessage(text, kind) {
    if (!msgEl) return;
    msgEl.textContent = text || '';
    msgEl.classList.remove('is-error', 'is-ok');
    if (kind === 'error') msgEl.classList.add('is-error');
    if (kind === 'ok') msgEl.classList.add('is-ok');
  }

  function showSaveError(detail) {
    setMessage('', '');
    if (typeof window.showMasterSaveError === 'function') {
      window.showMasterSaveError(detail);
    } else {
      setMessage(detail || '保存に失敗しました', 'error');
    }
  }

  function formatCapacity(v) {
    if (v === null || v === undefined || v === '') {
      return '';
    }
    var n = parseInt(String(v).replace(/,/g, ''), 10);
    if (!isFinite(n)) {
      return '';
    }
    return String(n);
  }

  function formatPrice1(v) {
    if (v === null || v === undefined || v === '') {
      return '';
    }
    var n = Number(String(v).replace(/,/g, ''));
    if (!isFinite(n)) {
      return '';
    }
    return n.toFixed(1);
  }

  function blurCapacity() {
    if (!elCapacity) return;
    var t = elCapacity.value.trim().replace(/,/g, '');
    if (t === '') {
      elCapacity.value = '';
      return;
    }
    var n = parseInt(t, 10);
    if (!isFinite(n)) return;
    elCapacity.value = String(n);
  }

  function blurPrice() {
    if (!elPrice) return;
    var t = elPrice.value.trim().replace(/,/g, '');
    if (t === '') {
      elPrice.value = '';
      return;
    }
    var n = Number(t);
    if (!isFinite(n)) return;
    var q = Math.round(n * 10) / 10;
    elPrice.value = q.toFixed(1);
  }

  function clearForm() {
    if (elId) elId.value = '';
    if (elName) elName.value = '';
    if (elMaterial) elMaterial.value = '';
    if (elCapacity) elCapacity.value = '';
    if (elPrice) elPrice.value = '';
  }

  function fillFormFromRow(row) {
    if (!row) return;
    if (elId) {
      elId.value = row.ID != null && row.ID !== undefined ? String(row.ID) : '';
    }
    if (elName) {
      elName.value = row['トレー名'] != null ? String(row['トレー名']) : '';
    }
    if (elMaterial) {
      elMaterial.value = row['材質'] != null ? String(row['材質']) : '';
    }
    if (elCapacity) {
      elCapacity.value = formatCapacity(row['収容数']);
    }
    if (elPrice) {
      elPrice.value = formatPrice1(row['単価']);
    }
  }

  function collectPayload() {
    return {
      ID: elId && elId.value.trim() ? elId.value.trim() : '',
      トレー名: elName ? elName.value : '',
      材質: elMaterial ? elMaterial.value : '',
      収容数: elCapacity ? elCapacity.value : '',
      単価: elPrice ? elPrice.value : ''
    };
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
      th.className = cellClassForColumn(dataColumns[i]);
      th.textContent = dataColumns[i];
      theadRow.appendChild(th);
    }
    for (var r = 0; r < cachedRows.length; r++) {
      var row = cachedRows[r];
      var tr = document.createElement('tr');
      for (var c = 0; c < dataColumns.length; c++) {
        var col = dataColumns[c];
        var td = document.createElement('td');
        td.className = cellClassForColumn(col);
        var v = row[col];
        if (col === 'ID') {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'tray-master-id-btn';
          btn.textContent = v != null && v !== undefined ? String(v) : '';
          btn.setAttribute('data-row-index', String(r));
          td.appendChild(btn);
        } else if (col === '収容数') {
          td.textContent = formatCapacity(v);
          td.className += ' tray-master-td-num';
        } else if (col === '単価') {
          td.textContent = formatPrice1(v);
          td.className += ' tray-master-td-num';
        } else {
          td.textContent = v != null && v !== undefined ? String(v) : '';
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }

  function bindTableClicks() {
    if (!tbody) return;
    tbody.addEventListener('click', function (e) {
      var btn = e.target.closest('.tray-master-id-btn');
      if (!btn) return;
      var idx = parseInt(btn.getAttribute('data-row-index') || '', 10);
      if (isNaN(idx) || idx < 0 || idx >= cachedRows.length) return;
      fillFormFromRow(cachedRows[idx]);
      setMessage('ID ' + cachedRows[idx].ID + ' を読み込みました', 'ok');
    });
  }

  function load() {
    setMessage('読み込み中…', '');
    fetch('/api/tray_master')
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

  function execSave() {
    var payload = collectPayload();
    setMessage('保存中…', '');
    fetch('/api/tray_master/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
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
      })
      .then(function (out) {
        if (!out.ok || out.data.error) {
          showSaveError(out.data.error || '保存に失敗しました');
          return;
        }
        if (out.data.inserted && out.data.id != null && elId) {
          elId.value = String(out.data.id);
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
    var id = elId && elId.value.trim();
    if (!id) {
      alert('削除する行を選ぶか、ID を入力してください。');
      return;
    }
    setMessage('削除中…', '');
    fetch('/api/tray_master/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ID: id })
    })
      .then(function (res) {
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
      })
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

  if (elCapacity) {
    elCapacity.addEventListener('blur', blurCapacity);
  }
  if (elPrice) {
    elPrice.addEventListener('blur', blurPrice);
  }

  if (btnSave) {
    btnSave.addEventListener('click', function () {
      if (saveConfirmMsg) {
        var isNew = !elId || !String(elId.value || '').trim();
        saveConfirmMsg.textContent = isNew ? '登録しますか？' : '保存しますか？';
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
      var id = elId && elId.value.trim();
      var nm = elName && elName.value.trim();
      if (!id) {
        alert('削除する行を選ぶか、ID を入力してください。');
        return;
      }
      if (deleteConfirmMsg) {
        deleteConfirmMsg.textContent = 'ID:' + id + (nm ? ' ' + nm : '') + ' を削除しますか？';
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
      if (e.target === ov) {
        if (ov === saveConfirmOverlay) closeOverlay(saveConfirmOverlay);
        if (ov === deleteConfirmOverlay) closeOverlay(deleteConfirmOverlay);
      }
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (saveDoneOverlay && !saveDoneOverlay.hidden) {
      e.preventDefault();
      closeOverlay(saveDoneOverlay);
      return;
    }
    if (deleteDoneOverlay && !deleteDoneOverlay.hidden) {
      e.preventDefault();
      closeOverlay(deleteDoneOverlay);
      return;
    }
    if (saveConfirmOverlay && !saveConfirmOverlay.hidden) {
      e.preventDefault();
      closeOverlay(saveConfirmOverlay);
      return;
    }
    if (deleteConfirmOverlay && !deleteConfirmOverlay.hidden) {
      e.preventDefault();
      closeOverlay(deleteConfirmOverlay);
      return;
    }
  });

  bindTableClicks();
  load();
})();
