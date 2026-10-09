(function () {
  'use strict';

  const salesSelect = document.getElementById('sales-select');
  const customerSelect = document.getElementById('customer-select');
  const hinbanInput = document.getElementById('hinban');
  const hinmeiInput = document.getElementById('hinmei');
  const genkaIdInput = document.getElementById('genka-id');
  const orderColSelect = document.getElementById('search-order-col');
  const searchBtn = document.getElementById('search-btn');
  const searchNewBtn = document.getElementById('search-new-btn');
  const searchAggregateBtn = document.getElementById('search-aggregate-btn');
  const searchLoading = document.getElementById('search-loading');
  const subOverlay = document.getElementById('search-subwindow-overlay');
  const subClose = document.getElementById('search-subwindow-close');
  const aggOverlay = document.getElementById('aggregate-subwindow-overlay');
  const aggClose = document.getElementById('aggregate-subwindow-close');
  const aggSalesSelect = document.getElementById('agg-sales-select');
  const aggCustomerSelect = document.getElementById('agg-customer-select');
  const aggDateFromInput = document.getElementById('agg-date-from');
  const aggDateToInput = document.getElementById('agg-date-to');
  const aggregateExportBtn = document.getElementById('aggregate-export-btn');
  const aggExportConfirmOverlay = document.getElementById('aggregate-export-confirm-overlay');
  const aggExportConfirmYes = document.getElementById('aggregate-export-confirm-yes');
  const aggExportConfirmNo = document.getElementById('aggregate-export-confirm-no');
  const aggExportConfirmPanel = aggExportConfirmOverlay
    ? aggExportConfirmOverlay.querySelector('.search-dialog-panel')
    : null;
  const subwindowTitleEl = document.getElementById('search-subwindow-title');
  const footerNew = document.getElementById('search-subwindow-footer-new');
  const footerEdit = document.getElementById('search-subwindow-footer-edit');
  const newSalesSelect = document.getElementById('new-sales-select');
  const newQuoteDateInput = document.getElementById('new-quote-date');
  const newKanriNoInput = document.getElementById('new-kanri-no');
  const newCustomerSelect = document.getElementById('new-customer-select');
  const newHinbanInput = document.getElementById('new-hinban');
  const newHinmeiInput = document.getElementById('new-hinmei');
  const newBikouInput = document.getElementById('new-bikou');
  const newRegisterBtn = document.getElementById('search-new-register-btn');
  const editSaveBtn = document.getElementById('search-edit-save-btn');
  const editDeleteBtn = document.getElementById('search-edit-delete-btn');

  const registerConfirmOverlay = document.getElementById('register-confirm-overlay');
  const registerConfirmYes = document.getElementById('register-confirm-yes');
  const registerConfirmNo = document.getElementById('register-confirm-no');
  const registerConfirmPanel = registerConfirmOverlay
    ? registerConfirmOverlay.querySelector('.search-dialog-panel')
    : null;

  const registerDoneOverlay = document.getElementById('register-done-overlay');
  const registerDoneOk = document.getElementById('register-done-ok');
  const registerDonePanel = registerDoneOverlay
    ? registerDoneOverlay.querySelector('.search-dialog-panel')
    : null;

  const deleteConfirmOverlay = document.getElementById('delete-confirm-overlay');
  const deleteConfirmYes = document.getElementById('delete-confirm-yes');
  const deleteConfirmNo = document.getElementById('delete-confirm-no');
  const deleteConfirmPanel = deleteConfirmOverlay
    ? deleteConfirmOverlay.querySelector('.search-dialog-panel')
    : null;

  const deleteDoneOverlay = document.getElementById('delete-done-overlay');
  const deleteDoneOk = document.getElementById('delete-done-ok');
  const deleteDonePanel = deleteDoneOverlay
    ? deleteDoneOverlay.querySelector('.search-dialog-panel')
    : null;

  const updateConfirmOverlay = document.getElementById('update-confirm-overlay');
  const updateConfirmYes = document.getElementById('update-confirm-yes');
  const updateConfirmNo = document.getElementById('update-confirm-no');
  const updateConfirmPanel = updateConfirmOverlay
    ? updateConfirmOverlay.querySelector('.search-dialog-panel')
    : null;

  const updateDoneOverlay = document.getElementById('update-done-overlay');
  const updateDoneOk = document.getElementById('update-done-ok');
  const updateDonePanel = updateDoneOverlay
    ? updateDoneOverlay.querySelector('.search-dialog-panel')
    : null;

  const alertOverlay = document.getElementById('alert-overlay');
  const alertTitle = document.getElementById('alert-title');
  const alertMessage = document.getElementById('alert-message');
  const alertOk = document.getElementById('alert-ok');
  const alertPanel = alertOverlay
    ? alertOverlay.querySelector('.search-dialog-panel')
    : null;

  const resultMessage = document.getElementById('result-message');
  const resultTbody = document.getElementById('result-tbody');

  let cachedSearchRows = [];
  /** @type {'new'|'edit'} */
  let subwindowMode = 'new';
  /** 編集モーダルで開いている行の原価見積りID（削除 API 用） */
  let editingEstimateId = '';

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  const cols = ['原価見積りID', '管理NO', '営業担当', '客先名', '品番', '品名', '備考'];

  function renderTable(rows) {
    if (!rows || rows.length === 0) {
      resultTbody.innerHTML = '';
      return;
    }
    resultTbody.innerHTML = rows.map((row, rowIdx) => {
      const estimateId = row['原価見積りID'];
      const baseUrl = 'est_calc.html';
      const href = estimateId
        ? baseUrl + '?estimate_id=' + encodeURIComponent(String(estimateId))
        : baseUrl;

      return '<tr>' + cols.map((c, idx) => {
        let v = row[c];
        if (v === null || v === undefined) v = '';
        let cellStr = String(v);
        let bikouTitleAttr = '';
        if (idx === 6) {
          const full = cellStr;
          cellStr = cellStr.split(/\r\n|\r|\n/)[0];
          cellStr = cellStr.replace(/\s+/g, ' ').trim();
          if (String(full).trim() !== '') {
            bikouTitleAttr =
              ' title="' + escapeHtml(String(full)).replace(/"/g, '&quot;') + '"';
          }
        }
        const text = escapeHtml(cellStr);
        if (idx === 0 && estimateId) {
          return (
            '<td><button type="button" class="search-estimate-id-btn" data-row-index="' +
            rowIdx +
            '">' +
            text +
            '</button></td>'
          );
        }
        if ((idx === 4 || idx === 5) && estimateId) {
          return '<td><a href="' + href + '">' + text + '</a></td>';
        }
        if (idx === 6) {
          return '<td class="result-bikou-cell"' + bikouTitleAttr + '>' + text + '</td>';
        }
        return '<td>' + text + '</td>';
      }).join('') + '</tr>';
    }).join('');
  }

  function selectOptionByVisibleText(selectEl, visibleText) {
    if (!selectEl) return;
    const want = String(visibleText || '').trim();
    selectEl.value = '';
    if (!want) return;
    const opts = selectEl.querySelectorAll('option');
    for (let i = 0; i < opts.length; i++) {
      if ((opts[i].textContent || '').trim() === want) {
        selectEl.value = opts[i].value;
        return;
      }
    }
  }

  function displayDateToInput(v) {
    if (v === null || v === undefined || v === '') return '';
    const s = String(v).trim();
    if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(s)) {
      const p = s.split('/');
      return (
        p[0] +
        '-' +
        String(p[1]).padStart(2, '0') +
        '-' +
        String(p[2]).padStart(2, '0')
      );
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return '';
  }

  function fillFormFromSearchRow(row) {
    selectOptionByVisibleText(newSalesSelect, row['営業担当']);
    selectOptionByVisibleText(newCustomerSelect, row['客先名']);
    if (newQuoteDateInput) {
      newQuoteDateInput.value = displayDateToInput(row['見積日']);
    }
    if (newKanriNoInput) {
      const k = row['管理NO'];
      newKanriNoInput.value = k != null && k !== '' ? String(k) : '';
    }
    if (newHinbanInput) {
      const p = row['品番'];
      newHinbanInput.value = p != null && p !== '' ? String(p) : '';
    }
    if (newHinmeiInput) {
      const m = row['品名'];
      newHinmeiInput.value = m != null && m !== '' ? String(m) : '';
    }
    if (newBikouInput) {
      let bik = row['備考'];
      if (bik == null || bik === undefined) bik = '';
      else bik = String(bik).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      newBikouInput.value = bik;
    }
  }

  function prepareSubwindowNew() {
    subwindowMode = 'new';
    editingEstimateId = '';
    if (subwindowTitleEl) subwindowTitleEl.textContent = '新規';
    if (footerNew) footerNew.hidden = false;
    if (footerEdit) footerEdit.hidden = true;
    resetNewForm();
  }

  function prepareSubwindowEdit(row) {
    subwindowMode = 'edit';
    const eid = row['原価見積りID'];
    editingEstimateId =
      eid != null && eid !== '' ? String(eid).trim() : '';
    if (subwindowTitleEl) subwindowTitleEl.textContent = '編集';
    if (footerNew) footerNew.hidden = true;
    if (footerEdit) footerEdit.hidden = false;
    fillFormFromSearchRow(row);
  }

  function openEditSubwindow(row) {
    if (!row) return;
    prepareSubwindowEdit(row);
    openSearchSubwindow();
  }

  function scrollbarWidth() {
    return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
  }

  function openSearchSubwindow() {
    if (!subOverlay) return;
    const pad = scrollbarWidth();
    if (pad > 0) {
      document.body.style.paddingRight = pad + 'px';
    }
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    subOverlay.hidden = false;
    subOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeSearchSubwindow() {
    if (!subOverlay) return;
    subOverlay.hidden = true;
    subOverlay.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    prepareSubwindowNew();
  }

  function openRegisterConfirm() {
    if (!registerConfirmOverlay) return;
    registerConfirmOverlay.hidden = false;
    registerConfirmOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeRegisterConfirm() {
    if (!registerConfirmOverlay) return;
    registerConfirmOverlay.hidden = true;
    registerConfirmOverlay.setAttribute('aria-hidden', 'true');
  }

  function openRegisterDone() {
    if (!registerDoneOverlay) return;
    registerDoneOverlay.hidden = false;
    registerDoneOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeRegisterDone() {
    if (!registerDoneOverlay) return;
    registerDoneOverlay.hidden = true;
    registerDoneOverlay.setAttribute('aria-hidden', 'true');
  }

  function openDeleteConfirm() {
    if (!deleteConfirmOverlay) return;
    deleteConfirmOverlay.hidden = false;
    deleteConfirmOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeDeleteConfirm() {
    if (!deleteConfirmOverlay) return;
    deleteConfirmOverlay.hidden = true;
    deleteConfirmOverlay.setAttribute('aria-hidden', 'true');
  }

  function openDeleteDone() {
    if (!deleteDoneOverlay) return;
    deleteDoneOverlay.hidden = false;
    deleteDoneOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeDeleteDone() {
    if (!deleteDoneOverlay) return;
    deleteDoneOverlay.hidden = true;
    deleteDoneOverlay.setAttribute('aria-hidden', 'true');
  }

  function openUpdateConfirm() {
    if (!updateConfirmOverlay) return;
    updateConfirmOverlay.hidden = false;
    updateConfirmOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeUpdateConfirm() {
    if (!updateConfirmOverlay) return;
    updateConfirmOverlay.hidden = true;
    updateConfirmOverlay.setAttribute('aria-hidden', 'true');
  }

  function openUpdateDone() {
    if (!updateDoneOverlay) return;
    updateDoneOverlay.hidden = false;
    updateDoneOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeUpdateDone() {
    if (!updateDoneOverlay) return;
    updateDoneOverlay.hidden = true;
    updateDoneOverlay.setAttribute('aria-hidden', 'true');
  }

  let alertResolver = null;

  function showAlertModal(message, title) {
    return new Promise(function (resolve) {
      if (!alertOverlay || !alertMessage) {
        window.alert(message);
        resolve();
        return;
      }
      if (alertTitle) alertTitle.textContent = title || '確認';
      alertMessage.style.whiteSpace = 'pre-line';
      alertMessage.textContent = message == null ? '' : String(message);
      alertResolver = resolve;
      alertOverlay.hidden = false;
      alertOverlay.setAttribute('aria-hidden', 'false');
      if (alertOk) {
        setTimeout(function () {
          try {
            alertOk.focus();
          } catch (e) {
            /* ignore */
          }
        }, 0);
      }
    });
  }

  function isXlsxFileInUseError(result) {
    if (!result) return false;
    if (result.error_code === 'file_in_use') return true;
    var msg = String(result.error || '');
    return msg.indexOf('[Errno 13]') >= 0 || msg.indexOf('Errno 13') >= 0;
  }

  var XLSX_FILE_IN_USE_MSG =
    '同じ名前のExcelが開かれているため\n保存に失敗しました';

  function closeAlertModal() {
    if (!alertOverlay) return;
    alertOverlay.hidden = true;
    alertOverlay.setAttribute('aria-hidden', 'true');
    const resolve = alertResolver;
    alertResolver = null;
    if (typeof resolve === 'function') resolve();
  }

  function resetNewForm() {
    if (newSalesSelect) newSalesSelect.value = '';
    if (newQuoteDateInput) newQuoteDateInput.value = '';
    if (newKanriNoInput) newKanriNoInput.value = '';
    if (newCustomerSelect) newCustomerSelect.value = '';
    if (newHinbanInput) newHinbanInput.value = '';
    if (newHinmeiInput) newHinmeiInput.value = '';
    if (newBikouInput) newBikouInput.value = '';
  }

  if (searchNewBtn) {
    searchNewBtn.addEventListener('click', function () {
      prepareSubwindowNew();
      openSearchSubwindow();
    });
  }
  if (subClose) {
    subClose.addEventListener('click', closeSearchSubwindow);
  }

  function resetAggregateForm() {
    if (aggSalesSelect) aggSalesSelect.value = '';
    if (aggCustomerSelect) aggCustomerSelect.value = '';
    if (aggDateFromInput) aggDateFromInput.value = '';
    if (aggDateToInput) aggDateToInput.value = '';
  }

  function openAggregateSubwindow() {
    if (!aggOverlay) return;
    resetAggregateForm();
    aggOverlay.hidden = false;
    aggOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeAggregateSubwindow() {
    if (!aggOverlay) return;
    aggOverlay.hidden = true;
    aggOverlay.setAttribute('aria-hidden', 'true');
  }

  function openAggregateExportConfirm() {
    if (!aggExportConfirmOverlay) return;
    aggExportConfirmOverlay.hidden = false;
    aggExportConfirmOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeAggregateExportConfirm() {
    if (!aggExportConfirmOverlay) return;
    aggExportConfirmOverlay.hidden = true;
    aggExportConfirmOverlay.setAttribute('aria-hidden', 'true');
  }

  function collectAggregateExportPayload() {
    const salesId = aggSalesSelect ? String(aggSalesSelect.value || '').trim() : '';
    let salesName = '';
    if (aggSalesSelect && aggSalesSelect.selectedIndex >= 0) {
      const opt = aggSalesSelect.options[aggSalesSelect.selectedIndex];
      salesName = opt ? String(opt.textContent || '').trim() : '';
    }
    const customerCode = aggCustomerSelect
      ? String(aggCustomerSelect.value || '').trim()
      : '';
    return {
      sales_id: salesId,
      sales_name: salesName,
      customer_code: customerCode,
      date_from: aggDateFromInput ? String(aggDateFromInput.value || '').trim() : '',
      date_to: aggDateToInput ? String(aggDateToInput.value || '').trim() : ''
    };
  }

  async function runAggregateExport() {
    const payload = collectAggregateExportPayload();
    if (!payload.sales_id) {
      await showAlertModal('担当者を選択してください', '確認');
      return;
    }
    openAggregateExportConfirm();
  }

  async function executeAggregateExport() {
    closeAggregateExportConfirm();
    if (typeof window.quotesApi !== 'function') {
      await showAlertModal('API が利用できません');
      return;
    }
    const payload = collectAggregateExportPayload();
    try {
      const result = await window.quotesApi(
        '/api/cost_quote/margin_summary_export_xlsx',
        payload
      );
      if (result && result.cancelled) {
        return;
      }
      if (!result || result.ok !== true) {
        if (isXlsxFileInUseError(result)) {
          await showAlertModal(XLSX_FILE_IN_USE_MSG, '確認');
          return;
        }
        await showAlertModal(
          (result && result.error) || '集計エクスポートに失敗しました'
        );
        return;
      }
      closeAggregateSubwindow();
    } catch (err) {
      var errMsg = err && err.message ? err.message : String(err);
      if (String(errMsg).indexOf('Errno 13') >= 0) {
        await showAlertModal(XLSX_FILE_IN_USE_MSG, '確認');
        return;
      }
      await showAlertModal('通信エラー: ' + errMsg);
    }
  }

  if (searchAggregateBtn) {
    searchAggregateBtn.addEventListener('click', function () {
      openAggregateSubwindow();
    });
  }
  if (aggClose) {
    aggClose.addEventListener('click', closeAggregateSubwindow);
  }
  if (aggOverlay) {
    aggOverlay.addEventListener('click', function (e) {
      if (e.target === aggOverlay) closeAggregateSubwindow();
    });
  }
  if (aggregateExportBtn) {
    aggregateExportBtn.addEventListener('click', function () {
      void runAggregateExport();
    });
  }
  if (aggExportConfirmYes) {
    aggExportConfirmYes.addEventListener('click', function () {
      void executeAggregateExport();
    });
  }
  if (aggExportConfirmNo) {
    aggExportConfirmNo.addEventListener('click', closeAggregateExportConfirm);
  }
  if (aggExportConfirmOverlay) {
    aggExportConfirmOverlay.addEventListener('click', function (e) {
      if (e.target === aggExportConfirmOverlay) closeAggregateExportConfirm();
    });
  }
  if (aggExportConfirmPanel) {
    aggExportConfirmPanel.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }

  if (resultTbody) {
    resultTbody.addEventListener('click', function (e) {
      const btn = e.target.closest('.search-estimate-id-btn');
      if (!btn) return;
      e.preventDefault();
      const idx = parseInt(btn.getAttribute('data-row-index') || '', 10);
      if (Number.isNaN(idx) || idx < 0 || idx >= cachedSearchRows.length) return;
      openEditSubwindow(cachedSearchRows[idx]);
    });
  }

  if (registerConfirmOverlay) {
    registerConfirmOverlay.addEventListener('click', function (e) {
      if (e.target === registerConfirmOverlay) closeRegisterConfirm();
    });
  }
  if (registerConfirmPanel) {
    registerConfirmPanel.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }
  if (registerDoneOverlay) {
    registerDoneOverlay.addEventListener('click', function (e) {
      if (e.target === registerDoneOverlay) finishRegisterDoneOk();
    });
  }
  if (registerDonePanel) {
    registerDonePanel.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }

  if (deleteConfirmOverlay) {
    deleteConfirmOverlay.addEventListener('click', function (e) {
      if (e.target === deleteConfirmOverlay) closeDeleteConfirm();
    });
  }
  if (deleteConfirmPanel) {
    deleteConfirmPanel.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }
  if (deleteDoneOverlay) {
    deleteDoneOverlay.addEventListener('click', function (e) {
      if (e.target === deleteDoneOverlay) finishDeleteDoneOk();
    });
  }
  if (deleteDonePanel) {
    deleteDonePanel.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }

  if (updateConfirmOverlay) {
    updateConfirmOverlay.addEventListener('click', function (e) {
      if (e.target === updateConfirmOverlay) closeUpdateConfirm();
    });
  }
  if (updateConfirmPanel) {
    updateConfirmPanel.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }
  if (updateDoneOverlay) {
    updateDoneOverlay.addEventListener('click', function (e) {
      if (e.target === updateDoneOverlay) finishUpdateDoneOk();
    });
  }
  if (updateDonePanel) {
    updateDonePanel.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }
  if (alertOverlay) {
    alertOverlay.addEventListener('click', function (e) {
      if (e.target === alertOverlay) closeAlertModal();
    });
  }
  if (alertPanel) {
    alertPanel.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }
  if (alertOk) {
    alertOk.addEventListener('click', closeAlertModal);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (alertOverlay && !alertOverlay.hidden) {
      e.preventDefault();
      closeAlertModal();
      return;
    }
    if (updateDoneOverlay && !updateDoneOverlay.hidden) {
      e.preventDefault();
      finishUpdateDoneOk();
      return;
    }
    if (updateConfirmOverlay && !updateConfirmOverlay.hidden) {
      e.preventDefault();
      closeUpdateConfirm();
      return;
    }
    if (deleteDoneOverlay && !deleteDoneOverlay.hidden) {
      e.preventDefault();
      finishDeleteDoneOk();
      return;
    }
    if (deleteConfirmOverlay && !deleteConfirmOverlay.hidden) {
      e.preventDefault();
      closeDeleteConfirm();
      return;
    }
    if (registerDoneOverlay && !registerDoneOverlay.hidden) {
      e.preventDefault();
      finishRegisterDoneOk();
      return;
    }
    if (registerConfirmOverlay && !registerConfirmOverlay.hidden) {
      e.preventDefault();
      closeRegisterConfirm();
      return;
    }
    if (aggExportConfirmOverlay && !aggExportConfirmOverlay.hidden) {
      e.preventDefault();
      closeAggregateExportConfirm();
      return;
    }
    if (aggOverlay && !aggOverlay.hidden) {
      e.preventDefault();
      closeAggregateSubwindow();
      return;
    }
    if (subOverlay && !subOverlay.hidden) {
      closeSearchSubwindow();
    }
  });

  function validateNewRegisterForm() {
    const missing = [];
    if (!newSalesSelect || !String(newSalesSelect.value || '').trim()) {
      missing.push('営業担当');
    }
    if (!newQuoteDateInput || !String(newQuoteDateInput.value || '').trim()) {
      missing.push('見積日');
    }
    if (!newKanriNoInput || !String(newKanriNoInput.value || '').trim()) {
      missing.push('管理NO');
    }
    if (!newCustomerSelect || !String(newCustomerSelect.value || '').trim()) {
      missing.push('客先名');
    }
    if (!newHinbanInput || !String(newHinbanInput.value || '').trim()) {
      missing.push('品番');
    }
    if (missing.length > 0) {
      void showAlertModal('必須項目を入力してください。\n\n・' + missing.join('\n・'));
      return false;
    }
    return true;
  }

  function collectEstimateFormPayload(extra) {
    const payload = {
      sales_id: newSalesSelect ? newSalesSelect.value.trim() : '',
      quote_date: newQuoteDateInput ? newQuoteDateInput.value.trim() : '',
      kanri_no: newKanriNoInput ? newKanriNoInput.value.trim() : '',
      customer_code: newCustomerSelect ? newCustomerSelect.value.trim() : '',
      part_no: newHinbanInput ? newHinbanInput.value.trim() : '',
      part_name: newHinmeiInput ? newHinmeiInput.value.trim() : '',
      bikou: newBikouInput ? newBikouInput.value.trim() : ''
    };
    if (extra && typeof extra === 'object') {
      Object.keys(extra).forEach(function (k) {
        payload[k] = extra[k];
      });
    }
    return payload;
  }

  function finishRegisterDoneOk() {
    closeRegisterDone();
    closeSearchSubwindow();
    resetNewForm();
  }

  if (registerConfirmNo) {
    registerConfirmNo.addEventListener('click', closeRegisterConfirm);
  }

  if (registerConfirmYes) {
    registerConfirmYes.addEventListener('click', function () {
      const payload = collectEstimateFormPayload();

      closeRegisterConfirm();

      fetch('/api/register_estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.text().then(function (text) {
            let data = {};
            if (text) {
              try {
                data = JSON.parse(text);
              } catch (e) {
                data = { error: 'サーバーの応答を解釈できませんでした' };
              }
            }
            return { ok: res.ok, data: data };
          });
        })
        .then(function (out) {
          if (!out.ok || out.data.error) {
            void showAlertModal(out.data.error || '登録に失敗しました');
            return;
          }
          const row = out.data.row;
          if (!row || typeof row !== 'object') {
            void showAlertModal('登録は完了しましたが、検索結果用のデータを取得できませんでした。');
            return;
          }
          cachedSearchRows = [row];
          renderTable(cachedSearchRows);
          resultMessage.textContent = '検索結果：1 件（登録直後）';
          openRegisterDone();
        })
        .catch(function (err) {
          void showAlertModal('通信エラー: ' + err.message);
        });
    });
  }

  if (registerDoneOk) {
    registerDoneOk.addEventListener('click', finishRegisterDoneOk);
  }

  function onNewRegisterClick() {
    if (subwindowMode !== 'new') return;
    if (!validateNewRegisterForm()) return;
    openRegisterConfirm();
  }

  if (newRegisterBtn) {
    newRegisterBtn.addEventListener('click', onNewRegisterClick);
  }

  function onEditSaveClick() {
    if (subwindowMode !== 'edit') return;
    if (!editingEstimateId) {
      void showAlertModal('原価見積りIDがありません');
      return;
    }
    if (!validateNewRegisterForm()) return;
    openUpdateConfirm();
  }

  if (editSaveBtn) {
    editSaveBtn.addEventListener('click', onEditSaveClick);
  }

  if (updateConfirmNo) {
    updateConfirmNo.addEventListener('click', closeUpdateConfirm);
  }

  if (updateConfirmYes) {
    updateConfirmYes.addEventListener('click', function () {
      const eid = editingEstimateId;
      closeUpdateConfirm();
      if (!eid) {
        void showAlertModal('原価見積りIDがありません');
        return;
      }

      const payload = collectEstimateFormPayload({ estimate_id: eid });

      fetch('/api/update_estimate_history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.text().then(function (text) {
            let data = {};
            if (text) {
              try {
                data = JSON.parse(text);
              } catch (err) {
                data = { error: 'サーバーの応答を解釈できませんでした' };
              }
            }
            return { ok: res.ok, data: data };
          });
        })
        .then(function (out) {
          if (!out.ok || out.data.error) {
            void showAlertModal(out.data.error || '更新に失敗しました');
            return;
          }
          const row = out.data.row;
          if (!row || typeof row !== 'object') {
            void showAlertModal('更新は完了しましたが、検索結果用のデータを取得できませんでした。');
            openUpdateDone();
            return;
          }
          const idx = cachedSearchRows.findIndex(function (r) {
            return String(r['原価見積りID']) === String(eid);
          });
          if (idx >= 0) {
            cachedSearchRows[idx] = row;
          } else {
            cachedSearchRows.push(row);
          }
          renderTable(cachedSearchRows);
          resultMessage.textContent = '検索結果：' + cachedSearchRows.length + ' 件';
          openUpdateDone();
        })
        .catch(function (err) {
          void showAlertModal('通信エラー: ' + err.message);
        });
    });
  }

  function finishUpdateDoneOk() {
    closeUpdateDone();
    closeSearchSubwindow();
  }

  if (updateDoneOk) {
    updateDoneOk.addEventListener('click', finishUpdateDoneOk);
  }

  if (deleteConfirmNo) {
    deleteConfirmNo.addEventListener('click', closeDeleteConfirm);
  }

  if (deleteConfirmYes) {
    deleteConfirmYes.addEventListener('click', function () {
      const eid = editingEstimateId;
      closeDeleteConfirm();
      if (!eid) {
        void showAlertModal('原価見積りIDがありません');
        return;
      }
      fetch('/api/search_delete_estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimate_id: eid })
      })
        .then(function (res) {
          return res.text().then(function (text) {
            let data = {};
            if (text) {
              try {
                data = JSON.parse(text);
              } catch (err) {
                data = { error: 'サーバーの応答を解釈できませんでした' };
              }
            }
            return { ok: res.ok, data: data };
          });
        })
        .then(function (out) {
          if (!out.ok || out.data.error) {
            void showAlertModal(out.data.error || '削除に失敗しました');
            return;
          }
          openDeleteDone();
        })
        .catch(function (err) {
          void showAlertModal('通信エラー: ' + err.message);
        });
    });
  }

  function finishDeleteDoneOk() {
    closeDeleteDone();
    closeSearchSubwindow();
    refreshSearchResults();
  }

  if (deleteDoneOk) {
    deleteDoneOk.addEventListener('click', finishDeleteDoneOk);
  }

  if (editDeleteBtn) {
    editDeleteBtn.addEventListener('click', function () {
      if (subwindowMode !== 'edit') return;
      if (!editingEstimateId) {
        void showAlertModal('原価見積りIDがありません');
        return;
      }
      openDeleteConfirm();
    });
  }

  function setSearchLoading(loading) {
    if (searchLoading) searchLoading.hidden = !loading;
    if (searchBtn) searchBtn.disabled = Boolean(loading);
  }

  function setResultMessage(text) {
    if (!resultMessage) return;
    resultMessage.textContent = text;
  }

  function getOrderDir() {
    const checked = document.querySelector('input[name="search-order-dir"]:checked');
    return checked && checked.value === 'desc' ? 'desc' : 'asc';
  }

  function setOrderDir(dir) {
    const value = dir === 'desc' ? 'desc' : 'asc';
    document.querySelectorAll('input[name="search-order-dir"]').forEach(function (radio) {
      radio.checked = radio.value === value;
    });
  }

  function collectSearchPrefs() {
    return {
      sales_id: salesSelect ? salesSelect.value.trim() : '',
      customer_code: customerSelect ? customerSelect.value.trim() : '',
      part_no: hinbanInput ? hinbanInput.value.trim() : '',
      part_name: hinmeiInput ? hinmeiInput.value.trim() : '',
      estimate_id: genkaIdInput ? genkaIdInput.value.trim() : '',
      order_by: orderColSelect ? (orderColSelect.value.trim() || '原価見積りID') : '原価見積りID',
      order_dir: getOrderDir(),
    };
  }

  function applySearchPrefs(prefs) {
    if (!prefs || typeof prefs !== 'object') return;
    if (salesSelect && prefs.sales_id != null) salesSelect.value = String(prefs.sales_id);
    if (customerSelect && prefs.customer_code != null) {
      customerSelect.value = String(prefs.customer_code);
    }
    if (hinbanInput && prefs.part_no != null) hinbanInput.value = String(prefs.part_no);
    if (hinmeiInput && prefs.part_name != null) hinmeiInput.value = String(prefs.part_name);
    if (genkaIdInput && prefs.estimate_id != null) genkaIdInput.value = String(prefs.estimate_id);
    if (orderColSelect && prefs.order_by) {
      orderColSelect.value = String(prefs.order_by);
      if (orderColSelect.value !== String(prefs.order_by)) {
        orderColSelect.value = '原価見積りID';
      }
    }
    setOrderDir(prefs.order_dir);
  }

  function saveSearchPrefs() {
    if (typeof window.quotesApi !== 'function') return Promise.resolve();
    return window
      .quotesApi('/api/config/search-prefs-set', {
        kind: 'cost_quote',
        prefs: collectSearchPrefs(),
      })
      .catch(function (err) {
        console.error(err);
      });
  }

  /** 画面上部の条件で検索し直す（削除後の更新用。条件なしは 0 件表示） */
  function refreshSearchResults() {
    const prefs = collectSearchPrefs();
    const salesId = prefs.sales_id;
    const customerCode = prefs.customer_code;
    const partNo = prefs.part_no;
    const partName = prefs.part_name;
    const estimateId = prefs.estimate_id;

    if (!salesId && !customerCode && !partNo && !partName && !estimateId) {
      cachedSearchRows = [];
      renderTable(cachedSearchRows);
      setSearchLoading(false);
      setResultMessage('検索結果：0 件');
      return;
    }

    const params = new URLSearchParams();
    if (salesId) params.append('sales_id', salesId);
    if (customerCode) params.append('customer_code', customerCode);
    if (partNo) params.append('part_no', partNo);
    if (partName) params.append('part_name', partName);
    if (estimateId) params.append('estimate_id', estimateId);
    params.append('order_by', prefs.order_by);
    params.append('order_dir', prefs.order_dir);

    setResultMessage('検索結果：検索中...');
    setSearchLoading(true);

    fetch('/api/search_conditions?' + params.toString())
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          void showAlertModal(data.error);
          setResultMessage('検索結果：');
          return;
        }
        cachedSearchRows = data.rows ? data.rows.slice() : [];
        setResultMessage('検索結果：' + cachedSearchRows.length + ' 件');
        renderTable(cachedSearchRows);
        void saveSearchPrefs();
      })
      .catch(err => {
        void showAlertModal('通信エラー: ' + err.message);
        setResultMessage('検索結果：');
      })
      .finally(function () {
        setSearchLoading(false);
      });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', function () {
      const prefs = collectSearchPrefs();
      if (
        !prefs.sales_id &&
        !prefs.customer_code &&
        !prefs.part_no &&
        !prefs.part_name &&
        !prefs.estimate_id
      ) {
        void showAlertModal('条件を最低1つ指定してください');
        return;
      }
      refreshSearchResults();
    });
  }

  prepareSubwindowNew();

  (async function restoreSearchPrefs() {
    try {
      if (typeof window.quotesApi !== 'function') return;
      const prefsRes = await window.quotesApi('/api/config/search-prefs-get', {
        kind: 'cost_quote',
      });
      if (prefsRes && prefsRes.has_prefs && prefsRes.prefs) {
        applySearchPrefs(prefsRes.prefs);
        refreshSearchResults();
      }
    } catch (err) {
      console.error(err);
    }
  })();
})();
