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
  var brEnable = document.getElementById("qc-br-enable");
  var shinchuuGrid = document.querySelector(".qc-brass-grid") || document.querySelector(".shinchuu-grid");
  var brassId = "";
  var brassDeleteOverlay = document.getElementById("qc-brass-delete-confirm-overlay");
  var brassDeleteYes = document.getElementById("qc-brass-delete-confirm-yes");
  var brassDeleteNo = document.getElementById("qc-brass-delete-confirm-no");
  var brassDeleteBusy = false;

  var BRASS_TEXT_IDS = [
    "qc-br-quote-rm",
    "qc-br-material-unit",
    "qc-br-n-price",
    "qc-br-par",
    "qc-br-premium",
    "qc-br-unit-weight",
    "qc-br-scrap-w",
    "qc-br-scrap-base",
    "qc-br-chip-rate",
    "qc-br-scrap-unit-price",
    "qc-br-material-cost",
  ];

  var BRASS_ALWAYS_READONLY_IDS = {
    "qc-br-quote-rm": true,
    "qc-br-material-unit": true,
    "qc-br-par": true,
    "qc-br-premium": true,
    "qc-br-scrap-unit-price": true,
    "qc-br-material-cost": true,
  };

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

  function setChecked(id, checked) {
    var el = document.getElementById(id);
    if (!el) return;
    el.checked = !!checked;
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

  function resetBrassValuesForOff() {
    var idsToClear = [
      "qc-br-quote-rm",
      "qc-br-material-unit",
      "qc-br-n-price",
      "qc-br-par",
      "qc-br-premium",
      "qc-br-unit-weight",
      "qc-br-scrap-w",
      "qc-br-scrap-base",
      "qc-br-scrap-unit-price",
      "qc-br-material-cost",
    ];
    idsToClear.forEach(function (id) {
      setVal(id, "");
    });
    setVal("qc-br-chip-rate", "90");
    setChecked("qc-br-rm-general", true);
    setChecked("qc-br-rm-fuji", false);
    setChecked("qc-br-scrap-unit", true);
    setChecked("qc-br-scrap-weight", false);
  }

  function applyBrassEnabledState(enabled) {
    BRASS_TEXT_IDS.forEach(function (id) {
      var inputEl = document.getElementById(id);
      if (!inputEl) return;
      var alwaysReadonly = !!BRASS_ALWAYS_READONLY_IDS[id];
      inputEl.readOnly = !enabled || alwaysReadonly;
      inputEl.classList.toggle("dynamic-disabled", !enabled || alwaysReadonly);
      var itemEl = inputEl.closest(".shinchuu-item");
      if (itemEl) itemEl.classList.toggle("field-disabled", !enabled || alwaysReadonly);
    });

    document.querySelectorAll('input[name="qc-br-rm"], input[name="qc-br-scrap"]').forEach(function (radioEl) {
      radioEl.disabled = !enabled;
    });

    if (shinchuuGrid) {
      shinchuuGrid.classList.toggle("shinchuu-disabled", !enabled);
    }
  }

  function applyScrapFieldState() {
    var unitEl = document.getElementById("qc-br-unit-weight");
    var scrapEl = document.getElementById("qc-br-scrap-w");
    if (!unitEl || !scrapEl) return;
    var itemUnit = unitEl.closest(".shinchuu-item");
    var itemScrap = scrapEl.closest(".shinchuu-item");

    function clearPairVisual() {
      unitEl.classList.remove("dynamic-disabled");
      scrapEl.classList.remove("dynamic-disabled");
      if (itemUnit) itemUnit.classList.remove("field-disabled");
      if (itemScrap) itemScrap.classList.remove("field-disabled");
    }

    if (!brEnable || !brEnable.checked) {
      clearPairVisual();
      return;
    }

    var checked = document.querySelector('input[name="qc-br-scrap"]:checked');
    var isScrap = checked && checked.value === "2";
    clearPairVisual();

    if (!isScrap) {
      unitEl.readOnly = false;
      scrapEl.readOnly = true;
      scrapEl.classList.add("dynamic-disabled");
      if (itemScrap) itemScrap.classList.add("field-disabled");
    } else {
      scrapEl.readOnly = false;
      unitEl.readOnly = true;
      unitEl.classList.add("dynamic-disabled");
      if (itemUnit) itemUnit.classList.add("field-disabled");
    }
  }

  function setBrassEnabled(enabled, opts) {
    opts = opts || {};
    if (brEnable) brEnable.checked = !!enabled;
    if (!enabled && opts.reset !== false) {
      resetBrassValuesForOff();
    }
    applyBrassEnabledState(!!enabled);
    applyScrapFieldState();
  }

  function applyBrassData(data) {
    var hasRow = !!(data && data.brass_has_row);
    var r1 = String((data && data.brass_rm_category) || "1");
    var r2 = String((data && data.brass_weight_calc_category) || "1");

    brassId = hasRow && data.brass_id != null && String(data.brass_id).trim() !== ""
      ? String(data.brass_id).trim()
      : "";

    setChecked("qc-br-rm-general", r1 !== "2");
    setChecked("qc-br-rm-fuji", r1 === "2");
    setChecked("qc-br-scrap-unit", r2 !== "2");
    setChecked("qc-br-scrap-weight", r2 === "2");

    if (hasRow) {
      setVal("qc-br-quote-rm", data.brass_rm);
      setVal("qc-br-n-price", data.brass_n_company_price);
      setVal("qc-br-par", data.brass_par_value);
      setVal("qc-br-premium", data.brass_premium_value);
      setVal("qc-br-unit-weight", data.brass_unit_weight);
      setVal("qc-br-scrap-w", data.brass_scrap_weight);
      setVal("qc-br-scrap-base", data.brass_scrap_base);
      setVal("qc-br-chip-rate", data.brass_chip_recovery_rate_display);
      setVal("qc-br-scrap-unit-price", data.brass_scrap_unit_price);
      setVal("qc-br-material-cost", data.brass_material_cost);
      setBrassEnabled(true, { reset: false });
    } else {
      setBrassEnabled(false, { reset: true });
    }
  }

  function openBrassDeleteConfirm() {
    if (!brassDeleteOverlay) return Promise.resolve("no");
    return new Promise(function (resolve) {
      function finish(choice) {
        brassDeleteOverlay.hidden = true;
        brassDeleteOverlay.setAttribute("aria-hidden", "true");
        if (brassDeleteYes) brassDeleteYes.removeEventListener("click", onYes);
        if (brassDeleteNo) brassDeleteNo.removeEventListener("click", onNo);
        brassDeleteOverlay.removeEventListener("click", onOverlay);
        resolve(choice);
      }
      function onYes() {
        finish("yes");
      }
      function onNo() {
        finish("no");
      }
      function onOverlay(e) {
        if (e.target === brassDeleteOverlay) finish("no");
      }
      if (brassDeleteYes) brassDeleteYes.addEventListener("click", onYes);
      if (brassDeleteNo) brassDeleteNo.addEventListener("click", onNo);
      brassDeleteOverlay.addEventListener("click", onOverlay);
      brassDeleteOverlay.hidden = false;
      brassDeleteOverlay.setAttribute("aria-hidden", "false");
      if (brassDeleteNo) brassDeleteNo.focus();
    });
  }

  async function deleteBrassRowById(id) {
    if (typeof window.quotesApi !== "function") {
      throw new Error("APIが利用できません");
    }
    var data = await window.quotesApi("/api/quote_calc/brass_delete", { id: id });
    if (data && data.error) {
      throw new Error(data.error);
    }
    return data;
  }

  function syncBrassFromMatSteel() {
    if (!brEnable || !matSteelSelect) return;
    var opt = matSteelSelect.options[matSteelSelect.selectedIndex];
    var name = opt ? (opt.textContent || "").trim() : "";
    if (name !== "真鍮") {
      if (brEnable.checked) {
        setBrassEnabled(false, { reset: true });
      }
      return;
    }
    if (brEnable.checked) return;
    setBrassEnabled(true, { reset: false });
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

    applyBrassData(data);
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

  if (brEnable) {
    brEnable.addEventListener("change", function () {
      if (brassDeleteBusy) return;

      if (brEnable.checked) {
        setBrassEnabled(true, { reset: false });
        return;
      }

      // 無効化: DB行がある場合は確認してから削除
      if (!brassId) {
        setBrassEnabled(false, { reset: true });
        return;
      }

      brassDeleteBusy = true;
      // change で既に外れているため、確認中は見た目を有効のまま戻す
      brEnable.checked = true;
      openBrassDeleteConfirm()
        .then(function (choice) {
          if (choice !== "yes") {
            brassDeleteBusy = false;
            return;
          }
          var idToDelete = brassId;
          return deleteBrassRowById(idToDelete)
            .then(function () {
              brassId = "";
              setBrassEnabled(false, { reset: true });
            })
            .catch(function (err) {
              console.error(err);
              window.alert(err && err.message ? err.message : String(err));
            })
            .then(function () {
              brassDeleteBusy = false;
            });
        })
        .catch(function (err) {
          brassDeleteBusy = false;
          console.error(err);
          window.alert(err && err.message ? err.message : String(err));
        });
    });
  }

  document.querySelectorAll('input[name="qc-br-scrap"]').forEach(function (radio) {
    radio.addEventListener("change", function () {
      applyScrapFieldState();
    });
  });

  if (matSteelSelect) {
    matSteelSelect.addEventListener("change", function () {
      syncBrassFromMatSteel();
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

  // 初期状態: 有効化OFF・操作不能（API反映前）
  setBrassEnabled(false, { reset: true });

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
