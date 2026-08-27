(function () {
  "use strict";

  var dateFromInput = document.getElementById("submission-date-from");
  var dateToInput = document.getElementById("submission-date-to");
  var aggregateBtn = document.getElementById("results-summary-btn");
  var loadingEl = document.getElementById("results-summary-loading");
  var mgmtTbody = document.getElementById("mgmt-no-tbody");
  var quoteTbody = document.getElementById("quote-id-tbody");

  var alertOverlay = document.getElementById("alert-overlay");
  var alertTitle = document.getElementById("alert-title");
  var alertMessage = document.getElementById("alert-message");
  var alertOk = document.getElementById("alert-ok");
  var alertPanel = alertOverlay
    ? alertOverlay.querySelector(".search-dialog-panel")
    : null;
  var alertResolver = null;

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
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

  function setLoading(loading) {
    if (loadingEl) loadingEl.hidden = !loading;
    if (aggregateBtn) aggregateBtn.disabled = Boolean(loading);
  }

  function renderTableBody(tbody, rows, countKey) {
    if (!tbody) return;
    if (!rows || rows.length === 0) {
      tbody.innerHTML = "";
      return;
    }
    tbody.innerHTML = rows
      .map(function (row) {
        var name = row["営業担当"];
        if (name === null || name === undefined) name = "";
        var cnt = row[countKey];
        if (cnt === null || cnt === undefined) cnt = "";
        return (
          "<tr><td>" +
          escapeHtml(String(name)) +
          "</td><td>" +
          escapeHtml(String(cnt)) +
          "</td></tr>"
        );
      })
      .join("");
  }

  function clearTables() {
    renderTableBody(mgmtTbody, [], "件数");
    renderTableBody(quoteTbody, [], "点数");
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

  function runAggregate() {
    var fromVal = dateFromInput ? dateFromInput.value.trim() : "";
    var toVal = dateToInput ? dateToInput.value.trim() : "";

    if (!fromVal || !toVal) {
      void showAlertModal("提出日は両方入力してください", "確認");
      return;
    }

    setLoading(true);
    clearTables();

    fetch("/api/results_summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submission_date_from: fromVal,
        submission_date_to: toVal,
      }),
    })
      .then(parseJsonResponse)
      .then(function (out) {
        if (!out.ok || out.data.error) {
          void showAlertModal(out.data.error || "集計に失敗しました", "確認");
          return;
        }
        renderTableBody(mgmtTbody, out.data.mgmt_no_rows || [], "件数");
        renderTableBody(quoteTbody, out.data.quote_id_rows || [], "点数");
      })
      .catch(function (err) {
        void showAlertModal("通信エラー: " + err.message, "確認");
      })
      .finally(function () {
        setLoading(false);
      });
  }

  if (aggregateBtn) {
    aggregateBtn.addEventListener("click", runAggregate);
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
})();
