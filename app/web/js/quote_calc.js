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
  var materialRegistered = false;
  /** RMマスタ「一般」の値（計算用） */
  var rmMasterGeneral = 125;
  /** RMマスタ「不二工機」の値（計算用） */
  var rmMasterFujiKoki = 97;
  /** RMマスタ一般 − 不二工機（計算用） */
  var rmMasterDelta = rmMasterGeneral - rmMasterFujiKoki;
  /** 不二工機時のスクラップベース算出用定数 */
  var ScBaseFuji = 140;

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

  function getVal(id) {
    var el = document.getElementById(id);
    return el ? el.value || "" : "";
  }

  function clearVals(ids) {
    (ids || []).forEach(function (id) {
      setVal(id, "");
    });
  }

  function parseNum(v) {
    if (v == null || v === "") return null;
    var s = String(v).replace(/,/g, "").trim();
    if (s === "") return null;
    var n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function parseNumOrZero(v) {
    var n = parseNum(v);
    return n === null ? 0 : n;
  }

  /** 通常の四捨五入（銀行丸めではない）。小数第 (places+1) 位を見て places 桁にする */
  function roundToDecimals(x, places) {
    if (!Number.isFinite(x)) return x;
    var factor = Math.pow(10, places);
    var sign = x < 0 ? -1 : 1;
    var scaled = Math.abs(x) * factor;
    // 浮動小数の境界誤差を吸収しつつ 0.5 以上を切り上げ
    return (sign * Math.floor(scaled + 0.5 + Number.EPSILON)) / factor;
  }

  /** 千の位カンマ + 小数 places 桁。useComma === false でカンマなし */
  function formatNumberForDisplay(n, places, useComma) {
    if (!Number.isFinite(n)) return "";
    var fixed = roundToDecimals(n, places).toFixed(places);
    if (useComma === false) return fixed;
    var parts = fixed.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.length > 1 ? parts[0] + "." + parts[1] : parts[0];
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

    document.querySelectorAll('input[name="qc_br_rm"], input[name="qc_br_scrap"]').forEach(function (radioEl) {
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

    var checked = document.querySelector('input[name="qc_br_scrap"]:checked');
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

  function getRadioValue(name) {
    var checked = document.querySelector('input[name="' + name + '"]:checked');
    return checked ? checked.value : "";
  }

  function applyRmMasterForCalc(general, fujiKoki) {
    var g = Number(String(general == null ? "" : general).replace(/,/g, "").trim());
    var f = Number(String(fujiKoki == null ? "" : fujiKoki).replace(/,/g, "").trim());
    if (Number.isFinite(g)) rmMasterGeneral = g;
    if (Number.isFinite(f)) rmMasterFujiKoki = f;
    rmMasterDelta = rmMasterGeneral - rmMasterFujiKoki;
  }

  function applyBrassData(data) {
    var hasRow = !!(data && data.brass_id);
    var r1 = String((data && data.qc_br_rm) || "1");
    var r2 = String((data && data.qc_br_scrap) || "1");

    brassId = hasRow && data.brass_id != null && String(data.brass_id).trim() !== ""
      ? String(data.brass_id).trim()
      : "";

    setChecked("qc-br-rm-general", r1 !== "2");
    setChecked("qc-br-rm-fuji", r1 === "2");
    setChecked("qc-br-scrap-unit", r2 !== "2");
    setChecked("qc-br-scrap-weight", r2 === "2");

    if (hasRow) {
      setVal("qc-br-quote-rm", data.rm);
      setVal("qc-br-n-price", data.n_company_price);
      setVal("qc-br-par", data.par_value);
      setVal("qc-br-premium", data.premium_value);
      setVal("qc-br-unit-weight", data.unit_weight);
      setVal("qc-br-scrap-w", data.scrap_weight);
      setVal("qc-br-scrap-base", data.scrap_base);
      setVal("qc-br-chip-rate", data.chip_recovery_rate);
      setVal("qc-br-scrap-unit-price", data.scrap_unit_price);
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
        resolve(choice);
      }
      function onYes() {
        finish("yes");
      }
      function onNo() {
        finish("no");
      }
      if (brassDeleteYes) brassDeleteYes.addEventListener("click", onYes);
      if (brassDeleteNo) brassDeleteNo.addEventListener("click", onNo);
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
    runBrassCalcChain();
  }

  function applyMaterialData(data) {
    if (!data) return;
    setVal("qc-mat-diameter", data.material_diameter);
    setVal("qc-mat-steel", data.steel_grade);
    setVal("qc-mat-shape", data.shape);
    setVal("qc-mat-dia", data.diameter);
    setVal("qc-mat-length", data.length);
    setVal("qc-mat-overall", data.overall_length);
    setVal("qc-mat-cutoff", data.cutoff);
    setVal("qc-mat-pieces-input", data.pieces_per_stock_input);
    setVal("qc-mat-gravity", data.specific_gravity);
    setVal("qc-mat-unit-price", data.material_unit_price);
    setVal("qc-mat-cost", data.material_cost);
    setVal("qc-mat-yield", data.yield_rate_decimal);
    setVal("qc-mat-yield-amt", data.yield_amount_decimal);
    // 材料費合計は算出欄。手動入力の材料費(qc-mat-cost-input)に DB の材料費合計を載せる
    setVal("qc-mat-total", "");
    var costN = parseNum(data.material_cost);
    var yieldAmtN = parseNum(data.yield_amount_decimal);
    if (costN !== null && yieldAmtN !== null) {
      setVal(
        "qc-mat-total",
        formatNumberForDisplay(roundToDecimals(costN + yieldAmtN, 2), 2)
      );
    } else if (costN !== null) {
      setVal("qc-mat-total", formatNumberForDisplay(roundToDecimals(costN, 2), 2));
    }
    // 取り数・一本重・一個重は画面側で算出（取り数入力は DB 値を維持）
    syncMaterialDerivedAfterLoad();
    // 読み込み後に手動材料費を反映（連動計算では空にするが、初回表示は維持）
    setVal("qc-mat-cost-input", data.material_cost_total);
    setMaterialRegStatus(!!data.material_registered);
  }

  function setMaterialRegStatus(registered) {
    materialRegistered = !!registered;
    var badge = document.getElementById("qc-mat-reg-status-badge");
    if (badge) {
      badge.textContent = materialRegistered ? "済" : "未";
      badge.classList.toggle("is-registered", materialRegistered);
      badge.classList.toggle("is-unset", !materialRegistered);
    }
    var delBtn = document.getElementById("qc-mat-btn-delete");
    if (delBtn) delBtn.disabled = !materialRegistered;
  }

  function clearMaterialFormAfterDelete() {
    [
      "qc-mat-diameter",
      "qc-mat-steel",
      "qc-mat-shape",
      "qc-mat-dia",
      "qc-mat-length",
      "qc-mat-overall",
      "qc-mat-cutoff",
      "qc-mat-pieces",
      "qc-mat-pieces-input",
      "qc-mat-gravity",
      "qc-mat-bar-weight",
      "qc-mat-piece-weight",
      "qc-mat-unit-price",
      "qc-mat-cost",
      "qc-mat-yield",
      "qc-mat-yield-amt",
      "qc-mat-total",
      "qc-mat-cost-input",
    ].forEach(function (id) {
      setVal(id, "");
    });
    brassId = "";
    setBrassEnabled(false, { reset: true });
    setMaterialRegStatus(false);
  }

  async function deleteMaterialRows() {
    if (typeof window.quotesApi !== "function") {
      throw new Error("APIが利用できません");
    }
    var quoteId = getQuoteId();
    if (!quoteId) {
      throw new Error("見積りIDがありません");
    }
    var data = await window.quotesApi("/api/quote_calc/material_delete", {
      quote_id: quoteId,
    });
    if (data && data.error) {
      throw new Error(data.error);
    }
    return data;
  }

  function clearMaterialCostInput() {
    setVal("qc-mat-cost-input", "");
  }

  function syncMaterialDerivedAfterLoad() {
    if (!getVal("qc-mat-gravity")) reflectSteelSpecgravityToGravity();
    setVal("qc-mat-pieces", "");
    // 突切りが空なら取り数・取り数入力を空にし、一個重以降は算出しない
    if (parseNum(getVal("qc-mat-cutoff")) === null) {
      setVal("qc-mat-pieces-input", "");
      setVal("qc-mat-piece-weight", "");
      recalcBarWeight();
      return;
    }
    var L = parseNumOrZero(getVal("qc-mat-length"));
    var Z = parseNumOrZero(getVal("qc-mat-overall"));
    var T = parseNumOrZero(getVal("qc-mat-cutoff"));
    var denom = Z + T;
    if (denom !== 0) {
      var x = (L - 300) / denom;
      if (Number.isFinite(x)) {
        setVal("qc-mat-pieces", formatNumberForDisplay(roundToDecimals(x, 2), 2));
        if (!String(getVal("qc-mat-pieces-input") || "").trim()) {
          setVal("qc-mat-pieces-input", formatNumberForDisplay(Math.trunc(x), 0));
        }
      }
    }
    recalcBarWeight();
    recalcPieceWeight();
  }

  /* ----- 材料費 連動計算（est_calc.js 相当） ----- */

  function reflectSteelSpecgravityToGravity() {
    if (!matSteelSelect) return;
    var selected = matSteelSelect.options[matSteelSelect.selectedIndex];
    if (!selected) return;
    setVal("qc-mat-gravity", selected.getAttribute("data-specgravity") || "");
  }

  function applyCutoffFromDiameter() {
    setVal("qc-mat-cutoff", "");
    var x = parseNum(getVal("qc-mat-dia"));
    if (x === null || x <= 0) return;
    if (x <= 7) setVal("qc-mat-cutoff", "2");
    else if (x <= 16) setVal("qc-mat-cutoff", "2.5");
    else setVal("qc-mat-cutoff", "3");
  }

  /** @returns {boolean} 取り数を算出できたとき true */
  function recalcPiecesPerStock() {
    setVal("qc-mat-pieces", "");
    setVal("qc-mat-pieces-input", "");
    // 突切りが空なら取り数系を空のまま、以降の計算は呼び出し側で行わない
    if (parseNum(getVal("qc-mat-cutoff")) === null) return false;
    var L = parseNumOrZero(getVal("qc-mat-length"));
    var Z = parseNumOrZero(getVal("qc-mat-overall"));
    var T = parseNumOrZero(getVal("qc-mat-cutoff"));
    var denom = Z + T;
    if (denom === 0) return false;
    var x = (L - 300) / denom;
    if (!Number.isFinite(x)) return false;
    setVal("qc-mat-pieces", formatNumberForDisplay(roundToDecimals(x, 2), 2));
    setVal("qc-mat-pieces-input", formatNumberForDisplay(Math.trunc(x), 0));
    return true;
  }

  function clearMaterialDownstreamFromPieces() {
    clearVals(["qc-mat-piece-weight", "qc-mat-cost", "qc-mat-yield-amt", "qc-mat-total"]);
    clearMaterialCostInput();
  }

  function recalcBarWeight() {
    setVal("qc-mat-bar-weight", "");
    var d = parseNum(getVal("qc-mat-dia"));
    var len = parseNum(getVal("qc-mat-length"));
    var sg = parseNum(getVal("qc-mat-gravity"));
    if (d === null || len === null || sg === null) return;
    if (d <= 0 || len <= 0) return;
    var shapeEl = document.getElementById("qc-mat-shape");
    var shape = shapeEl ? String(shapeEl.value || "").trim() : "";
    var r10 = (d / 2) / 10;
    var x = r10 * r10 * 3.14 * (len / 10) * sg;
    if (shape === "2") x *= 1.15;
    else if (shape === "3") x *= 1.263;
    if (!Number.isFinite(x)) return;
    setVal("qc-mat-bar-weight", formatNumberForDisplay(roundToDecimals(x, 2), 2));
  }

  function recalcPieceWeight() {
    setVal("qc-mat-piece-weight", "");
    if (parseNum(getVal("qc-mat-cutoff")) === null) return;
    var unit = parseNum(getVal("qc-mat-bar-weight"));
    var take = parseNum(getVal("qc-mat-pieces-input"));
    if (unit === null || take === null || take <= 0) return;
    var x = unit / take;
    if (!Number.isFinite(x)) return;
    setVal("qc-mat-piece-weight", formatNumberForDisplay(roundToDecimals(x, 2), 2));
  }

  function recalcMaterialCostFields() {
    clearVals(["qc-mat-cost", "qc-mat-yield-amt", "qc-mat-total"]);
    clearMaterialCostInput();
    if (parseNum(getVal("qc-mat-cutoff")) === null) return;
    var one = parseNum(getVal("qc-mat-piece-weight"));
    var price = parseNum(getVal("qc-mat-unit-price"));
    if (one === null || price === null) return;
    var x = roundToDecimals((one / 1000) * price, 2);
    setVal("qc-mat-cost", formatNumberForDisplay(x, 2));
    var yieldPct = parseNumOrZero(getVal("qc-mat-yield"));
    var y = roundToDecimals(x * (yieldPct / 100), 2);
    setVal("qc-mat-yield-amt", formatNumberForDisplay(y, 2));
    setVal("qc-mat-total", formatNumberForDisplay(roundToDecimals(x + y, 2), 2));
  }

  function runMaterialChainFromDiameter() {
    clearMaterialCostInput();
    applyCutoffFromDiameter();
    if (!recalcPiecesPerStock()) {
      clearMaterialDownstreamFromPieces();
      recalcBarWeight();
      runBrassCalcChain({ resetMaterialCostInput: false });
      return;
    }
    recalcBarWeight();
    recalcPieceWeight();
    recalcMaterialCostFields();
    runBrassCalcChain({ resetMaterialCostInput: false });
  }

  function runMaterialChainFromLengthCutoff() {
    clearMaterialCostInput();
    if (!recalcPiecesPerStock()) {
      clearMaterialDownstreamFromPieces();
      recalcBarWeight();
      runBrassCalcChain({ resetMaterialCostInput: false });
      return;
    }
    recalcBarWeight();
    recalcPieceWeight();
    recalcMaterialCostFields();
    runBrassCalcChain({ resetMaterialCostInput: false });
  }

  function runMaterialChainFromOverall() {
    clearMaterialCostInput();
    if (!recalcPiecesPerStock()) {
      clearMaterialDownstreamFromPieces();
      runBrassCalcChain({ resetMaterialCostInput: false });
      return;
    }
    recalcPieceWeight();
    recalcMaterialCostFields();
    runBrassCalcChain({ resetMaterialCostInput: false });
  }

  function runMaterialChainFromShapeGravity() {
    clearMaterialCostInput();
    if (parseNum(getVal("qc-mat-cutoff")) === null) {
      clearMaterialDownstreamFromPieces();
      recalcBarWeight();
      runBrassCalcChain({ resetMaterialCostInput: false });
      return;
    }
    recalcBarWeight();
    recalcPieceWeight();
    recalcMaterialCostFields();
    runBrassCalcChain({ resetMaterialCostInput: false });
  }

  function runMaterialChainFromPiecesInput() {
    clearMaterialCostInput();
    if (parseNum(getVal("qc-mat-cutoff")) === null) {
      clearMaterialDownstreamFromPieces();
      runBrassCalcChain({ resetMaterialCostInput: false });
      return;
    }
    recalcPieceWeight();
    recalcMaterialCostFields();
    runBrassCalcChain({ resetMaterialCostInput: false });
  }

  function runMaterialChainFromUnitPriceYield() {
    clearMaterialCostInput();
    if (parseNum(getVal("qc-mat-cutoff")) === null) {
      clearVals(["qc-mat-cost", "qc-mat-yield-amt", "qc-mat-total"]);
      runBrassCalcChain({ resetMaterialCostInput: false });
      return;
    }
    recalcMaterialCostFields();
    runBrassCalcChain({ resetMaterialCostInput: false });
  }

  /**
   * 真鍮連動の一連計算（建値・増値 → スクラップベース → 素材単価・材料費）。
   * 真鍮計算時も手動材料費をリセットする。
   */
  function runBrassCalcChain(opts) {
    opts = opts || {};
    if (opts.resetMaterialCostInput !== false) {
      clearMaterialCostInput();
    }
    recalcBrRmParPremium();
    if (opts.skipScrapBase !== true) {
      recalcBrScrapBase();
    }
    recalcBrMaterialUnitAndCosts();
  }

  /**
   * 真鍮: RM区分ラジオに応じて建値・増値を算出。
   * 使用項目が空白なら以降は空のまま。
   */
  function recalcBrRmParPremium() {
    setVal("qc-br-par", "");
    setVal("qc-br-premium", "");
    if (!brEnable || !brEnable.checked) return;

    var r1 = getRadioValue("qc_br_rm");
    var nPrice = parseNum(getVal("qc-br-n-price"));
    if (nPrice === null) return;

    var tate;
    if (r1 === "2") {
      tate = nPrice + rmMasterFujiKoki;
    } else {
      tate = nPrice + rmMasterGeneral;
    }
    if (!Number.isFinite(tate)) return;
    setVal("qc-br-par", formatNumberForDisplay(roundToDecimals(tate, 0), 0));

    var matUnit = parseNum(getVal("qc-mat-unit-price"));
    if (matUnit === null) return;

    var premium;
    if (r1 === "2") {
      premium = matUnit - tate - rmMasterDelta;
    } else {
      premium = matUnit - tate;
    }
    if (!Number.isFinite(premium)) return;
    setVal("qc-br-premium", formatNumberForDisplay(roundToDecimals(premium, 0), 0));
  }

  /** 建値の後: スクラップベース */
  function recalcBrScrapBase() {
    setVal("qc-br-scrap-base", "");
    if (!brEnable || !brEnable.checked) return;

    var r1 = getRadioValue("qc_br_rm");
    if (r1 !== "2") return;

    var tate = parseNum(getVal("qc-br-par"));
    if (tate === null) return;
    var scrapBase = tate - ScBaseFuji;
    if (!Number.isFinite(scrapBase)) return;
    setVal("qc-br-scrap-base", formatNumberForDisplay(roundToDecimals(scrapBase, 0), 0, false));
  }

  /**
   * スクラップベースの後: 素材単価・スクラップ単価・真鍮材料費。
   * 不二工機×単重のとき材料費(qc-mat-cost)も再計算する。
   */
  function recalcBrMaterialUnitAndCosts() {
    clearVals([
      "qc-br-material-unit",
      "qc-br-scrap-unit-price",
      "qc-br-material-cost",
    ]);
    if (!brEnable || !brEnable.checked) return;

    var r1 = getRadioValue("qc_br_rm");
    var r2 = getRadioValue("qc_br_scrap");
    var isFujiUnitWeight = r1 === "2" && r2 === "1";

    if (isFujiUnitWeight) {
      var pieceW = parseNum(getVal("qc-mat-piece-weight"));
      var matPrice = parseNum(getVal("qc-mat-unit-price"));
      if (pieceW === null || matPrice === null) return;

      var xRaw = (pieceW * (matPrice - rmMasterDelta)) / 1000;
      var x = roundToDecimals(xRaw, 2);
      if (!Number.isFinite(x)) return;
      setVal("qc-mat-cost", formatNumberForDisplay(x, 2));

      // 歩留りを百分率で計算
      var yieldPct = parseNum(getVal("qc-mat-yield"));
      if (yieldPct !== null) {
        var y = x + roundToDecimals(x * (yieldPct / 100), 2);
        if (Number.isFinite(y)) {
          setVal("qc-br-material-unit", formatNumberForDisplay(y, 2));
        }
      }
    } else {
      var matTotal = parseNum(getVal("qc-mat-total"));
      if (matTotal === null) return;
      setVal("qc-br-material-unit", formatNumberForDisplay(roundToDecimals(matTotal, 2), 2));
    }

    var scrapW = parseNum(getVal("qc-br-scrap-w"));
    var scrapBase = parseNum(getVal("qc-br-scrap-base"));
    var chipRate = parseNum(getVal("qc-br-chip-rate"));
    if (scrapW === null || scrapBase === null || chipRate === null) return;

    // 切粉回収率を百分率で計算
    var z = roundToDecimals((scrapW * scrapBase * (chipRate / 100)) / 1000, 2);
    if (!Number.isFinite(z)) return;
    setVal("qc-br-scrap-unit-price", formatNumberForDisplay(z, 2));

    var materialUnit = parseNum(getVal("qc-br-material-unit"));
    if (materialUnit === null) return;
    var brassCost = roundToDecimals(materialUnit - z, 2);
    if (!Number.isFinite(brassCost)) return;
    setVal("qc-br-material-cost", formatNumberForDisplay(brassCost, 2));
  }

  /** 単重↔スクラップ重の相互更新ループ防止 */
  var brUnitScrapSyncing = false;

  /**
   * 単重変更時: スクラップ重 = 一個重 - 単重 を反映して再計算
   */
  function syncScrapWFromUnitWeight() {
    if (!brEnable || !brEnable.checked) return;
    if (brUnitScrapSyncing) return;
    brUnitScrapSyncing = true;
    setVal("qc-br-scrap-w", "");
    var pieceW = parseNum(getVal("qc-mat-piece-weight"));
    var unitW = parseNum(getVal("qc-br-unit-weight"));
    if (pieceW !== null && unitW !== null) {
      var scrapW = roundToDecimals(pieceW - unitW, 2);
      if (Number.isFinite(scrapW)) {
        setVal("qc-br-scrap-w", formatNumberForDisplay(scrapW, 2));
      }
    }
    brUnitScrapSyncing = false;
    clearMaterialCostInput();
    recalcBrMaterialUnitAndCosts();
  }

  /**
   * スクラップ重変更時: 単重 = 一個重 - スクラップ重 を反映して再計算
   */
  function syncUnitWeightFromScrapW() {
    if (!brEnable || !brEnable.checked) return;
    if (brUnitScrapSyncing) return;
    brUnitScrapSyncing = true;
    setVal("qc-br-unit-weight", "");
    var pieceW = parseNum(getVal("qc-mat-piece-weight"));
    var scrapW = parseNum(getVal("qc-br-scrap-w"));
    if (pieceW !== null && scrapW !== null) {
      var unitW = roundToDecimals(pieceW - scrapW, 2);
      if (Number.isFinite(unitW)) {
        setVal("qc-br-unit-weight", formatNumberForDisplay(unitW, 2));
      }
    }
    brUnitScrapSyncing = false;
    clearMaterialCostInput();
    recalcBrMaterialUnitAndCosts();
  }

  function bindBrassCalcEvents() {
    document.querySelectorAll('input[name="qc_br_rm"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        if (!brEnable || !brEnable.checked) return;
        runBrassCalcChain();
      });
    });
    document.querySelectorAll('input[name="qc_br_scrap"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        applyScrapFieldState();
        if (!brEnable || !brEnable.checked) return;
        // 単重・スクラップ重の切替ではスクラップベースを維持する
        runBrassCalcChain({ skipScrapBase: true });
      });
    });
    var nPrice = document.getElementById("qc-br-n-price");
    if (nPrice) {
      nPrice.addEventListener("input", function () {
        if (!brEnable || !brEnable.checked) return;
        runBrassCalcChain();
      });
      nPrice.addEventListener("change", function () {
        if (!brEnable || !brEnable.checked) return;
        runBrassCalcChain();
      });
    }
    var unitWeight = document.getElementById("qc-br-unit-weight");
    if (unitWeight) {
      unitWeight.addEventListener("input", syncScrapWFromUnitWeight);
      unitWeight.addEventListener("change", syncScrapWFromUnitWeight);
    }
    var scrapW = document.getElementById("qc-br-scrap-w");
    if (scrapW) {
      scrapW.addEventListener("input", syncUnitWeightFromScrapW);
      scrapW.addEventListener("change", syncUnitWeightFromScrapW);
    }
    ["qc-br-scrap-base", "qc-br-chip-rate"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", function () {
        if (!brEnable || !brEnable.checked) return;
        clearMaterialCostInput();
        recalcBrMaterialUnitAndCosts();
      });
      el.addEventListener("change", function () {
        if (!brEnable || !brEnable.checked) return;
        clearMaterialCostInput();
        recalcBrMaterialUnitAndCosts();
      });
    });
  }

  function bindNumericOnlyInput(inputEl, options) {
    if (!inputEl) return;
    var allowDecimal = !options || options.allowDecimal !== false;
    inputEl.addEventListener("keydown", function (e) {
      if (e.key === "e" || e.key === "E" || e.key === "+" || e.key === "-") {
        e.preventDefault();
        return;
      }
      if (!allowDecimal && e.key === ".") {
        e.preventDefault();
      }
    });
    inputEl.addEventListener("input", function () {
      var raw = inputEl.value || "";
      var cleaned;
      if (allowDecimal) {
        cleaned = raw.replace(/[^0-9.]/g, "");
        var firstDot = cleaned.indexOf(".");
        if (firstDot !== -1) {
          cleaned =
            cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
        }
      } else {
        cleaned = raw.replace(/[^0-9]/g, "");
      }
      if (cleaned !== raw) inputEl.value = cleaned;
    });
  }

  function bindIntegerOnlyInput(inputEl) {
    bindNumericOnlyInput(inputEl, { allowDecimal: false });
  }

  function bindMaterialNumericInputs() {
    var integerIds = [
      "qc-mat-length",
      "qc-mat-pieces-input",
      "qc-mat-gravity",
      "qc-mat-unit-price",
    ];
    var decimalIds = [
      "qc-mat-dia",
      "qc-mat-overall",
      "qc-mat-cutoff",
      "qc-mat-yield",
      "qc-mat-cost-input",
      "qc-br-n-price",
      "qc-br-unit-weight",
      "qc-br-scrap-w",
      "qc-br-scrap-base",
      "qc-br-chip-rate",
    ];
    integerIds.forEach(function (id) {
      bindNumericOnlyInput(document.getElementById(id), { allowDecimal: false });
    });
    decimalIds.forEach(function (id) {
      bindNumericOnlyInput(document.getElementById(id), { allowDecimal: true });
    });
  }

  function isBlankField(id) {
    var el = document.getElementById(id);
    if (!el) return true;
    return String(el.value || "").trim() === "";
  }

  function getMaterialRequiredMissing() {
    var ids = [
      "qc-mat-diameter",
      "qc-mat-steel",
      "qc-mat-shape",
      "qc-mat-dia",
      "qc-mat-length",
      "qc-mat-overall",
      "qc-mat-cutoff",
      "qc-mat-pieces-input",
      "qc-mat-unit-price",
      "qc-mat-yield",
      "qc-mat-cost-input",
    ];
    for (var i = 0; i < ids.length; i++) {
      if (isBlankField(ids[i])) return true;
    }
    return false;
  }

  function getBrassRequiredMissing() {
    var ids = ["qc-br-n-price", "qc-br-scrap-base", "qc-br-chip-rate"];
    var scrapMode = getRadioValue("qc_br_scrap");
    if (scrapMode === "2") {
      ids.push("qc-br-scrap-w");
    } else {
      ids.push("qc-br-unit-weight");
    }
    for (var i = 0; i < ids.length; i++) {
      if (isBlankField(ids[i])) return true;
    }
    return false;
  }

  function collectMaterialSavePayload() {
    var brassEnabled = !!(brEnable && brEnable.checked);
    var payload = {
      quote_id: getQuoteId(),
      material_diameter: getVal("qc-mat-diameter").trim(),
      steel_grade: getVal("qc-mat-steel").trim(),
      shape: getVal("qc-mat-shape").trim(),
      diameter: getVal("qc-mat-dia").trim(),
      length: getVal("qc-mat-length").trim(),
      overall_length: getVal("qc-mat-overall").trim(),
      cutoff: getVal("qc-mat-cutoff").trim(),
      pieces_per_stock_input: getVal("qc-mat-pieces-input").trim(),
      material_unit_price: getVal("qc-mat-unit-price").trim(),
      yield_rate: getVal("qc-mat-yield").trim(),
      material_cost: getVal("qc-mat-cost").trim(),
      yield_amount: getVal("qc-mat-yield-amt").trim(),
      material_cost_total: getVal("qc-mat-cost-input").trim(),
      brass_enabled: brassEnabled,
    };
    if (brassEnabled) {
      payload.qc_br_rm = getRadioValue("qc_br_rm") || "1";
      payload.qc_br_scrap = getRadioValue("qc_br_scrap") || "1";
      payload.rm = getVal("qc-br-quote-rm").trim();
      payload.n_company_price = getVal("qc-br-n-price").trim();
      payload.par_value = getVal("qc-br-par").trim();
      payload.premium_value = getVal("qc-br-premium").trim();
      payload.unit_weight = getVal("qc-br-unit-weight").trim();
      payload.scrap_weight = getVal("qc-br-scrap-w").trim();
      payload.scrap_base = getVal("qc-br-scrap-base").trim();
      payload.chip_recovery_rate = getVal("qc-br-chip-rate").trim();
      payload.scrap_unit_price = getVal("qc-br-scrap-unit-price").trim();
      payload.brass_material_cost = getVal("qc-br-material-cost").trim();
    }
    return payload;
  }

  async function saveMaterialRows() {
    if (typeof window.quotesApi !== "function") {
      throw new Error("APIが利用できません");
    }
    var data = await window.quotesApi(
      "/api/quote_calc/material_save",
      collectMaterialSavePayload()
    );
    if (data && data.error) {
      throw new Error(data.error);
    }
    return data;
  }

  function bindMaterialCalcEvents() {
    var dia = document.getElementById("qc-mat-dia");
    if (dia) {
      dia.addEventListener("input", runMaterialChainFromDiameter);
      dia.addEventListener("change", runMaterialChainFromDiameter);
    }
    ["qc-mat-length", "qc-mat-cutoff"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", runMaterialChainFromLengthCutoff);
      el.addEventListener("change", runMaterialChainFromLengthCutoff);
    });
    var overall = document.getElementById("qc-mat-overall");
    if (overall) {
      overall.addEventListener("input", runMaterialChainFromOverall);
      overall.addEventListener("change", runMaterialChainFromOverall);
    }
    var shape = document.getElementById("qc-mat-shape");
    if (shape) {
      shape.addEventListener("change", runMaterialChainFromShapeGravity);
    }
    var gravity = document.getElementById("qc-mat-gravity");
    if (gravity) {
      gravity.addEventListener("input", runMaterialChainFromShapeGravity);
      gravity.addEventListener("change", runMaterialChainFromShapeGravity);
    }
    var piecesInput = document.getElementById("qc-mat-pieces-input");
    if (piecesInput) {
      piecesInput.addEventListener("input", runMaterialChainFromPiecesInput);
      piecesInput.addEventListener("change", runMaterialChainFromPiecesInput);
    }
    ["qc-mat-unit-price", "qc-mat-yield"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", runMaterialChainFromUnitPriceYield);
      el.addEventListener("change", runMaterialChainFromUnitPriceYield);
    });
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
    applyMaterialData(data);

    if (data.rm_general != null && data.rm_general !== "") {
      setText("qc-br-rm-general-val", " " + data.rm_general);
    }
    if (data.rm_fuji_koki != null && data.rm_fuji_koki !== "") {
      setText("qc-br-rm-fuji-val", " " + data.rm_fuji_koki);
    }
    applyRmMasterForCalc(data.rm_general, data.rm_fuji_koki);

    applyBrassData(data);
    renderProcessingTable(data.processing_columns, data.processing_rows);
    applyPackagingTabData(data);
    applyRemarksData(data);
  }

  /* ----- 備考 ----- */
  var REMARK_LINE_COUNT = 10;

  function applyRemarksData(data) {
    var lines = (data && data.recorded_remarks_lines) || [];
    for (var i = 1; i <= REMARK_LINE_COUNT; i++) {
      var item = lines[i - 1] || {};
      setVal("qc-remark-line-" + i, item.text || "");
      setVal("qc-remark-line-id-" + i, item.id || "");
    }
    var internalEl = document.getElementById("qc-remarks-internal");
    if (internalEl) {
      internalEl.value = data && data.internal_remarks != null ? String(data.internal_remarks) : "";
    }
  }

  function collectRemarksPayload() {
    var lines = [];
    for (var i = 1; i <= REMARK_LINE_COUNT; i++) {
      var textEl = document.getElementById("qc-remark-line-" + i);
      var idEl = document.getElementById("qc-remark-line-id-" + i);
      lines.push({
        id: idEl ? (idEl.value || "").trim() : "",
        text: textEl ? (textEl.value || "").trim() : "",
      });
    }
    var internalEl = document.getElementById("qc-remarks-internal");
    return {
      quote_id: getQuoteId(),
      lines: lines,
      internal_remarks: internalEl ? internalEl.value : "",
    };
  }

  async function saveRemarksRows() {
    var payload = collectRemarksPayload();
    var data = await window.quotesApi("/api/quote_calc/remarks_save", payload);
    if (data && data.error) throw new Error(data.error);
    applyRemarksData(data);
    return data;
  }
  var lotOptions = [];
  var pkgLotSelect = document.getElementById("qc-pkg-lot");
  var surfLotSelect = document.getElementById("qc-surf-lot");
  var surfNameSelect = document.getElementById("qc-surf-name");
  var pkgTbody = document.getElementById("qc-pkg-tbody");
  var initTbody = document.getElementById("qc-init-tbody");
  var surfTbody = document.getElementById("qc-surf-tbody");
  var pkgTableRows = [];
  var initTableRows = [];
  var pkgConfirmOverlay = document.getElementById("qc-pkg-confirm-overlay");
  var pkgConfirmMessage = document.getElementById("qc-pkg-confirm-message");
  var pkgConfirmYes = document.getElementById("qc-pkg-confirm-yes");
  var pkgConfirmNo = document.getElementById("qc-pkg-confirm-no");
  var pkgAlertOverlay = document.getElementById("qc-pkg-alert-overlay");
  var pkgAlertMessage = document.getElementById("qc-pkg-alert-message");
  var pkgAlertOk = document.getElementById("qc-pkg-alert-ok");

  function getQuoteId() {
    return quoteIdInput ? (quoteIdInput.value || "").trim() : "";
  }

  function populateLotSelect(selectEl, options, selectedId) {
    if (!selectEl) return;
    var list = options || [];
    selectEl.innerHTML = "";
    var emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "選択してください";
    selectEl.appendChild(emptyOpt);
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      var opt = document.createElement("option");
      opt.value = o.ID != null ? String(o.ID) : "";
      opt.textContent = o.Lot != null ? String(o.Lot) : "";
      if (selectedId && opt.value === String(selectedId)) {
        opt.selected = true;
      }
      selectEl.appendChild(opt);
    }
  }

  function populateSurfaceMasterOptions(options) {
    if (!surfNameSelect) return;
    var list = options || [];
    surfNameSelect.innerHTML = "";
    var emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "選択してください";
    surfNameSelect.appendChild(emptyOpt);
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      var opt = document.createElement("option");
      opt.value = o["表面処理名"] != null ? String(o["表面処理名"]) : "";
      opt.textContent = o["表面処理名"] != null ? String(o["表面処理名"]) : "";
      surfNameSelect.appendChild(opt);
    }
  }

  function updateDeleteButtonState(btn, idVal) {
    if (!btn) return;
    var hasId = idVal != null && String(idVal).trim() !== "";
    btn.disabled = !hasId;
  }

  function updateFormButtonState(idVal, deleteBtnId, cancelBtnId) {
    var hasId = idVal != null && String(idVal).trim() !== "";
    updateDeleteButtonState(document.getElementById(deleteBtnId), idVal);
    var cancelBtn = document.getElementById(cancelBtnId);
    if (cancelBtn) cancelBtn.disabled = !hasId;
  }

  function updatePackagingFormButtonState(idVal) {
    updateFormButtonState(idVal, "qc-pkg-btn-delete", "qc-pkg-btn-cancel");
  }

  function updateInitialCostFormButtonState(idVal) {
    updateFormButtonState(idVal, "qc-init-btn-delete", "qc-init-btn-cancel");
  }

  function updateSurfaceFormButtonState(idVal) {
    updateFormButtonState(idVal, "qc-surf-btn-delete", "qc-surf-btn-cancel");
  }

  function openPkgConfirm(message) {
    if (!pkgConfirmOverlay) return Promise.resolve("no");
    return new Promise(function (resolve) {
      if (pkgConfirmMessage) {
        pkgConfirmMessage.textContent = message == null ? "" : String(message);
      }
      function finish(choice) {
        pkgConfirmOverlay.hidden = true;
        pkgConfirmOverlay.setAttribute("aria-hidden", "true");
        if (pkgConfirmYes) pkgConfirmYes.removeEventListener("click", onYes);
        if (pkgConfirmNo) pkgConfirmNo.removeEventListener("click", onNo);
        resolve(choice);
      }
      function onYes() {
        finish("yes");
      }
      function onNo() {
        finish("no");
      }
      if (pkgConfirmYes) pkgConfirmYes.addEventListener("click", onYes);
      if (pkgConfirmNo) pkgConfirmNo.addEventListener("click", onNo);
      pkgConfirmOverlay.hidden = false;
      pkgConfirmOverlay.setAttribute("aria-hidden", "false");
      if (pkgConfirmNo) pkgConfirmNo.focus();
    });
  }

  function openPkgAlert(message) {
    if (!pkgAlertOverlay) {
      window.alert(message);
      return Promise.resolve();
    }
    return new Promise(function (resolve) {
      if (pkgAlertMessage) {
        pkgAlertMessage.style.whiteSpace = "pre-line";
        pkgAlertMessage.textContent = message == null ? "" : String(message);
      }
      function finish() {
        pkgAlertOverlay.hidden = true;
        pkgAlertOverlay.setAttribute("aria-hidden", "true");
        if (pkgAlertOk) pkgAlertOk.removeEventListener("click", onOk);
        resolve();
      }
      function onOk() {
        finish();
      }
      if (pkgAlertOk) pkgAlertOk.addEventListener("click", onOk);
      pkgAlertOverlay.hidden = false;
      pkgAlertOverlay.setAttribute("aria-hidden", "false");
      if (pkgAlertOk) pkgAlertOk.focus();
    });
  }

  function getPackagingFormId() {
    var el = document.getElementById("qc-pkg-id");
    return el ? (el.value || "").trim() : "";
  }

  function getPackagingRequiredMissing() {
    var procId = pkgLotSelect ? (pkgLotSelect.value || "").trim() : "";
    var specEl = document.getElementById("qc-pkg-spec");
    var spec = specEl ? (specEl.value || "").trim() : "";
    var amount = ((document.getElementById("qc-pkg-amount") || {}).value || "").trim();
    return !procId || !spec || !amount;
  }

  async function packagingExistsForSelectedLot() {
    var procId = pkgLotSelect ? (pkgLotSelect.value || "").trim() : "";
    if (!procId) return false;
    var data = await window.quotesApi("/api/quote_calc/packaging_list", {
      processing_cost_id: procId,
    });
    if (data && data.error) throw new Error(data.error);
    var rows = data.rows || [];
    renderPackagingTable(rows);
    return rows.length > 0;
  }

  async function savePackagingRow() {
    var procId = pkgLotSelect ? (pkgLotSelect.value || "").trim() : "";
    var specEl = document.getElementById("qc-pkg-spec");
    var data = await window.quotesApi("/api/quote_calc/packaging_save", {
      id: getPackagingFormId(),
      processing_cost_id: procId,
      "梱包仕様": specEl ? specEl.value : "",
      金額: (document.getElementById("qc-pkg-amount") || {}).value || "",
    });
    if (data && data.error) throw new Error(data.error);
    renderPackagingTable(data.rows || []);
    clearPackagingForm();
    return data;
  }

  async function deletePackagingRow() {
    var rowId = getPackagingFormId();
    if (!rowId) return;
    var procId = pkgLotSelect ? (pkgLotSelect.value || "").trim() : "";
    var data = await window.quotesApi("/api/quote_calc/packaging_delete", {
      id: rowId,
      processing_cost_id: procId,
    });
    if (data && data.error) throw new Error(data.error);
    renderPackagingTable(data.rows || []);
    clearPackagingForm();
    return data;
  }

  function clearPackagingForm() {
    setVal("qc-pkg-id", "");
    setVal("qc-pkg-amount", "");
    if (document.getElementById("qc-pkg-spec")) {
      document.getElementById("qc-pkg-spec").value = "";
    }
    updatePackagingFormButtonState("");
  }

  function clearInitialCostForm() {
    setVal("qc-init-id", "");
    setVal("qc-init-name", "");
    setVal("qc-init-qty", "");
    setVal("qc-init-price", "");
    setVal("qc-init-amount", "");
    if (document.getElementById("qc-init-unit")) {
      document.getElementById("qc-init-unit").value = "";
    }
    updateInitialCostFormButtonState("");
  }

  function clearSurfaceForm() {
    setVal("qc-surf-id", "");
    setVal("qc-surf-price", "");
    if (surfNameSelect) surfNameSelect.value = "";
    updateSurfaceFormButtonState("");
  }

  function getInitialCostFormId() {
    var el = document.getElementById("qc-init-id");
    return el ? (el.value || "").trim() : "";
  }

  function getInitialCostRequiredMissing() {
    var name = ((document.getElementById("qc-init-name") || {}).value || "").trim();
    var qty = ((document.getElementById("qc-init-qty") || {}).value || "").trim();
    var unit = ((document.getElementById("qc-init-unit") || {}).value || "").trim();
    var price = ((document.getElementById("qc-init-price") || {}).value || "").trim();
    return !name || !qty || !unit || !price;
  }

  function initialCostExistsForQuote() {
    return initTableRows.length > 0;
  }

  async function saveInitialCostRow() {
    var data = await window.quotesApi("/api/quote_calc/initial_cost_save", {
      quote_id: getQuoteId(),
      id: getInitialCostFormId(),
      品名: (document.getElementById("qc-init-name") || {}).value || "",
      数量: (document.getElementById("qc-init-qty") || {}).value || "",
      単位: (document.getElementById("qc-init-unit") || {}).value || "",
      単価: (document.getElementById("qc-init-price") || {}).value || "",
      金額: (document.getElementById("qc-init-amount") || {}).value || "",
    });
    if (data && data.error) throw new Error(data.error);
    renderInitialCostTable(data.rows || []);
    clearInitialCostForm();
    return data;
  }

  async function deleteInitialCostRow() {
    var rowId = getInitialCostFormId();
    if (!rowId) return;
    var data = await window.quotesApi("/api/quote_calc/initial_cost_delete", {
      quote_id: getQuoteId(),
      id: rowId,
    });
    if (data && data.error) throw new Error(data.error);
    renderInitialCostTable(data.rows || []);
    clearInitialCostForm();
    return data;
  }

  function getSurfaceFormId() {
    var el = document.getElementById("qc-surf-id");
    return el ? (el.value || "").trim() : "";
  }

  function getSurfaceRequiredMissing() {
    var procId = surfLotSelect ? (surfLotSelect.value || "").trim() : "";
    var name = surfNameSelect ? (surfNameSelect.value || "").trim() : "";
    var price = ((document.getElementById("qc-surf-price") || {}).value || "").trim();
    return !procId || !name || !price;
  }

  async function surfaceExistsForSelectedLot() {
    var procId = surfLotSelect ? (surfLotSelect.value || "").trim() : "";
    if (!procId) return false;
    var data = await window.quotesApi("/api/quote_calc/surface_list", {
      processing_cost_id: procId,
    });
    if (data && data.error) throw new Error(data.error);
    var rows = data.rows || [];
    renderSurfaceTable(rows, data.total || "");
    return rows.length > 0;
  }

  async function saveSurfaceRow() {
    var procId = surfLotSelect ? (surfLotSelect.value || "").trim() : "";
    var data = await window.quotesApi("/api/quote_calc/surface_save", {
      id: getSurfaceFormId(),
      processing_cost_id: procId,
      処理名: surfNameSelect ? surfNameSelect.value : "",
      単価: (document.getElementById("qc-surf-price") || {}).value || "",
    });
    if (data && data.error) throw new Error(data.error);
    renderSurfaceTable(data.rows || [], data.total || "");
    clearSurfaceForm();
    return data;
  }

  async function deleteSurfaceRow() {
    var rowId = getSurfaceFormId();
    if (!rowId) return;
    var procId = surfLotSelect ? (surfLotSelect.value || "").trim() : "";
    var data = await window.quotesApi("/api/quote_calc/surface_delete", {
      id: rowId,
      processing_cost_id: procId,
    });
    if (data && data.error) throw new Error(data.error);
    renderSurfaceTable(data.rows || [], data.total || "");
    clearSurfaceForm();
    return data;
  }

  function getConditionsFormId() {
    var el = document.getElementById("qc-cond-id");
    return el ? (el.value || "").trim() : "";
  }

  function getConditionsRequiredMissing() {
    var location = ((document.getElementById("qc-cond-location") || {}).value || "").trim();
    var date = ((document.getElementById("qc-cond-date") || {}).value || "").trim();
    var status = ((document.getElementById("qc-cond-status") || {}).value || "").trim();
    var packaging = ((document.getElementById("qc-cond-packaging") || {}).value || "").trim();
    return !location || !date || !status || !packaging;
  }

  async function saveConditionsRow() {
    var data = await window.quotesApi("/api/quote_calc/conditions_save", {
      quote_id: getQuoteId(),
      id: getConditionsFormId(),
      納入場所: (document.getElementById("qc-cond-location") || {}).value || "",
      納期: (document.getElementById("qc-cond-date") || {}).value || "",
      製品納入状態: (document.getElementById("qc-cond-status") || {}).value || "",
      納入梱包形態: (document.getElementById("qc-cond-packaging") || {}).value || "",
    });
    if (data && data.error) throw new Error(data.error);
    applyConditionsData(data.conditions || {});
    return data;
  }

  function renderPackagingTable(rows) {
    if (!pkgTbody) return;
    pkgTableRows = (rows || []).slice();
    pkgTbody.innerHTML = "";
    var list = pkgTableRows;
    for (var i = 0; i < list.length; i++) {
      var row = list[i];
      var tr = document.createElement("tr");
      var tdId = document.createElement("td");
      tdId.textContent = row.ID != null ? String(row.ID) : "";
      var tdSpec = document.createElement("td");
      var a = document.createElement("a");
      a.href = "#";
      a.className = "qc-pack-spec-link";
      a.setAttribute("data-packaging-id", row.ID != null ? String(row.ID) : "");
      a.textContent = row["梱包仕様"] != null ? String(row["梱包仕様"]) : "";
      tdSpec.appendChild(a);
      var tdPrice = document.createElement("td");
      tdPrice.textContent = row["単価"] != null ? String(row["単価"]) : "";
      tr.appendChild(tdId);
      tr.appendChild(tdSpec);
      tr.appendChild(tdPrice);
      pkgTbody.appendChild(tr);
    }
  }

  function renderInitialCostTable(rows) {
    if (!initTbody) return;
    initTableRows = (rows || []).slice();
    initTbody.innerHTML = "";
    var list = initTableRows;
    var cols = ["ID", "品名", "数量", "単位", "単価", "金額"];
    for (var i = 0; i < list.length; i++) {
      var row = list[i];
      var tr = document.createElement("tr");
      for (var c = 0; c < cols.length; c++) {
        var td = document.createElement("td");
        var key = cols[c];
        if (key === "品名") {
          var link = document.createElement("a");
          link.href = "#";
          link.className = "qc-init-name-link";
          link.setAttribute("data-initial-cost-id", row.ID != null ? String(row.ID) : "");
          link.textContent = row[key] != null ? String(row[key]) : "";
          td.appendChild(link);
        } else {
          td.textContent = row[key] != null ? String(row[key]) : "";
        }
        tr.appendChild(td);
      }
      initTbody.appendChild(tr);
    }
  }

  function renderSurfaceTable(rows, total) {
    if (!surfTbody) return;
    surfTbody.innerHTML = "";
    var list = rows || [];
    for (var i = 0; i < list.length; i++) {
      var row = list[i];
      var tr = document.createElement("tr");
      var tdId = document.createElement("td");
      tdId.textContent = row.ID != null ? String(row.ID) : "";
      var tdName = document.createElement("td");
      var a = document.createElement("a");
      a.href = "#";
      a.className = "qc-surf-name-link";
      a.setAttribute("data-surface-id", row.ID != null ? String(row.ID) : "");
      a.textContent = row["処理名"] != null ? String(row["処理名"]) : "";
      tdName.appendChild(a);
      var tdPrice = document.createElement("td");
      tdPrice.textContent = row["単価"] != null ? String(row["単価"]) : "";
      tr.appendChild(tdId);
      tr.appendChild(tdName);
      tr.appendChild(tdPrice);
      surfTbody.appendChild(tr);
    }
    setVal("qc-surf-total", total != null ? total : "");
  }

  function applyConditionsData(conditions) {
    var c = conditions || {};
    setVal("qc-cond-id", c.id || "");
    setVal("qc-cond-location", c.delivery_location || "");
    setVal("qc-cond-date", c.delivery_date || "");
    setVal("qc-cond-status", c.product_delivery_status || "");
    setVal("qc-cond-packaging", c.delivery_packaging_form || "");
  }

  function applyPackagingTabData(data) {
    lotOptions = data.lot_options || [];
    populateLotSelect(pkgLotSelect, lotOptions, "");
    populateLotSelect(surfLotSelect, lotOptions, "");
    populateSurfaceMasterOptions(data.surface_master_options);
    renderInitialCostTable(data.initial_cost_rows);
    renderPackagingTable([]);
    renderSurfaceTable([], "");
    applyConditionsData(data.conditions);
    clearPackagingForm();
    clearInitialCostForm();
    clearSurfaceForm();
  }

  async function loadPackagingTableForLot(procId) {
    if (!procId) {
      renderPackagingTable([]);
      clearPackagingForm();
      return;
    }
    var data = await window.quotesApi("/api/quote_calc/packaging_list", {
      processing_cost_id: procId,
    });
    if (data && data.error) throw new Error(data.error);
    renderPackagingTable(data.rows || []);
    clearPackagingForm();
  }

  async function loadSurfaceTableForLot(procId) {
    if (!procId) {
      renderSurfaceTable([], "");
      clearSurfaceForm();
      return;
    }
    var data = await window.quotesApi("/api/quote_calc/surface_list", {
      processing_cost_id: procId,
    });
    if (data && data.error) throw new Error(data.error);
    renderSurfaceTable(data.rows || [], data.total || "");
    clearSurfaceForm();
  }

  function recalcInitialCostAmount() {
    var qtyEl = document.getElementById("qc-init-qty");
    var priceEl = document.getElementById("qc-init-price");
    var amtEl = document.getElementById("qc-init-amount");
    if (!qtyEl || !priceEl || !amtEl) return;
    var q = (qtyEl.value || "").replace(/,/g, "").trim();
    var p = (priceEl.value || "").replace(/,/g, "").trim();
    if (q === "" || p === "") return;
    var qi = parseInt(q, 10);
    var pi = parseInt(p, 10);
    if (isNaN(qi) || isNaN(pi)) return;
    amtEl.value = String(qi * pi);
  }

  if (pkgLotSelect) {
    pkgLotSelect.addEventListener("change", function () {
      var procId = (pkgLotSelect.value || "").trim();
      loadPackagingTableForLot(procId).catch(function (err) {
        console.error(err);
        window.alert(err && err.message ? err.message : String(err));
      });
    });
  }

  if (surfLotSelect) {
    surfLotSelect.addEventListener("change", function () {
      var procId = (surfLotSelect.value || "").trim();
      loadSurfaceTableForLot(procId).catch(function (err) {
        console.error(err);
        window.alert(err && err.message ? err.message : String(err));
      });
    });
  }

  if (pkgTbody) {
    pkgTbody.addEventListener("click", function (e) {
      var link = e.target.closest("a.qc-pack-spec-link");
      if (!link) return;
      e.preventDefault();
      var rowId = link.getAttribute("data-packaging-id");
      if (!rowId) return;
      window
        .quotesApi("/api/quote_calc/packaging_row", { id: rowId })
        .then(function (data) {
          if (data && data.error) throw new Error(data.error);
          var row = data.row || {};
          setVal("qc-pkg-id", row.ID);
          setVal("qc-pkg-amount", row["単価"]);
          var specEl = document.getElementById("qc-pkg-spec");
          if (specEl) specEl.value = row["梱包仕様"] || "";
          updatePackagingFormButtonState(row.ID);
        })
        .catch(function (err) {
          console.error(err);
          window.alert(err && err.message ? err.message : String(err));
        });
    });
  }

  if (initTbody) {
    initTbody.addEventListener("click", function (e) {
      var link = e.target.closest("a.qc-init-name-link");
      if (!link) return;
      e.preventDefault();
      var rowId = link.getAttribute("data-initial-cost-id");
      var quoteId = getQuoteId();
      if (!rowId || !quoteId) return;
      window
        .quotesApi("/api/quote_calc/initial_cost_row", { quote_id: quoteId, id: rowId })
        .then(function (data) {
          if (data && data.error) throw new Error(data.error);
          var row = data.row || {};
          setVal("qc-init-id", row.ID);
          setVal("qc-init-name", row["品名"]);
          setVal("qc-init-qty", row["数量"]);
          setVal("qc-init-price", row["単価"]);
          setVal("qc-init-amount", row["金額"]);
          var unitEl = document.getElementById("qc-init-unit");
          if (unitEl) unitEl.value = row["単位"] || "";
          updateInitialCostFormButtonState(row.ID);
        })
        .catch(function (err) {
          console.error(err);
          window.alert(err && err.message ? err.message : String(err));
        });
    });
  }

  if (surfTbody) {
    surfTbody.addEventListener("click", function (e) {
      var link = e.target.closest("a.qc-surf-name-link");
      if (!link) return;
      e.preventDefault();
      var rowId = link.getAttribute("data-surface-id");
      if (!rowId) return;
      window
        .quotesApi("/api/quote_calc/surface_row", { id: rowId })
        .then(function (data) {
          if (data && data.error) throw new Error(data.error);
          var row = data.row || {};
          setVal("qc-surf-id", row.ID);
          setVal("qc-surf-price", row["単価"]);
          if (surfNameSelect) surfNameSelect.value = row["処理名"] || "";
          updateSurfaceFormButtonState(row.ID);
        })
        .catch(function (err) {
          console.error(err);
          window.alert(err && err.message ? err.message : String(err));
        });
    });
  }

  ["qc-init-qty", "qc-init-price"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", recalcInitialCostAmount);
      el.addEventListener("change", recalcInitialCostAmount);
    }
  });

  var pkgRegisterBtn = document.getElementById("qc-pkg-btn-register");
  var pkgCancelBtn = document.getElementById("qc-pkg-btn-cancel");
  var pkgDeleteBtn = document.getElementById("qc-pkg-btn-delete");
  if (pkgRegisterBtn) {
    pkgRegisterBtn.addEventListener("click", function () {
      if (getPackagingRequiredMissing()) {
        openPkgAlert("必要項目が入力されていません");
        return;
      }

      var currentId = getPackagingFormId();
      var confirmPromise;
      if (currentId) {
        confirmPromise = openPkgConfirm("データを更新しますか？").then(function (choice) {
          return { choice: choice };
        });
      } else {
        confirmPromise = packagingExistsForSelectedLot()
          .then(function (exists) {
            var confirmMessage = exists
              ? "このロットでは既に登録されています\n追加で登録しますか？"
              : "登録しますか？";
            return openPkgConfirm(confirmMessage).then(function (choice) {
              return { choice: choice };
            });
          });
      }

      confirmPromise
        .then(function (result) {
          if (!result || result.choice !== "yes") return;
          return savePackagingRow();
        })
        .then(function (data) {
          if (!data) return;
          return openPkgAlert("登録しました");
        })
        .catch(function (err) {
          console.error(err);
          window.alert(err && err.message ? err.message : String(err));
        });
    });
  }
  if (pkgCancelBtn) {
    pkgCancelBtn.addEventListener("click", function () {
      if (!getPackagingFormId()) return;
      clearPackagingForm();
    });
  }
  if (pkgDeleteBtn) {
    pkgDeleteBtn.addEventListener("click", function () {
      if (!getPackagingFormId()) return;
      openPkgConfirm("削除しますか？")
        .then(function (choice) {
          if (choice !== "yes") return;
          return deletePackagingRow();
        })
        .then(function (data) {
          if (!data) return;
          return openPkgAlert("削除しました");
        })
        .catch(function (err) {
          console.error(err);
          window.alert(err && err.message ? err.message : String(err));
        });
    });
  }

  var initRegisterBtn = document.getElementById("qc-init-btn-register");
  var initCancelBtn = document.getElementById("qc-init-btn-cancel");
  var initDeleteBtn = document.getElementById("qc-init-btn-delete");
  if (initRegisterBtn) {
    initRegisterBtn.addEventListener("click", function () {
      if (getInitialCostRequiredMissing()) {
        openPkgAlert("必要項目が入力されていません");
        return;
      }

      var currentId = getInitialCostFormId();
      var confirmPromise;
      if (currentId) {
        confirmPromise = openPkgConfirm("データを更新しますか？").then(function (choice) {
          return { choice: choice };
        });
      } else {
        confirmPromise = Promise.resolve(initialCostExistsForQuote()).then(function (exists) {
          var confirmMessage = exists
            ? "既に登録されています\n追加で登録しますか？"
            : "登録しますか？";
          return openPkgConfirm(confirmMessage).then(function (choice) {
            return { choice: choice };
          });
        });
      }

      confirmPromise
        .then(function (result) {
          if (!result || result.choice !== "yes") return;
          return saveInitialCostRow();
        })
        .then(function (data) {
          if (!data) return;
          return openPkgAlert("登録しました");
        })
        .catch(function (err) {
          console.error(err);
          window.alert(err && err.message ? err.message : String(err));
        });
    });
  }
  if (initCancelBtn) {
    initCancelBtn.addEventListener("click", function () {
      if (!getInitialCostFormId()) return;
      clearInitialCostForm();
    });
  }
  if (initDeleteBtn) {
    initDeleteBtn.addEventListener("click", function () {
      if (!getInitialCostFormId()) return;
      openPkgConfirm("削除しますか？")
        .then(function (choice) {
          if (choice !== "yes") return;
          return deleteInitialCostRow();
        })
        .then(function (data) {
          if (!data) return;
          return openPkgAlert("削除しました");
        })
        .catch(function (err) {
          console.error(err);
          window.alert(err && err.message ? err.message : String(err));
        });
    });
  }

  var surfRegisterBtn = document.getElementById("qc-surf-btn-register");
  var surfCancelBtn = document.getElementById("qc-surf-btn-cancel");
  var surfDeleteBtn = document.getElementById("qc-surf-btn-delete");
  if (surfRegisterBtn) {
    surfRegisterBtn.addEventListener("click", function () {
      if (getSurfaceRequiredMissing()) {
        openPkgAlert("必要項目が入力されていません");
        return;
      }

      var currentId = getSurfaceFormId();
      var confirmPromise;
      if (currentId) {
        confirmPromise = openPkgConfirm("データを更新しますか？").then(function (choice) {
          return { choice: choice };
        });
      } else {
        confirmPromise = surfaceExistsForSelectedLot().then(function (exists) {
          var confirmMessage = exists
            ? "このロットでは既に登録されています\n追加で登録しますか？"
            : "登録しますか？";
          return openPkgConfirm(confirmMessage).then(function (choice) {
            return { choice: choice };
          });
        });
      }

      confirmPromise
        .then(function (result) {
          if (!result || result.choice !== "yes") return;
          return saveSurfaceRow();
        })
        .then(function (data) {
          if (!data) return;
          return openPkgAlert("登録しました");
        })
        .catch(function (err) {
          console.error(err);
          window.alert(err && err.message ? err.message : String(err));
        });
    });
  }
  if (surfCancelBtn) {
    surfCancelBtn.addEventListener("click", function () {
      if (!getSurfaceFormId()) return;
      clearSurfaceForm();
    });
  }
  if (surfDeleteBtn) {
    surfDeleteBtn.addEventListener("click", function () {
      if (!getSurfaceFormId()) return;
      openPkgConfirm("削除しますか？")
        .then(function (choice) {
          if (choice !== "yes") return;
          return deleteSurfaceRow();
        })
        .then(function (data) {
          if (!data) return;
          return openPkgAlert("削除しました");
        })
        .catch(function (err) {
          console.error(err);
          window.alert(err && err.message ? err.message : String(err));
        });
    });
  }

  var condRegisterBtn = document.getElementById("qc-cond-btn-register");
  if (condRegisterBtn) {
    condRegisterBtn.addEventListener("click", function () {
      if (getConditionsRequiredMissing()) {
        openPkgAlert("必要項目が入力されていません");
        return;
      }

      var currentId = getConditionsFormId();
      var confirmMessage = currentId ? "データを更新しますか？" : "登録しますか？";

      openPkgConfirm(confirmMessage)
        .then(function (choice) {
          if (choice !== "yes") return;
          return saveConditionsRow();
        })
        .then(function (data) {
          if (!data) return;
          return openPkgAlert("登録しました");
        })
        .catch(function (err) {
          console.error(err);
          window.alert(err && err.message ? err.message : String(err));
        });
    });
  }

  var remarksRegisterBtn = document.getElementById("qc-remarks-btn-register");
  if (remarksRegisterBtn) {
    remarksRegisterBtn.addEventListener("click", function () {
      if (!getQuoteId()) {
        openPkgAlert("見積りIDがありません");
        return;
      }
      openPkgConfirm("備考の登録・更新をしますか？")
        .then(function (choice) {
          if (choice !== "yes") return;
          return saveRemarksRows();
        })
        .then(function (data) {
          if (!data) return;
          return openPkgAlert("登録・更新しました");
        })
        .catch(function (err) {
          console.error(err);
          window.alert(err && err.message ? err.message : String(err));
        });
    });
  }

  var matDeleteBtn = document.getElementById("qc-mat-btn-delete");
  if (matDeleteBtn) {
    matDeleteBtn.addEventListener("click", function () {
      if (!getQuoteId()) {
        openPkgAlert("見積りIDがありません");
        return;
      }
      openPkgConfirm("材料費を削除しますか？")
        .then(function (choice) {
          if (choice !== "yes") return;
          return deleteMaterialRows();
        })
        .then(function (data) {
          if (!data) return;
          clearMaterialFormAfterDelete();
          return openPkgAlert("材料費を削除しました\n加工費の再登録を行ってください");
        })
        .catch(function (err) {
          console.error(err);
          window.alert(err && err.message ? err.message : String(err));
        });
    });
  }

  var matRegisterBtn = document.getElementById("qc-mat-btn-register");
  if (matRegisterBtn) {
    matRegisterBtn.addEventListener("click", function () {
      if (!getQuoteId()) {
        openPkgAlert("見積りIDがありません");
        return;
      }
      if (getMaterialRequiredMissing()) {
        openPkgAlert("必要項目が入力されていません");
        return;
      }
      if (brEnable && brEnable.checked && getBrassRequiredMissing()) {
        openPkgAlert("必要項目が入力されていません");
        return;
      }
      var isUpdate = materialRegistered;
      var confirmMessage = isUpdate ? "更新しますか？" : "登録しますか？";
      var doneMessage = isUpdate ? "更新しました" : "登録しました";
      openPkgConfirm(confirmMessage)
        .then(function (choice) {
          if (choice !== "yes") return;
          return saveMaterialRows();
        })
        .then(function (data) {
          if (!data) return;
          setMaterialRegStatus(true);
          if (data.brass_enabled && data.brass_id) {
            brassId = String(data.brass_id);
          } else if (!data.brass_enabled) {
            brassId = "";
          }
          return openPkgAlert(doneMessage);
        })
        .catch(function (err) {
          console.error(err);
          window.alert(err && err.message ? err.message : String(err));
        });
    });
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
        runBrassCalcChain();
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

  bindMaterialNumericInputs();
  bindMaterialCalcEvents();
  bindBrassCalcEvents();

  if (matSteelSelect) {
    // ページ読み込み時は反映しない。ユーザー変更時のみ実行（est_calc と同じ）
    matSteelSelect.addEventListener("change", function () {
      syncBrassFromMatSteel();
      reflectSteelSpecgravityToGravity();
      runMaterialChainFromShapeGravity();
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
