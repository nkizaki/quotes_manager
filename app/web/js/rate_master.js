(function () {
  'use strict';

  var COLUMN_HEADER_LABEL = {
    労務費賃率: '労務費率',
    賃率計: '賃率計'
  };

  var NUMERIC_KEYS = ['労務費賃率', '油等賃率', '電気賃率', '設備費賃率', '建屋', '土地'];
  var FORM_NUM_IDS = ['rm-roumu', 'rm-yu', 'rm-denki', 'rm-setsubihi', 'rm-tateya', 'rm-tochi'];

  /** テーブル列・colgroup と対応（rate_master.css の --rm-table-col-* / --rm-form-* と同名スラッグ） */
  var COLUMN_SLUG = {
    ID: 'id',
    工程分類: 'koubun',
    設備名等: 'setsubi',
    労務費賃率: 'roumu',
    油等賃率: 'yu',
    電気賃率: 'denki',
    設備費賃率: 'setsubihi',
    建屋: 'tateya',
    土地: 'tochi',
    賃率計: 'goukei'
  };

  function cellClassForColumn(colName) {
    var slug = COLUMN_SLUG[colName];
    return slug ? 'rm-cell rm-cell--' + slug : 'rm-cell';
  }

  var theadRow = document.getElementById('rate-master-thead-row');
  var tbody = document.getElementById('rate-master-tbody');
  var msgEl = document.getElementById('rate-master-message');

  var elId = document.getElementById('rm-id');
  var elKoubun = document.getElementById('rm-koubun');
  var elSetsubi = document.getElementById('rm-setsubi');
  var elSum = document.getElementById('rm-sum-display');
  var btnSave = document.getElementById('rm-btn-save');
  var btnDelete = document.getElementById('rm-btn-delete');

  var saveConfirmOverlay = document.getElementById('rm-save-confirm-overlay');
  var saveConfirmYes = document.getElementById('rm-save-confirm-yes');
  var saveConfirmNo = document.getElementById('rm-save-confirm-no');
  var saveConfirmMsg = document.getElementById('rm-save-confirm-message');
  var saveDoneOverlay = document.getElementById('rm-save-done-overlay');
  var saveDoneOk = document.getElementById('rm-save-done-ok');
  var deleteConfirmOverlay = document.getElementById('rm-delete-confirm-overlay');
  var deleteConfirmMsg = document.getElementById('rm-delete-confirm-message');
  var deleteConfirmYes = document.getElementById('rm-delete-confirm-yes');
  var deleteConfirmNo = document.getElementById('rm-delete-confirm-no');
  var deleteDoneOverlay = document.getElementById('rm-delete-done-overlay');
  var deleteDoneOk = document.getElementById('rm-delete-done-ok');

  var dataColumns = [];
  var cachedRows = [];

  function headerLabel(colName) {
    if (COLUMN_HEADER_LABEL[colName] != null) {
      return COLUMN_HEADER_LABEL[colName];
    }
    return colName;
  }

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

  function formatRate3(v) {
    if (v === null || v === undefined || v === '') {
      return '';
    }
    var n = Number(String(v).replace(/,/g, ''));
    if (!isFinite(n)) {
      return '';
    }
    return n.toFixed(3);
  }

  function parseNumLoose(s) {
    if (s == null || String(s).trim() === '') {
      return 0;
    }
    var n = Number(String(s).replace(/,/g, ''));
    return isFinite(n) ? n : 0;
  }

  function updateSumDisplay() {
    if (!elSum) return;
    var sum = 0;
    for (var i = 0; i < FORM_NUM_IDS.length; i++) {
      var el = document.getElementById(FORM_NUM_IDS[i]);
      sum += parseNumLoose(el ? el.value : '');
    }
    elSum.value = sum.toFixed(3);
  }

  function clearForm() {
    if (elId) elId.value = '';
    if (elKoubun) elKoubun.value = '';
    if (elSetsubi) elSetsubi.value = '';
    for (var i = 0; i < FORM_NUM_IDS.length; i++) {
      var el = document.getElementById(FORM_NUM_IDS[i]);
      if (el) el.value = '';
    }
    updateSumDisplay();
  }

  function fillFormFromRow(row) {
    if (!row) return;
    if (elId) elId.value = row.ID != null && row.ID !== undefined ? String(row.ID) : '';
    if (elKoubun) elKoubun.value = row['工程分類'] != null ? String(row['工程分類']) : '';
    if (elSetsubi) elSetsubi.value = row['設備名等'] != null ? String(row['設備名等']) : '';
    var map = {
      '労務費賃率': 'rm-roumu',
      '油等賃率': 'rm-yu',
      '電気賃率': 'rm-denki',
      '設備費賃率': 'rm-setsubihi',
      '建屋': 'rm-tateya',
      '土地': 'rm-tochi'
    };
    for (var k in map) {
      var inp = document.getElementById(map[k]);
      if (!inp) continue;
      var v = row[k];
      inp.value = formatRate3(v);
    }
    updateSumDisplay();
  }

  function collectPayload() {
    return {
      ID: elId && elId.value.trim() ? elId.value.trim() : '',
      工程分類: elKoubun ? elKoubun.value : '',
      設備名等: elSetsubi ? elSetsubi.value : '',
      労務費賃率: document.getElementById('rm-roumu') ? document.getElementById('rm-roumu').value : '',
      油等賃率: document.getElementById('rm-yu') ? document.getElementById('rm-yu').value : '',
      電気賃率: document.getElementById('rm-denki') ? document.getElementById('rm-denki').value : '',
      設備費賃率: document.getElementById('rm-setsubihi') ? document.getElementById('rm-setsubihi').value : '',
      建屋: document.getElementById('rm-tateya') ? document.getElementById('rm-tateya').value : '',
      土地: document.getElementById('rm-tochi') ? document.getElementById('rm-tochi').value : ''
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
      th.textContent = headerLabel(dataColumns[i]);
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
          btn.className = 'rate-master-id-btn';
          btn.textContent = v != null && v !== undefined ? String(v) : '';
          btn.setAttribute('data-row-index', String(r));
          td.appendChild(btn);
        } else if (NUMERIC_KEYS.indexOf(col) !== -1 || col === '賃率計') {
          td.textContent = formatRate3(v);
          td.className += ' rate-master-td-num';
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
      var btn = e.target.closest('.rate-master-id-btn');
      if (!btn) return;
      var idx = parseInt(btn.getAttribute('data-row-index') || '', 10);
      if (isNaN(idx) || idx < 0 || idx >= cachedRows.length) return;
      fillFormFromRow(cachedRows[idx]);
      setMessage('ID ' + cachedRows[idx].ID + ' を読み込みました', 'ok');
    });
  }

  function load() {
    setMessage('読み込み中…', '');
    fetch('/api/rate_master')
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
    fetch('/api/rate_master/save', {
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
        if (out.data.inserted && out.data.id != null) {
          if (elId) elId.value = String(out.data.id);
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
    fetch('/api/rate_master/delete', {
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

  function formatNumericBlur(el) {
    if (!el) return;
    var t = el.value.trim();
    if (t === '') return;
    var n = Number(t.replace(/,/g, ''));
    if (!isFinite(n)) return;
    el.value = n.toFixed(3);
    updateSumDisplay();
  }

  for (var fi = 0; fi < FORM_NUM_IDS.length; fi++) {
    (function (inputEl) {
      if (!inputEl) return;
      inputEl.addEventListener('input', updateSumDisplay);
      inputEl.addEventListener('change', updateSumDisplay);
      inputEl.addEventListener('blur', function () {
        formatNumericBlur(inputEl);
      });
    })(document.getElementById(FORM_NUM_IDS[fi]));
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
      var koubun = elKoubun && elKoubun.value.trim();
      var setsubi = elSetsubi && elSetsubi.value.trim();
      if (!id) {
        alert('削除する行を選ぶか、ID を入力してください。');
        return;
      }
      if (deleteConfirmMsg) {
        deleteConfirmMsg.textContent = 'ID:' + id + ' ' + koubun + ' ' + setsubi + ' を削除しますか？';
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
  updateSumDisplay();
  load();
})();
