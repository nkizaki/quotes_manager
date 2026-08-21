(function () {
  'use strict';

  const salesSelect = document.getElementById('sales-select');
  const customerSelect = document.getElementById('customer-select');
  const hinbanInput = document.getElementById('hinban');
  const hinmeiInput = document.getElementById('hinmei');
  const genkaIdInput = document.getElementById('genka-id');
  const searchBtn = document.getElementById('search-btn');
  const searchNewBtn = document.getElementById('search-new-btn');
  const searchLoading = document.getElementById('search-loading');
  const subOverlay = document.getElementById('search-subwindow-overlay');
  const subClose = document.getElementById('search-subwindow-close');
  const subwindowTitleEl = document.getElementById('search-subwindow-title');
  const footerNew = document.getElementById('search-subwindow-footer-new');
  const footerEdit = document.getElementById('search-subwindow-footer-edit');
  const newSalesSelect = document.getElementById('new-sales-select');
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

  function fillFormFromSearchRow(row) {
    selectOptionByVisibleText(newSalesSelect, row['営業担当']);
    selectOptionByVisibleText(newCustomerSelect, row['客先名']);
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
    if (subOverlay && !subOverlay.hidden) {
      closeSearchSubwindow();
    }
  });

  function validateNewRegisterForm() {
    const missing = [];
    if (!newSalesSelect || !String(newSalesSelect.value || '').trim()) {
      missing.push('営業担当');
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
      alert('必須項目を入力してください。\n\n・' + missing.join('\n・'));
      return false;
    }
    return true;
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
      const payload = {
        sales_id: newSalesSelect ? newSalesSelect.value.trim() : '',
        kanri_no: newKanriNoInput ? newKanriNoInput.value.trim() : '',
        customer_code: newCustomerSelect ? newCustomerSelect.value.trim() : '',
        part_no: newHinbanInput ? newHinbanInput.value.trim() : '',
        part_name: newHinmeiInput ? newHinmeiInput.value.trim() : '',
        bikou: newBikouInput ? newBikouInput.value.trim() : ''
      };

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
            alert(out.data.error || '登録に失敗しました');
            return;
          }
          const row = out.data.row;
          if (!row || typeof row !== 'object') {
            alert('登録は完了しましたが、検索結果用のデータを取得できませんでした。');
            return;
          }
          cachedSearchRows = [row];
          renderTable(cachedSearchRows);
          resultMessage.textContent = '検索結果：1 件（登録直後）';
          openRegisterDone();
        })
        .catch(function (err) {
          alert('通信エラー: ' + err.message);
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
      alert('原価見積りIDがありません');
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
        alert('原価見積りIDがありません');
        return;
      }

      const payload = {
        estimate_id: eid,
        sales_id: newSalesSelect ? newSalesSelect.value.trim() : '',
        kanri_no: newKanriNoInput ? newKanriNoInput.value.trim() : '',
        customer_code: newCustomerSelect ? newCustomerSelect.value.trim() : '',
        part_no: newHinbanInput ? newHinbanInput.value.trim() : '',
        part_name: newHinmeiInput ? newHinmeiInput.value.trim() : '',
        bikou: newBikouInput ? newBikouInput.value.trim() : ''
      };

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
            alert(out.data.error || '更新に失敗しました');
            return;
          }
          const row = out.data.row;
          if (!row || typeof row !== 'object') {
            alert('更新は完了しましたが、検索結果用のデータを取得できませんでした。');
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
          alert('通信エラー: ' + err.message);
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
        alert('原価見積りIDがありません');
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
            alert(out.data.error || '削除に失敗しました');
            return;
          }
          openDeleteDone();
        })
        .catch(function (err) {
          alert('通信エラー: ' + err.message);
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
        alert('原価見積りIDがありません');
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

  /** 画面上部の条件で検索し直す（削除後の更新用。条件なしは 0 件表示） */
  function refreshSearchResults() {
    const salesId = salesSelect.value.trim();
    const customerCode = customerSelect.value.trim();
    const partNo = hinbanInput.value.trim();
    const partName = hinmeiInput.value.trim();
    const estimateId = genkaIdInput.value.trim();

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

    setResultMessage('検索結果：検索中...');
    setSearchLoading(true);

    fetch('/api/search_conditions?' + params.toString())
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          alert(data.error);
          setResultMessage('検索結果：');
          return;
        }
        cachedSearchRows = data.rows ? data.rows.slice() : [];
        setResultMessage('検索結果：' + cachedSearchRows.length + ' 件');
        renderTable(cachedSearchRows);
      })
      .catch(err => {
        alert('通信エラー: ' + err.message);
        setResultMessage('検索結果：');
      })
      .finally(function () {
        setSearchLoading(false);
      });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', function () {
      const salesId = salesSelect.value.trim();
      const customerCode = customerSelect.value.trim();
      const partNo = hinbanInput.value.trim();
      const partName = hinmeiInput.value.trim();
      const estimateId = genkaIdInput.value.trim();

      if (!salesId && !customerCode && !partNo && !partName && !estimateId) {
        void showAlertModal('条件を最低1つ指定してください');
        return;
      }
      refreshSearchResults();
    });
  }

  prepareSubwindowNew();
})();
