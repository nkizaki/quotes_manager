(function () {
  "use strict";

  var quoteIdInput = document.getElementById("qc-quote-id");
  var tablist = document.querySelector(".quote-calc-tablist");
  var tabs = document.querySelectorAll(".quote-calc-tab");
  var panels = document.querySelectorAll(".quote-calc-tabpanel");
  var matSteelSelect = document.getElementById("qc-mat-steel");
  var procMachineSelect = document.getElementById("qc-proc-machine");
  var procTheadRow = document.getElementById("qc-proc-thead-row");
  var procTbody = document.getElementById("qc-proc-tbody");

  function setVal(id, value) {
    var el = document.getElementById(id);
    if (!el) return;
    el.value = value == null ? "" : String(value);
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = value == null ? "" : String(value);
  }

  function populateSteelOptions(options) {
    if (!matSteelSelect) return;
    var list = options || [];
    matSteelSelect.innerHTML = "";
    var emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "未選択";
    matSteelSelect.appendChild(emptyOpt);
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      var opt = document.createElement("option");
      opt.value = o.id != null ? String(o.id) : "";
      opt.textContent = o.name != null ? String(o.name) : "";
      if (o.specgravity != null && o.specgravity !== "") {
        opt.setAttribute("data-specgravity", String(o.specgravity));
      }
      matSteelSelect.appendChild(opt);
    }
  }

  function populateMachineOptions(options) {
    if (!procMachineSelect) return;
    var list = options || [];
    procMachineSelect.innerHTML = "";
    var emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "未選択";
    procMachineSelect.appendChild(emptyOpt);
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      var opt = document.createElement("option");
      opt.value = o.name != null ? String(o.name) : "";
      opt.textContent = o.name != null ? String(o.name) : "";
      procMachineSelect.appendChild(opt);
    }
  }

  function renderProcessingTable(columns, rows) {
    if (!procTheadRow || !procTbody) return;
    procTheadRow.innerHTML = "";
    procTbody.innerHTML = "";
    var cols = columns && columns.length ? columns.slice() : [];
    if (!cols.length && rows && rows.length) {
      cols = Object.keys(rows[0]);
    }
    for (var c = 0; c < cols.length; c++) {
      var th = document.createElement("th");
      th.textContent = cols[c];
      procTheadRow.appendChild(th);
    }
    var dataRows = rows || [];
    for (var r = 0; r < dataRows.length; r++) {
      var row = dataRows[r];
      var tr = document.createElement("tr");
      for (var ci = 0; ci < cols.length; ci++) {
        var td = document.createElement("td");
        var v = row[cols[ci]];
        td.textContent = v != null && v !== undefined ? String(v) : "";
        tr.appendChild(td);
      }
      procTbody.appendChild(tr);
    }
  }

  function applyPage(data) {
    if (!data) return;
    if (quoteIdInput) {
      setVal("qc-quote-id", data.quote_id);
    }
    setVal("qc-part-no", data.part_no);
    setVal("qc-part-name", data.part_name);
    setVal("qc-customer", data.customer_name);
    setVal("qc-department", data.department);
    setVal("qc-contact", data.contact);

    populateSteelOptions(data.zairyo_2_options);
    populateMachineOptions(data.machine_options);

    if (data.rm_general != null && data.rm_general !== "") {
      setText("qc-br-rm-general-val", " " + data.rm_general);
    }
    if (data.rm_fuji_koki != null && data.rm_fuji_koki !== "") {
      setText("qc-br-rm-fuji-val", " " + data.rm_fuji_koki);
    }

    renderProcessingTable(data.processing_columns, data.processing_rows);
  }

  function activateTab(tabKey) {
    tabs.forEach(function (tab) {
      var isActive = tab.getAttribute("data-tab") === tabKey;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
      tab.tabIndex = isActive ? 0 : -1;
    });

    panels.forEach(function (panel) {
      var isActive = panel.getAttribute("data-tab-panel") === tabKey;
      panel.classList.toggle("is-active", isActive);
      if (isActive) {
        panel.removeAttribute("hidden");
      } else {
        panel.setAttribute("hidden", "");
      }
    });
  }

  if (tablist) {
    tablist.addEventListener("click", function (e) {
      var tab = e.target.closest(".quote-calc-tab");
      if (!tab) return;
      var key = tab.getAttribute("data-tab");
      if (!key) return;
      activateTab(key);
    });

    tablist.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      var current = tablist.querySelector(".quote-calc-tab.is-active");
      if (!current) return;
      var list = Array.prototype.slice.call(tabs);
      var idx = list.indexOf(current);
      if (idx < 0) return;
      e.preventDefault();
      var nextIdx =
        e.key === "ArrowRight"
          ? (idx + 1) % list.length
          : (idx - 1 + list.length) % list.length;
      var nextTab = list[nextIdx];
      var key = nextTab.getAttribute("data-tab");
      if (key) {
        activateTab(key);
        nextTab.focus();
      }
    });
  }

  (async function boot() {
    var quoteId = (
      new URLSearchParams(window.location.search).get("quote_id") || ""
    ).trim();

    if (quoteIdInput && quoteId) {
      quoteIdInput.value = quoteId;
    }

    try {
      if (typeof window.quotesApi !== "function") return;
      var data = await window.quotesApi("/api/quote_calc/page", {
        quote_id: quoteId,
      });
      if (data && data.error) {
        throw new Error(data.error);
      }
      applyPage(data || {});
    } catch (err) {
      console.error(err);
      window.alert(err && err.message ? err.message : String(err));
    }
  })();
})();
