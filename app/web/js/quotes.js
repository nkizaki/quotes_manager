(function () {
  "use strict";

  var salesSelect = document.getElementById("sales-select");
  var customerSelect = document.getElementById("customer-select");
  var hinbanInput = document.getElementById("hinban");
  var hinmeiInput = document.getElementById("hinmei");
  var quoteIdInput = document.getElementById("quote-id");
  var searchBtn = document.getElementById("search-btn");
  var searchNewBtn = document.getElementById("search-new-btn");
  var searchLoading = document.getElementById("search-loading");
  var resultMessage = document.getElementById("result-message");
  var resultTbody = document.getElementById("result-tbody");

  var subOverlay = document.getElementById("search-subwindow-overlay");
  var subClose = document.getElementById("search-subwindow-close");
  var subwindowTitleEl = document.getElementById("search-subwindow-title");
  var footerNew = document.getElementById("search-subwindow-footer-new");
  var footerEdit = document.getElementById("search-subwindow-footer-edit");
  var newSalesSelect = document.getElementById("new-sales-select");
  var newRequestDateInput = document.getElementById("new-request-date");
  var newKanriNoInput = document.getElementById("new-kanri-no");
  var newCustomerSelect = document.getElementById("new-customer-select");
  var newDepartmentInput = document.getElementById("new-department");
  var newContactInput = document.getElementById("new-contact");
  var newHinbanInput = document.getElementById("new-hinban");
  var newHinmeiInput = document.getElementById("new-hinmei");
  var newSubmissionDateInput = document.getElementById("new-submission-date");
  var newBikouInput = document.getElementById("new-bikou");
  var newRegisterBtn = document.getElementById("search-new-register-btn");
  var editSaveBtn = document.getElementById("search-edit-save-btn");
  var editDeleteBtn = document.getElementById("search-edit-delete-btn");

  var registerConfirmOverlay = document.getElementById("register-confirm-overlay");
  var registerConfirmYes = document.getElementById("register-confirm-yes");
  var registerConfirmNo = document.getElementById("register-confirm-no");
  var registerConfirmPanel = registerConfirmOverlay
    ? registerConfirmOverlay.querySelector(".search-dialog-panel")
    : null;
  var registerDoneOverlay = document.getElementById("register-done-overlay");
  var registerDoneOk = document.getElementById("register-done-ok");
  var registerDonePanel = registerDoneOverlay
    ? registerDoneOverlay.querySelector(".search-dialog-panel")
    : null;

  var updateConfirmOverlay = document.getElementById("update-confirm-overlay");
  var updateConfirmYes = document.getElementById("update-confirm-yes");
  var updateConfirmNo = document.getElementById("update-confirm-no");
  var updateConfirmPanel = updateConfirmOverlay
    ? updateConfirmOverlay.querySelector(".search-dialog-panel")
    : null;
  var updateDoneOverlay = document.getElementById("update-done-overlay");
  var updateDoneOk = document.getElementById("update-done-ok");
  var updateDonePanel = updateDoneOverlay
    ? updateDoneOverlay.querySelector(".search-dialog-panel")
    : null;

  var alertOverlay = document.getElementById("alert-overlay");
  var alertTitle = document.getElementById("alert-title");
  var alertMessage = document.getElementById("alert-message");
  var alertOk = document.getElementById("alert-ok");
  var alertPanel = alertOverlay
    ? alertOverlay.querySelector(".search-dialog-panel")
    : null;
  var alertResolver = null;

  var cachedSearchRows = [];
  var subwindowMode = "new";
  var editingQuoteId = "";
  var cols = [
    "見積りID",
    "管理NO",
    "営業担当",
    "客先名",
    "客先部署",
    "客先担当者",
    "品番",
    "品名",
    "依頼日",
    "提出日",
    "備考",
  ];

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function displayDateToInput(v) {
    if (v === null || v === undefined || v === "") return "";
    var s = String(v).trim();
    if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(s)) {
      var p = s.split("/");
      return (
        p[0] +
        "-" +
        String(p[1]).padStart(2, "0") +
        "-" +
        String(p[2]).padStart(2, "0")
      );
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return "";
  }

  function inputDateToPayload(v) {
    if (!v) return "";
    return String(v).trim();
  }

  function showAlertModal(message, title) {
    return new Promise(function (resolve) {
      if (!alertOverlay || !alertMessage) {
        window.alert(message);
        resolve();
        return;
      }
      if (alertTitle) alertTitle.textContent = title || "確認";
      alertMessage.textContent = message == null ? "" : String(message);
      alertResolver = resolve;
      alertOverlay.hidden = false;
      alertOverlay.setAttribute("aria-hidden", "false");
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
    alertOverlay.setAttribute("aria-hidden", "true");
    var resolve = alertResolver;
    alertResolver = null;
    if (typeof resolve === "function") resolve();
  }

  function setSearchLoading(loading) {
    if (searchLoading) searchLoading.hidden = !loading;
    if (searchBtn) searchBtn.disabled = Boolean(loading);
  }

  function setResultMessage(text) {
    if (resultMessage) resultMessage.textContent = text;
  }

  function fillSelect(sel, items) {
    if (!sel) return;
    sel.innerHTML = "";
    var empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "選択してください";
    sel.appendChild(empty);
    (items || []).forEach(function (item) {
      var opt = document.createElement("option");
      opt.value = item.code == null ? "" : String(item.code);
      opt.textContent = item.name == null ? "" : String(item.name);
      sel.appendChild(opt);
    });
  }

  function selectOptionByVisibleText(selectEl, visibleText) {
    if (!selectEl) return;
    var want = String(visibleText || "").trim();
    selectEl.value = "";
    if (!want) return;
    var opts = selectEl.querySelectorAll("option");
    for (var i = 0; i < opts.length; i++) {
      if ((opts[i].textContent || "").trim() === want) {
        selectEl.value = opts[i].value;
        return;
      }
    }
  }

  function resetNewForm() {
    if (newSalesSelect) newSalesSelect.value = "";
    if (newRequestDateInput) newRequestDateInput.value = "";
    if (newKanriNoInput) newKanriNoInput.value = "";
    if (newCustomerSelect) newCustomerSelect.value = "";
    if (newDepartmentInput) newDepartmentInput.value = "";
    if (newContactInput) newContactInput.value = "";
    if (newHinbanInput) newHinbanInput.value = "";
    if (newHinmeiInput) newHinmeiInput.value = "";
    if (newSubmissionDateInput) newSubmissionDateInput.value = "";
    if (newBikouInput) newBikouInput.value = "";
  }

  function fillFormFromSearchRow(row) {
    selectOptionByVisibleText(newSalesSelect, row["営業担当"]);
    selectOptionByVisibleText(newCustomerSelect, row["客先名"]);
    if (newKanriNoInput) {
      var k = row["管理NO"];
      newKanriNoInput.value = k != null && k !== "" ? String(k) : "";
    }
    if (newDepartmentInput) {
      var d = row["客先部署"];
      newDepartmentInput.value = d != null && d !== "" ? String(d) : "";
    }
    if (newContactInput) {
      var c = row["客先担当者"];
      newContactInput.value = c != null && c !== "" ? String(c) : "";
    }
    if (newHinbanInput) {
      var p = row["品番"];
      newHinbanInput.value = p != null && p !== "" ? String(p) : "";
    }
    if (newHinmeiInput) {
      var m = row["品名"];
      newHinmeiInput.value = m != null && m !== "" ? String(m) : "";
    }
    if (newRequestDateInput) {
      newRequestDateInput.value = displayDateToInput(row["依頼日"]);
    }
    if (newSubmissionDateInput) {
      newSubmissionDateInput.value = displayDateToInput(row["提出日"]);
    }
    if (newBikouInput) {
      var bik = row["備考"];
      if (bik == null || bik === undefined) bik = "";
      else bik = String(bik).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      newBikouInput.value = bik;
    }
  }

  function collectFormPayload() {
    return {
      sales_id: newSalesSelect ? newSalesSelect.value.trim() : "",
      kanri_no: newKanriNoInput ? newKanriNoInput.value.trim() : "",
      customer_code: newCustomerSelect ? newCustomerSelect.value.trim() : "",
      department: newDepartmentInput ? newDepartmentInput.value.trim() : "",
      contact: newContactInput ? newContactInput.value.trim() : "",
      part_no: newHinbanInput ? newHinbanInput.value.trim() : "",
      part_name: newHinmeiInput ? newHinmeiInput.value.trim() : "",
      request_date: inputDateToPayload(
        newRequestDateInput ? newRequestDateInput.value : ""
      ),
      submission_date: inputDateToPayload(
        newSubmissionDateInput ? newSubmissionDateInput.value : ""
      ),
      bikou: newBikouInput ? newBikouInput.value : "",
    };
  }

  function prepareSubwindowNew() {
    subwindowMode = "new";
    editingQuoteId = "";
    if (subwindowTitleEl) subwindowTitleEl.textContent = "新規";
    if (footerNew) footerNew.hidden = false;
    if (footerEdit) footerEdit.hidden = true;
    resetNewForm();
  }

  function prepareSubwindowEdit(row) {
    subwindowMode = "edit";
    var qid = row["見積りID"];
    editingQuoteId = qid != null && qid !== "" ? String(qid).trim() : "";
    if (subwindowTitleEl) subwindowTitleEl.textContent = "編集";
    if (footerNew) footerNew.hidden = true;
    if (footerEdit) footerEdit.hidden = false;
    fillFormFromSearchRow(row);
  }

  function scrollbarWidth() {
    return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
  }

  function openSearchSubwindow() {
    if (!subOverlay) return;
    var pad = scrollbarWidth();
    if (pad > 0) document.body.style.paddingRight = pad + "px";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    subOverlay.hidden = false;
    subOverlay.setAttribute("aria-hidden", "false");
  }

  function closeSearchSubwindow() {
    if (!subOverlay) return;
    subOverlay.hidden = true;
    subOverlay.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
    prepareSubwindowNew();
  }

  function openRegisterConfirm() {
    if (!registerConfirmOverlay) return;
    registerConfirmOverlay.hidden = false;
    registerConfirmOverlay.setAttribute("aria-hidden", "false");
  }

  function closeRegisterConfirm() {
    if (!registerConfirmOverlay) return;
    registerConfirmOverlay.hidden = true;
    registerConfirmOverlay.setAttribute("aria-hidden", "true");
  }

  function openRegisterDone() {
    if (!registerDoneOverlay) return;
    registerDoneOverlay.hidden = false;
    registerDoneOverlay.setAttribute("aria-hidden", "false");
  }

  function closeRegisterDone() {
    if (!registerDoneOverlay) return;
    registerDoneOverlay.hidden = true;
    registerDoneOverlay.setAttribute("aria-hidden", "true");
  }

  function openUpdateConfirm() {
    if (!updateConfirmOverlay) return;
    updateConfirmOverlay.hidden = false;
    updateConfirmOverlay.setAttribute("aria-hidden", "false");
  }

  function closeUpdateConfirm() {
    if (!updateConfirmOverlay) return;
    updateConfirmOverlay.hidden = true;
    updateConfirmOverlay.setAttribute("aria-hidden", "true");
  }

  function openUpdateDone() {
    if (!updateDoneOverlay) return;
    updateDoneOverlay.hidden = false;
    updateDoneOverlay.setAttribute("aria-hidden", "false");
  }

  function closeUpdateDone() {
    if (!updateDoneOverlay) return;
    updateDoneOverlay.hidden = true;
    updateDoneOverlay.setAttribute("aria-hidden", "true");
  }

  function validateForm() {
    var missing = [];
    if (!newSalesSelect || !String(newSalesSelect.value || "").trim()) {
      missing.push("営業担当");
    }
    if (!newKanriNoInput || !String(newKanriNoInput.value || "").trim()) {
      missing.push("管理NO");
    }
    if (!newCustomerSelect || !String(newCustomerSelect.value || "").trim()) {
      missing.push("客先名");
    }
    if (!newHinbanInput || !String(newHinbanInput.value || "").trim()) {
      missing.push("品番");
    }
    if (missing.length > 0) {
      void showAlertModal("必須項目を入力してください。\n\n・" + missing.join("\n・"));
      return false;
    }
    return true;
  }

  function parseJsonResponse(res) {
    return res.text().then(function (text) {
      var data = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = { error: "サーバーの応答を解釈できませんでした" };
        }
      }
      return { ok: res.ok, data: data };
    });
  }

  function renderTable(rows) {
    if (!resultTbody) return;
    if (!rows || rows.length === 0) {
      resultTbody.innerHTML = "";
      return;
    }
    resultTbody.innerHTML = rows
      .map(function (row, rowIdx) {
        var quoteId = row["見積りID"];
        var baseUrl = "quote_calc.html";
        var href = quoteId
          ? baseUrl + "?quote_id=" + encodeURIComponent(String(quoteId))
          : baseUrl;

        return (
          "<tr>" +
          cols
            .map(function (c) {
              var v = row[c];
              if (v === null || v === undefined) v = "";
              var cellStr = String(v);
              var titleAttr = "";
              var cellClass = "";
              if (c === "備考") {
                cellClass = ' class="result-bikou-cell"';
                var full = cellStr;
                cellStr = cellStr.split(/\r\n|\r|\n/)[0];
                cellStr = cellStr.replace(/\s+/g, " ").trim();
                if (String(full).trim() !== "") {
                  titleAttr =
                    ' title="' +
                    escapeHtml(String(full)).replace(/"/g, "&quot;") +
                    '"';
                }
              }
              var text = escapeHtml(cellStr);
              if (c === "見積りID" && quoteId) {
                return (
                  '<td><button type="button" class="search-estimate-id-btn" data-row-index="' +
                  rowIdx +
                  '">' +
                  text +
                  "</button></td>"
                );
              }
              if (c === "品名" && quoteId) {
                return '<td><a href="' + href + '">' + text + "</a></td>";
              }
              return "<td" + cellClass + titleAttr + ">" + text + "</td>";
            })
            .join("") +
          "</tr>"
        );
      })
      .join("");
  }

  function refreshSearchResults() {
    var salesId = salesSelect ? salesSelect.value.trim() : "";
    var customerCode = customerSelect ? customerSelect.value.trim() : "";
    var partNo = hinbanInput ? hinbanInput.value.trim() : "";
    var partName = hinmeiInput ? hinmeiInput.value.trim() : "";
    var quoteId = quoteIdInput ? quoteIdInput.value.trim() : "";

    if (!salesId && !customerCode && !partNo && !partName && !quoteId) {
      cachedSearchRows = [];
      renderTable(cachedSearchRows);
      setSearchLoading(false);
      setResultMessage("検索結果：0 件");
      return;
    }

    var params = new URLSearchParams();
    if (salesId) params.append("sales_id", salesId);
    if (customerCode) params.append("customer_code", customerCode);
    if (partNo) params.append("part_no", partNo);
    if (partName) params.append("part_name", partName);
    if (quoteId) params.append("quote_id", quoteId);

    setResultMessage("検索結果：検索中...");
    setSearchLoading(true);
    renderTable([]);

    fetch("/api/quote_search_conditions?" + params.toString())
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data.error) {
          void showAlertModal(data.error);
          setResultMessage("検索結果：");
          return;
        }
        cachedSearchRows = data.rows ? data.rows.slice() : [];
        setResultMessage("検索結果：" + cachedSearchRows.length + " 件");
        renderTable(cachedSearchRows);
      })
      .catch(function (err) {
        void showAlertModal("通信エラー: " + err.message);
        setResultMessage("検索結果：");
      })
      .finally(function () {
        setSearchLoading(false);
      });
  }

  function finishRegisterDoneOk() {
    closeRegisterDone();
    closeSearchSubwindow();
    resetNewForm();
  }

  function finishUpdateDoneOk() {
    closeUpdateDone();
    closeSearchSubwindow();
  }

  if (searchNewBtn) {
    searchNewBtn.addEventListener("click", function () {
      prepareSubwindowNew();
      openSearchSubwindow();
    });
  }
  if (subClose) {
    subClose.addEventListener("click", closeSearchSubwindow);
  }
  if (resultTbody) {
    resultTbody.addEventListener("click", function (e) {
      var btn = e.target.closest(".search-estimate-id-btn");
      if (!btn) return;
      e.preventDefault();
      var idx = parseInt(btn.getAttribute("data-row-index") || "", 10);
      if (isNaN(idx) || idx < 0 || idx >= cachedSearchRows.length) return;
      prepareSubwindowEdit(cachedSearchRows[idx]);
      openSearchSubwindow();
    });
  }

  if (registerConfirmOverlay) {
    registerConfirmOverlay.addEventListener("click", function (e) {
      if (e.target === registerConfirmOverlay) closeRegisterConfirm();
    });
  }
  if (registerConfirmPanel) {
    registerConfirmPanel.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  }
  if (registerDoneOverlay) {
    registerDoneOverlay.addEventListener("click", function (e) {
      if (e.target === registerDoneOverlay) finishRegisterDoneOk();
    });
  }
  if (registerDonePanel) {
    registerDonePanel.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  }
  if (updateConfirmOverlay) {
    updateConfirmOverlay.addEventListener("click", function (e) {
      if (e.target === updateConfirmOverlay) closeUpdateConfirm();
    });
  }
  if (updateConfirmPanel) {
    updateConfirmPanel.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  }
  if (updateDoneOverlay) {
    updateDoneOverlay.addEventListener("click", function (e) {
      if (e.target === updateDoneOverlay) finishUpdateDoneOk();
    });
  }
  if (updateDonePanel) {
    updateDonePanel.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  }
  if (alertOverlay) {
    alertOverlay.addEventListener("click", function (e) {
      if (e.target === alertOverlay) closeAlertModal();
    });
  }
  if (alertPanel) {
    alertPanel.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  }
  if (alertOk) {
    alertOk.addEventListener("click", closeAlertModal);
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
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

  if (registerConfirmNo) {
    registerConfirmNo.addEventListener("click", closeRegisterConfirm);
  }
  if (registerConfirmYes) {
    registerConfirmYes.addEventListener("click", function () {
      var payload = collectFormPayload();
      closeRegisterConfirm();
      fetch("/api/register_quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(parseJsonResponse)
        .then(function (out) {
          if (!out.ok || out.data.error) {
            void showAlertModal(out.data.error || "登録に失敗しました");
            return;
          }
          var row = out.data.row;
          if (!row || typeof row !== "object") {
            void showAlertModal(
              "登録は完了しましたが、検索結果用のデータを取得できませんでした。"
            );
            return;
          }
          cachedSearchRows = [row];
          renderTable(cachedSearchRows);
          setResultMessage("検索結果：1 件（登録直後）");
          openRegisterDone();
        })
        .catch(function (err) {
          void showAlertModal("通信エラー: " + err.message);
        });
    });
  }
  if (registerDoneOk) {
    registerDoneOk.addEventListener("click", finishRegisterDoneOk);
  }

  if (newRegisterBtn) {
    newRegisterBtn.addEventListener("click", function () {
      if (subwindowMode !== "new") return;
      if (!validateForm()) return;
      openRegisterConfirm();
    });
  }

  if (editSaveBtn) {
    editSaveBtn.addEventListener("click", function () {
      if (subwindowMode !== "edit") return;
      if (!editingQuoteId) {
        void showAlertModal("見積りIDがありません");
        return;
      }
      if (!validateForm()) return;
      openUpdateConfirm();
    });
  }

  if (editDeleteBtn) {
    editDeleteBtn.addEventListener("click", function () {
      void showAlertModal("削除は今後実装します。");
    });
  }

  if (updateConfirmNo) {
    updateConfirmNo.addEventListener("click", closeUpdateConfirm);
  }
  if (updateConfirmYes) {
    updateConfirmYes.addEventListener("click", function () {
      var qid = editingQuoteId;
      closeUpdateConfirm();
      if (!qid) {
        void showAlertModal("見積りIDがありません");
        return;
      }
      var payload = collectFormPayload();
      payload.quote_id = qid;
      fetch("/api/update_quote_history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(parseJsonResponse)
        .then(function (out) {
          if (!out.ok || out.data.error) {
            void showAlertModal(out.data.error || "更新に失敗しました");
            return;
          }
          var row = out.data.row;
          if (!row || typeof row !== "object") {
            void showAlertModal(
              "更新は完了しましたが、検索結果用のデータを取得できませんでした。"
            );
            openUpdateDone();
            return;
          }
          var idx = cachedSearchRows.findIndex(function (r) {
            return String(r["見積りID"]) === String(qid);
          });
          if (idx >= 0) cachedSearchRows[idx] = row;
          else cachedSearchRows.push(row);
          renderTable(cachedSearchRows);
          setResultMessage("検索結果：" + cachedSearchRows.length + " 件");
          openUpdateDone();
        })
        .catch(function (err) {
          void showAlertModal("通信エラー: " + err.message);
        });
    });
  }
  if (updateDoneOk) {
    updateDoneOk.addEventListener("click", finishUpdateDoneOk);
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", function () {
      var salesId = salesSelect ? salesSelect.value.trim() : "";
      var customerCode = customerSelect ? customerSelect.value.trim() : "";
      var partNo = hinbanInput ? hinbanInput.value.trim() : "";
      var partName = hinmeiInput ? hinmeiInput.value.trim() : "";
      var quoteId = quoteIdInput ? quoteIdInput.value.trim() : "";

      if (!salesId && !customerCode && !partNo && !partName && !quoteId) {
        void showAlertModal("条件を最低1つ指定してください");
        return;
      }
      refreshSearchResults();
    });
  }

  (async function boot() {
    try {
      if (typeof window.quotesApi !== "function") return;
      var data = await window.quotesApi("/api/search/page", {});
      if (data && data.error) throw new Error(data.error);
      fillSelect(salesSelect, data && data.sales_list);
      fillSelect(customerSelect, data && data.customer_list);
      fillSelect(newSalesSelect, data && data.sales_list);
      fillSelect(newCustomerSelect, data && data.customer_list);
    } catch (err) {
      console.error(err);
    }
  })();
})();
