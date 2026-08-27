(function () {
  'use strict';

  var NUMERIC_KEYS = [
    '60サイズ',
    '80サイズ',
    '100サイズ',
    '120サイズ',
    '140サイズ',
    '160サイズ',
    '180サイズ',
    '200サイズ'
  ];

  var FORM_INT_IDS = [
    'fm-s60',
    'fm-s80',
    'fm-s100',
    'fm-s120',
    'fm-s140',
    'fm-s160',
    'fm-s180',
    'fm-s200'
  ];

  var KEY_TO_FORM_ID = {
    '60サイズ': 'fm-s60',
    '80サイズ': 'fm-s80',
    '100サイズ': 'fm-s100',
    '120サイズ': 'fm-s120',
    '140サイズ': 'fm-s140',
    '160サイズ': 'fm-s160',
    '180サイズ': 'fm-s180',
    '200サイズ': 'fm-s200'
  };

  var COLUMN_SLUG = {
    地方ID: 'chiho-id',
    地方名: 'chiho-name',
    '60サイズ': 's60',
    '80サイズ': 's80',
    '100サイズ': 's100',
    '120サイズ': 's120',
    '140サイズ': 's140',
    '160サイズ': 's160',
    '180サイズ': 's180',
    '200サイズ': 's200'
  };

  function cellClassForColumn(colName) {
    var slug = COLUMN_SLUG[colName];
    return slug ? 'fm-cell fm-cell--' + slug : 'fm-cell';
  }

  var theadRow = document.getElementById('freight-master-thead-row');
  var tbody = document.getElementById('freight-master-tbody');
  var msgEl = document.getElementById('freight-master-message');

  var elChihoId = document.getElementById('fm-chiho-id');
  var elChihoName = document.getElementById('fm-chiho-name');
  var btnSave = document.getElementById('fm-btn-save');
  var btnDelete = document.getElementById('fm-btn-delete');

  var saveConfirmOverlay = document.getElementById('fm-save-confirm-overlay');
  var saveConfirmYes = document.getElementById('fm-save-confirm-yes');
  var saveConfirmNo = document.getElementById('fm-save-confirm-no');
  var saveConfirmMsg = document.getElementById('fm-save-confirm-message');
  var saveDoneOverlay = document.getElementById('fm-save-done-overlay');
  var saveDoneOk = document.getElementById('fm-save-done-ok');
  var deleteConfirmOverlay = document.getElementById('fm-delete-confirm-overlay');
  var deleteConfirmMsg = document.getElementById('fm-delete-confirm-message');
  var deleteConfirmYes = document.getElementById('fm-delete-confirm-yes');
  var deleteConfirmNo = document.getElementById('fm-delete-confirm-no');
  var deleteDoneOverlay = document.getElementById('fm-delete-done-overlay');
  var deleteDoneOk = document.getElementById('fm-delete-done-ok');

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

  function formatFreightInt(v) {
    if (v === null || v === undefined || v === '') {
      return '';
    }
    var n = parseInt(String(v).replace(/,/g, ''), 10);
    if (!isFinite(n)) {
      return '';
    }
    return n.toLocaleString('ja-JP');
  }

  function formatFreightInputOnBlur(el) {
    if (!el) return;
    var t = el.value.trim().replace(/,/g, '');
    if (t === '') {
      el.value = '';
      return;
    }
    var n = parseInt(t, 10);
    if (!isFinite(n)) {
      return;
    }
    el.value = n.toLocaleString('ja-JP');
  }

  function clearForm() {
    if (elChihoId) elChihoId.value = '';
    if (elChihoName) elChihoName.value = '';
    for (var i = 0; i < FORM_INT_IDS.length; i++) {
      var el = document.getElementById(FORM_INT_IDS[i]);
      if (el) el.value = '';
    }
  }

  function fillFormFromRow(row) {
    if (!row) return;
    if (elChihoId) {
      elChihoId.value = row['地方ID'] != null && row['地方ID'] !== undefined ? String(row['地方ID']) : '';
    }
    if (elChihoName) {
      elChihoName.value = row['地方名'] != null ? String(row['地方名']) : '';
    }
    for (var k in KEY_TO_FORM_ID) {
      var inp = document.getElementById(KEY_TO_FORM_ID[k]);
      if (!inp) continue;
      inp.value = formatFreightInt(row[k]);
    }
  }

  function collectPayload() {
    function val(id) {
      var el = document.getElementById(id);
      return el ? el.value : '';
    }
    return {
      地方ID: elChihoId && elChihoId.value.trim() ? elChihoId.value.trim() : '',
      地方名: elChihoName ? elChihoName.value : '',
      '60サイズ': val('fm-s60'),
      '80サイズ': val('fm-s80'),
      '100サイズ': val('fm-s100'),
      '120サイズ': val('fm-s120'),
      '140サイズ': val('fm-s140'),
      '160サイズ': val('fm-s160'),
      '180サイズ': val('fm-s180'),
      '200サイズ': val('fm-s200')
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
        if (col === '地方ID') {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'freight-master-id-btn';
          btn.textContent = v != null && v !== undefined ? String(v) : '';
          btn.setAttribute('data-row-index', String(r));
          td.appendChild(btn);
        } else if (NUMERIC_KEYS.indexOf(col) !== -1) {
          td.textContent = formatFreightInt(v);
          td.className += ' freight-master-td-num';
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
      var btn = e.target.closest('.freight-master-id-btn');
      if (!btn) return;
      var idx = parseInt(btn.getAttribute('data-row-index') || '', 10);
      if (isNaN(idx) || idx < 0 || idx >= cachedRows.length) return;
      fillFormFromRow(cachedRows[idx]);
      setMessage('地方ID ' + cachedRows[idx]['地方ID'] + ' を読み込みました', 'ok');
    });
  }

  function load() {
    setMessage('読み込み中…', '');
    fetch('/api/freight_master')
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
    fetch('/api/freight_master/save', {
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
        if (out.data.inserted && out.data.id != null && elChihoId) {
          elChihoId.value = String(out.data.id);
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
    var id = elChihoId && elChihoId.value.trim();
    if (!id) {
      alert('削除する行を選ぶか、地方ID を入力してください。');
      return;
    }
    setMessage('削除中…', '');
    fetch('/api/freight_master/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 地方ID: id })
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

  for (var fi = 0; fi < FORM_INT_IDS.length; fi++) {
    (function (inputEl) {
      if (!inputEl) return;
      inputEl.addEventListener('blur', function () {
        formatFreightInputOnBlur(inputEl);
      });
    })(document.getElementById(FORM_INT_IDS[fi]));
  }

  if (btnSave) {
    btnSave.addEventListener('click', function () {
      if (saveConfirmMsg) {
        var isNew = !elChihoId || !String(elChihoId.value || '').trim();
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
      var id = elChihoId && elChihoId.value.trim();
      var name = elChihoName && elChihoName.value.trim();
      if (!id) {
        alert('削除する行を選ぶか、地方ID を入力してください。');
        return;
      }
      if (deleteConfirmMsg) {
        deleteConfirmMsg.textContent =
          '地方ID:' + id + (name ? ' ' + name : '') + ' を削除しますか？';
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
