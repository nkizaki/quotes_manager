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

  var alertOverlay = document.getElementById("alert-overlay");
  var alertTitle = document.getElementById("alert-title");
  var alertMessage = document.getElementById("alert-message");
  var alertOk = document.getElementById("alert-ok");
  var alertPanel = alertOverlay
    ? alertOverlay.querySelector(".search-dialog-panel")
    : null;
  var alertResolver = null;

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
    var first = sel.querySelector('option[value=""]');
    sel.innerHTML = "";
    if (first) {
      sel.appendChild(first);
    } else {
      var empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "選択してください";
      sel.appendChild(empty);
    }
    (items || []).forEach(function (item) {
      var opt = document.createElement("option");
      opt.value = item.code == null ? "" : String(item.code);
      opt.textContent = item.name == null ? "" : String(item.name);
      sel.appendChild(opt);
    });
  }

  function renderEmptyTable() {
    if (!resultTbody) return;
    resultTbody.innerHTML = "";
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
    }
  });

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

      setResultMessage("検索結果：検索中...");
      setSearchLoading(true);
      renderEmptyTable();

      // 検索 API は今後実装。UI 骨格のみ先に用意する。
      window.setTimeout(function () {
        setSearchLoading(false);
        setResultMessage("検索結果：");
        void showAlertModal("見積り検索は今後実装します。");
      }, 200);
    });
  }

  if (searchNewBtn) {
    searchNewBtn.addEventListener("click", function () {
      void showAlertModal("新規登録は今後実装します。");
    });
  }

  (async function boot() {
    try {
      if (typeof window.quotesApi !== "function") return;
      var data = await window.quotesApi("/api/search/page", {});
      if (data && data.error) throw new Error(data.error);
      fillSelect(salesSelect, data && data.sales_list);
      fillSelect(customerSelect, data && data.customer_list);
    } catch (err) {
      console.error(err);
    }
  })();
})();
