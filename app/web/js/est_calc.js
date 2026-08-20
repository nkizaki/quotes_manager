(function () {
  var estimateId = document.getElementById("est-5").value.trim();
  var estimateIdFromQuery =
    (new URLSearchParams(window.location.search).get("estimate_id") || "").trim();
  var currentLotId = document.getElementById("est-6").value.trim();
  /** ページ表示時点で使用中ロットID(est-6)があるか（新規／ロット全削除時は false） */
  var hasCurrentLotIdOnLoad = currentLotId !== "";
  /**
   * 切削機械～その他検査: プルダウン(data-rate-sum)やチェック連動で賃率をマスタ値へ置き換えるか。
   * 初期は false（読み込み直後に上書きしない）。該当プルダウン／チェック操作で true。
   */
  var procKakouKensaRateReplaceFromMasterEnabled = false;
  function enableProcKakouKensaRateReplaceFromMaster() {
    procKakouKensaRateReplaceFromMasterEnabled = true;
  }
  var proc5Select = document.getElementById("proc-5");
  var proc2Select = document.getElementById("proc-2");
  var proc6Input = document.getElementById("proc-6");
  var proc9Select = document.getElementById("proc-9");
  var proc14Select = document.getElementById("proc-14");
  var soryo2Select = document.getElementById("soryo-2");
  var soryo3Select = document.getElementById("soryo-3");
  var soryo4Input = document.getElementById("soryo-4");
  var soryo5Input = document.getElementById("soryo-5");
  var soryo8Select = document.getElementById("soryo-8");
  var soryo9Input = document.getElementById("soryo-9");
  var soryo13Select = document.getElementById("soryo-13");
  var soryo14Input = document.getElementById("soryo-14");
  var soryo15Input = document.getElementById("soryo-15");
  var soryo29Select = document.getElementById("soryo-29");
  var soryo30Input = document.getElementById("soryo-30");
  var soryo31Input = document.getElementById("soryo-31");
  var downloadBtn = document.querySelector(".est-download-btn");
  var resetInputsBtn = document.querySelector(".est-reset-inputs-btn");
  var saveBtn = document.querySelector(".est-save-btn");
  var addBtn = document.querySelector(".est-add-btn");
  var deleteBtn = document.querySelector(".est-delete-btn");
  var est3Input = document.getElementById("est-3");
  var est4Input = document.getElementById("est-4");
  var est7Input = document.getElementById("est-7");
  var mat1Input = document.getElementById("mat-1");
  var mat2Select = document.getElementById("mat-2");
  var mat3Input = document.getElementById("mat-3");
  var brCb1 = document.getElementById("br-cb-1");
  /** 単重↔スクラップ重の相互更新ループ防止 */
  var br56Syncing = false;
  var shinchuuGrid = document.querySelector(".shinchuu-grid");
  var soryoCardGrid = document.querySelector(".soryo-card-grid");
  var soryoNittouGrid = document.querySelector(".soryo-nittou-grid");
  var soryoPlasticGrid = document.querySelector(".soryo-plastic-grid");

  function getActiveEstimateId() {
    var est5 = document.getElementById("est-5");
    var fromInput = est5 ? (est5.value || "").trim() : "";
    return fromInput || estimateId || estimateIdFromQuery;
  }

  function getEstimateIdFromEst5Input() {
    var est5 = document.getElementById("est-5");
    return est5 ? (est5.value || "").trim() : "";
  }

  function getCurrentLotIdFromInput() {
    var el = document.getElementById("est-6");
    return el ? (el.value || "").trim() : "";
  }

  // ---------------------------------------------------------------------------
  // テキストボックス表示・入力
  // デフォルト表示: 小数第2位まで + 千の位カンマ（例 1,234.56）
  // 配列は次の 3 種類:
  //   (1) TEXTBOX_DISPLAY_DECIMAL_3_IDS … 小数第3位まで + カンマ
  //   (2a) TEXTBOX_DISPLAY_NO_FRACTION_COMMA_IDS … 小数以下なし・千の位カンマあり
  //   (2b) TEXTBOX_DISPLAY_NO_FRACTION_NO_COMMA_IDS … 小数以下なし・カンマなし（番号・コード等）
  //   (3) TEXTBOX_NUMERIC_ONLY_INPUT_IDS … 数字のみ入力（(1)(2a)(2b)を含み、その他を build で結合）
  // ---------------------------------------------------------------------------

  /** (1) 小数第3位まで表示するもの（賃率など） */
  var TEXTBOX_DISPLAY_DECIMAL_3_IDS = [
    "proc-6",
    "proc-7",
    "proc-16",
    "proc-19",
    "proc-22",
    "proc-26",
    "proc-29",
    "proc-38",
    "kensa-2",
    "kensa-5",
    "kensa-8",
    "kensa-11",
    "kensa-14",
    "kensa-18",
  ];

  /** (2a) 小数点以下なし＋千の位カンマ（数量など） */
  var TEXTBOX_DISPLAY_NO_FRACTION_COMMA_IDS = [
    "est-7",
    "mat-6",
    "mat-10",
    "mat-15",
    "br-3",
    "br-4",
    "br-8",
    "proc-1",
    "proc-10",
    "proc-11",
    "proc-31",
    "soryo-1",
    "soryo-6",
    "soryo-10",
    "soryo-14",
    "soryo-17",
    "soryo-21",
    "soryo-22",
    "soryo-27",
    "soryo-30",
    "soryo-33",
    "soryo-36",
    "shoki-hiyou-suryo",
    "shoki-hiyou-tanka",
    "shoki-hiyou-kingaku",
  ];

  /** (2b) 小数点以下なし＋カンマなし（見積番号・ロット等） */
  var TEXTBOX_DISPLAY_NO_FRACTION_NO_COMMA_IDS = [
    "est-5",
    "est-6",
    "est-8",
    "br-7",
    "shoki-hiyou-id",
  ];

  var TEXTBOX_DISPLAY_NO_FRACTION_IDS = TEXTBOX_DISPLAY_NO_FRACTION_COMMA_IDS.concat(
    TEXTBOX_DISPLAY_NO_FRACTION_NO_COMMA_IDS
  );

  function uniqTextboxIds(arr) {
    var m = {};
    arr.forEach(function (id) {
      if (id) m[id] = true;
    });
    return Object.keys(m);
  }

  /** 見積No・ロットID 等、数字以外を許す欄（(2) に含めても入力制限はしない） */
  var TEXTBOX_NUMERIC_ONLY_EXCLUDE_IDS = {
    "mat-1": true,
    "kensa-16": true,
    "kensa-20": true,
    "kensa-23": true,
    "kensa-26": true,
    "kensa-29": true,
    "soryo-4": true,
    "soryo-5": true,
    "soryo-24": true,
    "soryo-25": true,
    "soryo-29": true,
  };

  /** (3) 入力を数字のみに制限する ID（(1)(2) + 画面の数値欄。必要に応じて配列やループ内を編集） */
  function buildNumericOnlyInputIds() {
    var ids = TEXTBOX_DISPLAY_DECIMAL_3_IDS.concat(TEXTBOX_DISPLAY_NO_FRACTION_IDS);
    ids = ids.concat([
      "br-8",
      "mat-3",
      "mat-5",
      "mat-6",
      "mat-7",
      "mat-8",
      "mat-10",
      "mat-15",
      "mat-17",
      "mat-19",
      "f-in-2",
      "f-out-2",
      "f-out-5",
      "f-in-b2",
      "f-in-b3",
      "est-12",
      "est-9",
      "est-10",
      "est-11",
    ]);
    var procSkip = { 2: true, 5: true, 9: true, 14: true, 24: true, 32: true, 34: true, 36: true };
    var matSkip = { 2: true, 4: true };
    var i;
    for (i = 1; i <= 39; i++) {
      if (!procSkip[i]) ids.push("proc-" + i);
    }
    for (i = 1; i <= 19; i++) {
      if (!matSkip[i]) ids.push("mat-" + i);
    }
    for (i = 1; i <= 31; i++) {
      ids.push("kensa-" + i);
    }
    for (i = 1; i <= 39; i++) {
      ids.push("soryo-" + i);
    }
    ["f-in-1", "f-in-3", "f-out-1", "f-out-3", "f-out-4", "f-out-6", "f-in-b1", "f-in-b4", "f-in-b5", "f-in-b6"].forEach(function (x) {
      ids.push(x);
    });
    for (i = 1; i <= 10; i++) {
      ids.push("f-ch-" + i);
    }
    return uniqTextboxIds(ids).filter(function (id) {
      return !TEXTBOX_NUMERIC_ONLY_EXCLUDE_IDS[id];
    });
  }

  var TEXTBOX_NUMERIC_ONLY_INPUT_IDS = buildNumericOnlyInputIds();

  var TEXTBOX_DISPLAY_DECIMAL_3_SET = {};
  TEXTBOX_DISPLAY_DECIMAL_3_IDS.forEach(function (id) {
    TEXTBOX_DISPLAY_DECIMAL_3_SET[id] = true;
  });
  var TEXTBOX_DISPLAY_NO_FRACTION_COMMA_SET = {};
  TEXTBOX_DISPLAY_NO_FRACTION_COMMA_IDS.forEach(function (id) {
    TEXTBOX_DISPLAY_NO_FRACTION_COMMA_SET[id] = true;
  });
  var TEXTBOX_DISPLAY_NO_FRACTION_NO_COMMA_SET = {};
  TEXTBOX_DISPLAY_NO_FRACTION_NO_COMMA_IDS.forEach(function (id) {
    TEXTBOX_DISPLAY_NO_FRACTION_NO_COMMA_SET[id] = true;
  });
  var TEXTBOX_DISPLAY_NO_FRACTION_SET = {};
  TEXTBOX_DISPLAY_NO_FRACTION_IDS.forEach(function (id) {
    TEXTBOX_DISPLAY_NO_FRACTION_SET[id] = true;
  });
  var TEXTBOX_NUMERIC_ONLY_SET = {};
  TEXTBOX_NUMERIC_ONLY_INPUT_IDS.forEach(function (id) {
    TEXTBOX_NUMERIC_ONLY_SET[id] = true;
  });

  var rateTextBoxIds = TEXTBOX_DISPLAY_DECIMAL_3_IDS;

  // データ読み込み時に「0」を空欄に見せる（テキストボックスのみ）
  // チェックボックス/ラジオは type が異なるため対象外。
  function replaceLoadedZeroWithEmpty() {
    var textInputs = document.querySelectorAll('input[type="text"]');
    textInputs.forEach(function (el) {
      if (el.id === "est-1" || el.id === "est-2") return;
      if (el.id === "shoki-hiyou-id" || el.id === "shoki-hiyou-hinmei") return;
      var v = (el.value || "").trim();
      if (v === "0" || v === "0.0" || v === "0.00") el.value = "";
    });
  }

  function formatRateTextBoxTo3(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var n = parseNumEst(el.value);
    if (n === null) return;
    el.value = formatNumberForDisplay(n, 3);
  }

  function formatAllRateTextBoxesTo3() {
    rateTextBoxIds.forEach(function (id) {
      formatRateTextBoxTo3(id);
    });
  }

  function formatTextBoxByRule(id) {
    if (id === "est-1" || id === "est-2") return;
    /* 初期費用の品名は自由文字（数字のみでも数値整形しない） */
    if (id === "shoki-hiyou-hinmei") return;
    var el = document.getElementById(id);
    if (!el) return;
    var n = parseNumEst(el.value);
    if (n === null) return;
    if (TEXTBOX_DISPLAY_DECIMAL_3_SET[id]) {
      el.value = formatNumberForDisplay(n, 3);
      return;
    }
    if (TEXTBOX_DISPLAY_NO_FRACTION_COMMA_SET[id]) {
      el.value = formatNumberForDisplay(n, 0);
      return;
    }
    if (TEXTBOX_DISPLAY_NO_FRACTION_NO_COMMA_SET[id]) {
      el.value = formatNumberForDisplay(n, 0, false);
      return;
    }
    el.value = formatNumberForDisplay(n, 2);
  }

  function formatAllNonRateTextBoxesTo2() {
    var textInputs = document.querySelectorAll('input[type="text"]');
    textInputs.forEach(function (el) {
      if (!el || !el.id) return;
      formatTextBoxByRule(el.id);
    });
  }

  // blur/change 時に表示形式を統一（数値に解釈できる欄のみ formatTextBoxByRule が反映）
  (function bindAllTextboxDisplayOnBlur() {
    document.querySelectorAll('input[type="text"]').forEach(function (el) {
      if (!el.id) return;
      el.addEventListener("blur", function () { formatTextBoxByRule(el.id); });
      el.addEventListener("change", function () { formatTextBoxByRule(el.id); });
    });
  })();

  function setReadonlyByIds(ids) {
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        el.readOnly = true;
      }
    });
  }

  var alwaysReadonlyIds = [
    // 基本情報
    "est-1", "est-2", "est-3", "est-4", "est-5", "est-6", "est-9", "est-11",
    // 材料費・真鍮
    "mat-9", "mat-11", "mat-12", "mat-13", "mat-14", "mat-16", "mat-18", "br-1","br-3", "br-4", "br-9", "br-10",
    // 加工費・管理費（指定項目）
    "proc-4", "proc-10", "proc-11", "proc-12", "proc-31",
    // 加工費・管理費（賃率）
    "proc-7", "proc-16", "proc-19", "proc-22", "proc-26", "proc-29", "proc-38",
    // 加工費・管理費（原価: 表面処理2つ proc-33/proc-35 を除く）
    "proc-8", "proc-13", "proc-17", "proc-20", "proc-23", "proc-27", "proc-30", "proc-39",
    // 検査（賃率・原価すべて）
    "kensa-2", "kensa-3", "kensa-5", "kensa-6", "kensa-8", "kensa-9", "kensa-11", "kensa-12",
    "kensa-14", "kensa-15", "kensa-18", "kensa-19", "kensa-22", "kensa-25", "kensa-28", "kensa-31",
    // 段ボール
    "soryo-1", "soryo-4", "soryo-5", "soryo-6", "soryo-7", "soryo-9", "soryo-11", "soryo-12",
    "soryo-14", "soryo-15", "soryo-17", "soryo-18", "soryo-19",
    // 日当たり納入数(参考)
    "soryo-37", "soryo-38", "soryo-39",
    // 樹脂箱
    "soryo-22", "soryo-23", "soryo-28", "soryo-30", "soryo-31", "soryo-33", "soryo-34", "soryo-35",
    // 単価計算等
    "f-in-1", "f-in-3", "f-out-1", "f-out-3", "f-out-4", "f-out-6",
    // フローティングウィンドウ左下
    "f-in-b1", "f-in-b4", "f-in-b5", "f-in-b6",
    // チャージ
    "f-ch-1", "f-ch-2", "f-ch-3", "f-ch-4", "f-ch-5",
    "f-ch-6", "f-ch-7", "f-ch-8", "f-ch-9", "f-ch-10",
    // 初期費用（入力フォームの ID はサーバ採番想定のため編集不可）
    "shoki-hiyou-id",
  ];

  setReadonlyByIds(alwaysReadonlyIds);

  var alwaysReadonlySet = {};
  alwaysReadonlyIds.forEach(function (id) {
    alwaysReadonlySet[id] = true;
  });

  function setInputReadonlyWithBase(inputEl, disabledBySection) {
    if (!inputEl) return;
    inputEl.readOnly = !!disabledBySection || !!alwaysReadonlySet[inputEl.id];
  }

  function setSectionDisabled(options) {
    var disabled = !!options.disabled;
    var inputIds = options.inputIds || [];
    var selectIds = options.selectIds || [];
    var classTarget = options.classTarget;
    var className = options.className || "section-disabled";

    inputIds.forEach(function (id) {
      var inputEl = document.getElementById(id);
      setInputReadonlyWithBase(inputEl, disabled);
      if (inputEl) {
        inputEl.classList.toggle("dynamic-disabled", disabled);
        var itemEl = inputEl.closest(".kakou-item, .kensa-item, .soryo-card-item, .soryo-nittou-item, .soryo-plastic-item");
        if (itemEl) itemEl.classList.toggle("field-disabled", disabled);
      }
    });
    selectIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.disabled = disabled;
        el.classList.toggle("dynamic-disabled", disabled);
        var itemEl = el.closest(".kakou-item, .kensa-item, .soryo-card-item, .soryo-nittou-item, .soryo-plastic-item");
        if (itemEl) itemEl.classList.toggle("field-disabled", disabled);
      }
    });
    if (classTarget) classTarget.classList.toggle(className, disabled);
  }

  function resetShinchuuValuesForOff() {
    var idsToClear = ["br-1", "br-2", "br-3", "br-4", "br-5", "br-6", "br-7", "br-9", "br-10"];
    idsToClear.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = "";
    });
    var br8 = document.getElementById("br-8");
    if (br8) br8.value = "90";
    var r1 = document.getElementById("br-r1-125");
    var r2 = document.getElementById("br-r2-tanjyu");
    if (r1) r1.checked = true;
    if (r2) r2.checked = true;
  }

  function reflectMat2SpecgravityToMat12() {
    if (!mat2Select) return;
    var selected = mat2Select.options[mat2Select.selectedIndex];
    if (!selected) return;
    setInputValue("mat-12", selected.getAttribute("data-specgravity") || "");
  }

  function applyShinchuuEnabledState(enabled) {
    var shinchuuInputs = document.querySelectorAll('.shinchuu-item input[type="text"], .shinchuu-item input[type="number"]');
    var shinchuuRadios = document.querySelectorAll('.shinchuu-item input[type="radio"]');

    shinchuuInputs.forEach(function (inputEl) {
      setInputReadonlyWithBase(inputEl, !enabled);
    });

    shinchuuRadios.forEach(function (radioEl) {
      radioEl.disabled = !enabled;
    });

    if (shinchuuGrid) {
      shinchuuGrid.classList.toggle("shinchuu-disabled", !enabled);
    }
  }

  function applyBr2TanjyuScrapFieldState() {
    var br5 = document.getElementById("br-5");
    var br6 = document.getElementById("br-6");
    if (!br5 || !br6) return;
    var item5 = br5.closest(".shinchuu-item");
    var item6 = br6.closest(".shinchuu-item");
    function clearPairVisual() {
      br5.classList.remove("dynamic-disabled");
      br6.classList.remove("dynamic-disabled");
      if (item5) item5.classList.remove("field-disabled");
      if (item6) item6.classList.remove("field-disabled");
      br5.style.backgroundColor = "";
      br6.style.backgroundColor = "";
    }
    if (!brCb1 || !brCb1.checked) {
      clearPairVisual();
      return;
    }
    var checked = document.querySelector('input[name="est_shinchuu_r2"]:checked');
    var isScrap = checked && checked.value === "2";
    br5.classList.remove("dynamic-disabled");
    br6.classList.remove("dynamic-disabled");
    if (item5) item5.classList.remove("field-disabled");
    if (item6) item6.classList.remove("field-disabled");
    if (!isScrap) {
      br5.readOnly = false;
      br6.readOnly = true;
      br6.classList.add("dynamic-disabled");
      if (item6) item6.classList.add("field-disabled");
    } else {
      br6.readOnly = false;
      br5.readOnly = true;
      br5.classList.add("dynamic-disabled");
      if (item5) item5.classList.add("field-disabled");
    }
    br5.style.backgroundColor = "";
    br6.style.backgroundColor = "";
  }

  if (brCb1) {
    brCb1.addEventListener("change", function () {
      var enabled = !!brCb1.checked;
      if (!enabled) resetShinchuuValuesForOff();
      if (enabled) runMaterialChainMat15Mat17();
      applyShinchuuEnabledState(enabled);
      applyBr2TanjyuScrapFieldState();
    });
    if (!brCb1.checked) {
      resetShinchuuValuesForOff();
    }
    applyShinchuuEnabledState(!!brCb1.checked);
    applyBr2TanjyuScrapFieldState();
  }

  document.querySelectorAll('input[name="est_shinchuu_r2"]').forEach(function (radio) {
    radio.addEventListener("change", function () {
      applyBr2TanjyuScrapFieldState();
      runMaterialChainMat15Mat17();
    });
  });

  function syncShinchuuCheckboxFromMat2Material() {
    if (!brCb1 || !mat2Select) return;
    var opt = mat2Select.options[mat2Select.selectedIndex];
    var name = opt ? (opt.textContent || "").trim() : "";
    if (name !== "真鍮") {
      if (brCb1.checked) {
        brCb1.checked = false;
        resetShinchuuValuesForOff();
        applyShinchuuEnabledState(false);
      }
      return;
    }
    if (brCb1.checked) return;
    brCb1.checked = true;
    runMaterialChainMat15Mat17();
    applyShinchuuEnabledState(true);
    applyBr2TanjyuScrapFieldState();
  }

  if (mat2Select) {
    // 要件: ページ読み込み時は反映しない。ユーザー変更時のみ実行。
    mat2Select.addEventListener("change", function () {
      syncShinchuuCheckboxFromMat2Material();
      reflectMat2SpecgravityToMat12();
      runMaterialChainFromMat4Mat12();
    });
  }

  function getInputValue(id) {
    var el = document.getElementById(id);
    return el ? (el.value || "") : "";
  }

  function setInputValue(id, value) {
    var el = document.getElementById(id);
    if (el) el.value = value;
  }

  function clearInputValues(ids) {
    ids.forEach(function (id) {
      setInputValue(id, "");
    });
  }

  var rateDefaultMap = {};
  try {
    var rateDefaultMapRaw = document.body ? document.body.getAttribute("data-rate-default-map") : "";
    rateDefaultMap = rateDefaultMapRaw ? JSON.parse(rateDefaultMapRaw) : {};
  } catch (_e) {
    rateDefaultMap = {};
  }

  function getSelectedOptionRateSum(selectEl) {
    if (!selectEl) return "";
    var selected = selectEl.options[selectEl.selectedIndex];
    return selected ? (selected.getAttribute("data-rate-sum") || "") : "";
  }

  function applyGuideBushlessBehavior() {
    clearInputValues(["proc-10", "proc-11", "proc-12"]);
    if (!proc9Select) return;
    var selected = proc9Select.options[proc9Select.selectedIndex];
    if (!selected || !selected.value) return;
    var hoursNum = Number(selected.getAttribute("data-hours") || "");
    if (!Number.isFinite(hoursNum)) return;
    var cb = document.getElementById("proc-cb-1");
    var hourValue = (cb && cb.checked) ? (hoursNum + 8) : hoursNum;
    setInputValue("proc-10", String(hourValue));
    setInputValue("proc-11", String(hourValue * 3600));
    formatTextBoxByRule("proc-10");
    formatTextBoxByRule("proc-11");
  }

  function bindCheckboxClearAndRate(cfg) {
    var cb = document.getElementById(cfg.cbId);
    if (!cb) return;
    var allInputIds = (cfg.cycleIds || []).concat(cfg.rateIds || [], cfg.costIds || [], cfg.extraInputIds || []);
    var allSelectIds = cfg.selectIds || [];
    function syncDisabledOnly() {
      setSectionDisabled({
        disabled: !cb.checked,
        inputIds: allInputIds,
        selectIds: allSelectIds,
      });
    }
    function applyOnUserToggle() {
      enableProcKakouKensaRateReplaceFromMaster();
      syncDisabledOnly();
      var clearIds = (cfg.cycleIds || []).concat(cfg.rateIds || [], cfg.costIds || []);
      // OFF時は「検査名」などの補助入力も空にする
      if (!cb.checked) {
        clearIds = clearIds.concat(cfg.extraInputIds || []);
        (cfg.selectIds || []).forEach(function (sid) {
          setInputValue(sid, "");
        });
      }
      clearInputValues(clearIds);
      if (cb.checked) {
        (cfg.rateIds || []).forEach(function (rateId) {
          var v = "";
          if (typeof cfg.getRate === "function") {
            v = cfg.getRate(rateId);
          }
          setInputValue(rateId, formatRateSum(v || ""));
        });
      }
    }
    cb.addEventListener("change", applyOnUserToggle);
    syncDisabledOnly();
  }

  var procCb1 = document.getElementById("proc-cb-1");
  if (procCb1) {
    procCb1.addEventListener("change", function () {
      enableProcKakouKensaRateReplaceFromMaster();
      applyGuideBushlessBehavior();
      applyProc5ModeAndCosts();
    });
  }

  [
    {
      cbId: "proc-cb-2",
      cycleIds: ["proc-15"],
      rateIds: ["proc-16"],
      costIds: ["proc-17"],
      selectIds: ["proc-14"],
      getRate: function () { return getSelectedOptionRateSum(proc14Select); },
    },
    {
      cbId: "proc-cb-3",
      cycleIds: ["proc-18"],
      rateIds: ["proc-19"],
      costIds: ["proc-20"],
      getRate: function () { return rateDefaultMap.blast || ""; },
    },
    {
      cbId: "proc-cb-4",
      cycleIds: ["proc-21"],
      rateIds: ["proc-22"],
      costIds: ["proc-23"],
      getRate: function () { return rateDefaultMap.pressfit || ""; },
    },
    {
      cbId: "proc-cb-5",
      cycleIds: ["proc-28"],
      rateIds: ["proc-29"],
      costIds: ["proc-30"],
      getRate: function () { return rateDefaultMap.pre_inspection || ""; },
    },
    {
      cbId: "proc-cb-6",
      cycleIds: [],
      rateIds: [],
      costIds: ["proc-33", "proc-35"],
      extraInputIds: ["proc-31"],
      selectIds: ["proc-32", "proc-34"],
    },
  ].forEach(bindCheckboxClearAndRate);

  // 表面処理 ON 時のみ proc-31（ロット数）に est-7 を反映。OFF 時は空（bindCheckboxClearAndRate でクリア）
  (function wireSurfaceTreatmentLotFromEst7() {
    var cb6 = document.getElementById("proc-cb-6");
    function syncProc31FromEst7() {
      if (!cb6 || !cb6.checked) return;
      setInputValue("proc-31", getInputValue("est-7"));
      formatTextBoxByRule("proc-31");
    }
    if (cb6) {
      cb6.addEventListener("change", function () {
        if (cb6.checked) syncProc31FromEst7();
      });
    }
    if (est7Input) {
      est7Input.addEventListener("input", syncProc31FromEst7);
      est7Input.addEventListener("change", syncProc31FromEst7);
    }
    if (cb6 && !cb6.checked) {
      setInputValue("proc-31", "");
    } else if (cb6 && cb6.checked) {
      syncProc31FromEst7();
    }
  })();

  if (proc14Select) {
    proc14Select.addEventListener("change", function () {
      enableProcKakouKensaRateReplaceFromMaster();
      var cb = document.getElementById("proc-cb-2");
      if (cb && cb.checked) {
        setInputValue("proc-16", getSelectedOptionRateSum(proc14Select));
      }
    });
  }

  [
    {
      cbId: "kensa-cb-1",
      cycleIds: ["kensa-1"],
      rateIds: ["kensa-2"],
      costIds: ["kensa-3"],
      getRate: function () { return rateDefaultMap.kensa_auto || ""; },
    },
    {
      cbId: "kensa-cb-2",
      cycleIds: ["kensa-4"],
      rateIds: ["kensa-5"],
      costIds: ["kensa-6"],
      getRate: function () { return rateDefaultMap.kensa_numeric || ""; },
    },
    {
      cbId: "kensa-cb-3",
      cycleIds: ["kensa-7"],
      rateIds: ["kensa-8"],
      costIds: ["kensa-9"],
      getRate: function () { return rateDefaultMap.kensa_visual || ""; },
    },
    {
      cbId: "kensa-cb-4",
      cycleIds: ["kensa-10"],
      rateIds: ["kensa-11"],
      costIds: ["kensa-12"],
      getRate: function () { return rateDefaultMap.kensa_microscope || ""; },
    },
    {
      cbId: "kensa-cb-5",
      cycleIds: ["kensa-13"],
      rateIds: ["kensa-14"],
      costIds: ["kensa-15"],
      getRate: function () { return rateDefaultMap.kensa_microgauge || ""; },
    },
    {
      cbId: "kensa-cb-6",
      cycleIds: ["kensa-17", "kensa-21", "kensa-24", "kensa-27", "kensa-30"],
      rateIds: ["kensa-18"],
      costIds: ["kensa-19", "kensa-22", "kensa-25", "kensa-28", "kensa-31"],
      extraInputIds: ["kensa-16", "kensa-20", "kensa-23", "kensa-26", "kensa-29"],
      getRate: function () { return rateDefaultMap.kensa_other || ""; },
    },
  ].forEach(bindCheckboxClearAndRate);

  // その他検査のチェックOFF時は、検査名も空・編集不可にする（初期表示も対象）
  var kensaCb6Init = document.getElementById("kensa-cb-6");
  if (kensaCb6Init && !kensaCb6Init.checked) {
    clearInputValues(["kensa-16", "kensa-20", "kensa-23", "kensa-26", "kensa-29"]);
  }

  function applySoryoBoxState() {
    var selected = document.querySelector('input[name="est_soryo_box"]:checked');
    var isPlastic = !!(selected && selected.value === "2");
    setSectionDisabled({
      disabled: isPlastic,
      inputIds: ["soryo-1", "soryo-4", "soryo-5", "soryo-6", "soryo-7", "soryo-9", "soryo-10", "soryo-11", "soryo-12", "soryo-14", "soryo-15", "soryo-17", "soryo-18", "soryo-19"],
      selectIds: ["soryo-2", "soryo-3", "soryo-8", "soryo-13", "soryo-16"],
      classTarget: soryoCardGrid,
      className: "soryo-card-disabled",
    });
    setSectionDisabled({
      disabled: isPlastic,
      inputIds: ["soryo-36", "soryo-37", "soryo-38", "soryo-39"],
      classTarget: soryoNittouGrid,
      className: "soryo-nittou-disabled",
    });
    setSectionDisabled({
      disabled: !isPlastic,
      inputIds: ["soryo-20", "soryo-21", "soryo-22", "soryo-23", "soryo-25", "soryo-26", "soryo-27", "soryo-28", "soryo-30", "soryo-31", "soryo-33", "soryo-34", "soryo-35"],
      selectIds: ["soryo-24", "soryo-29", "soryo-32"],
      classTarget: soryoPlasticGrid,
      className: "soryo-plastic-disabled",
    });
    applySoryo24ShikyuState();
    recalcSoryoShippingPackaging();
  }

  /** 箱負担が「支給」のとき箱規格・箱価格を空にし入力不可（樹脂箱選択時のみ） */
  function applySoryo24ShikyuState() {
    var sel = document.getElementById("soryo-24");
    var b25 = document.getElementById("soryo-25");
    var b26 = document.getElementById("soryo-26");
    if (!sel || !b25 || !b26) return;
    var boxRadio = document.querySelector('input[name="est_soryo_box"]:checked');
    var plasticActive = !!(boxRadio && boxRadio.value === "2");
    if (!plasticActive) return;

    var isShikyu = (sel.value || "").trim() === "支給";
    if (isShikyu) {
      setInputValue("soryo-25", "");
      setInputValue("soryo-26", "");
      b25.readOnly = true;
      b26.readOnly = true;
      b25.classList.add("dynamic-disabled");
      b26.classList.add("dynamic-disabled");
      b25.style.backgroundColor = "";
      b26.style.backgroundColor = "";
      var item25 = b25.closest(".soryo-plastic-item");
      var item26 = b26.closest(".soryo-plastic-item");
      if (item25) item25.classList.add("field-disabled");
      if (item26) item26.classList.add("field-disabled");
    } else {
      setInputReadonlyWithBase(b25, false);
      setInputReadonlyWithBase(b26, false);
      b25.classList.remove("dynamic-disabled");
      b26.classList.remove("dynamic-disabled");
      b25.style.backgroundColor = "";
      b26.style.backgroundColor = "";
      var item25b = b25.closest(".soryo-plastic-item");
      var item26b = b26.closest(".soryo-plastic-item");
      if (item25b) item25b.classList.remove("field-disabled");
      if (item26b) item26b.classList.remove("field-disabled");
    }
  }

  var soryoBoxRadios = document.querySelectorAll('input[name="est_soryo_box"]');
  soryoBoxRadios.forEach(function (radio) {
    radio.addEventListener("change", applySoryoBoxState);
  });
  var soryo24Select = document.getElementById("soryo-24");
  if (soryo24Select) {
    soryo24Select.addEventListener("change", function () {
      applySoryo24ShikyuState();
      recalcSoryoShippingPackaging();
    });
  }
  applySoryoBoxState();

  /** 品番・品名・客先・営業・見積ID・ロットID以外を空／未選択／既定ラジオに戻す（DB保存なし） */
  function performResetInputsExceptBasic() {
    procKakouKensaRateReplaceFromMasterEnabled = true;
    var SKIP = {
      "est-1": true,
      "est-2": true,
      "est-3": true,
      "est-4": true,
      "est-5": true,
      "est-6": true,
    };
    var root = document.querySelector(".est-page-layout");
    if (!root) return;

    root.querySelectorAll("input").forEach(function (el) {
      var id = el.id;
      if (id && SKIP[id]) return;
      var t = (el.type || "").toLowerCase();
      if (t === "checkbox") {
        el.checked = false;
        return;
      }
      if (t === "radio") return;
      if (id) setInputValue(id, "");
      else el.value = "";
    });

    root.querySelectorAll("select").forEach(function (sel) {
      if (sel.id && SKIP[sel.id]) return;
      var opts = sel.querySelectorAll("option");
      var i;
      var picked = false;
      for (i = 0; i < opts.length; i++) {
        if ((opts[i].value || "") === "") {
          sel.selectedIndex = i;
          picked = true;
          break;
        }
      }
      if (!picked && opts.length) sel.selectedIndex = 0;
    });

    root.querySelectorAll('input[type="radio"]').forEach(function (el) {
      el.checked = false;
    });
    var r125 = document.getElementById("br-r1-125");
    var rtan = document.getElementById("br-r2-tanjyu");
    var sbox1 = document.getElementById("soryo-box-1");
    if (r125) r125.checked = true;
    if (rtan) rtan.checked = true;
    if (sbox1) sbox1.checked = true;

    if (brCb1) brCb1.dispatchEvent(new Event("change", { bubbles: true }));
    if (mat2Select) mat2Select.dispatchEvent(new Event("change", { bubbles: true }));
    if (proc5Select) proc5Select.dispatchEvent(new Event("change", { bubbles: true }));

    estimateId = (document.getElementById("est-5").value || "").trim();
    currentLotId = (document.getElementById("est-6").value || "").trim();
    replaceLoadedZeroWithEmpty();

    function selectOptionByVisibleText(selectId, label) {
      var sel = document.getElementById(selectId);
      if (!sel || !label) return;
      var want = String(label).trim();
      var opts = sel.querySelectorAll("option");
      var i;
      for (i = 0; i < opts.length; i++) {
        if ((opts[i].textContent || "").trim() === want) {
          sel.selectedIndex = i;
          sel.dispatchEvent(new Event("change", { bubbles: true }));
          return;
        }
      }
    }

    setInputValue("mat-17", "5");
    formatTextBoxByRule("mat-17");
    selectOptionByVisibleText("proc-24", "四槽洗浄");
    selectOptionByVisibleText("proc-36", "人件費");
    setInputValue("f-in-2", "0");
    setInputValue("f-out-2", "8");
    setInputValue("f-out-5", "8");
    setInputValue("f-in-b2", "26");
    formatTextBoxByRule("f-in-2");
    formatTextBoxByRule("f-out-2");
    formatTextBoxByRule("f-out-5");
    formatTextBoxByRule("f-in-b2");
    applySoryoBoxState();
    applySoryo24ShikyuState();
    reflectRateSumToProc7();
    recalcSoryoShippingPackaging();
    schedulePriceAggregation();
  }

  function formatRateSum(value) {
    var num = Number(value);
    if (!Number.isFinite(num)) return "";
    return roundToDecimals(num, 3).toFixed(3);
  }

  function reflectRateSumToProc7() {
    if (!procKakouKensaRateReplaceFromMasterEnabled) return;
    if (!proc5Select) return;
    var proc7Input = document.getElementById("proc-7");
    if (!proc7Input) return;
    var selected = proc5Select.options[proc5Select.selectedIndex];
    if (!selected) {
      proc7Input.value = "";
      return;
    }
    var rateSum = selected.getAttribute("data-rate-sum") || "";
    proc7Input.value = formatRateSum(rateSum);
  }

  function isOtherUnderOneDayProc5Selected() {
    if (!proc5Select) return false;
    var selected = proc5Select.options[proc5Select.selectedIndex];
    if (!selected) return false;
    var name = (selected.textContent || "").trim();
    return name === "その他(1日未満)";
  }

  /** readonly/disabled のみ。背景色は style.css / app-theme.css に任せる（インライン色で他入力とずれないようにする） */
  function setReadonlyAndBackground(id, readonly) {
    var el = document.getElementById(id);
    if (!el) return;
    el.readOnly = !!readonly;
    el.style.backgroundColor = "";
  }

  function setDisabledAndBackground(id, disabled) {
    var el = document.getElementById(id);
    if (!el) return;
    el.disabled = !!disabled;
    el.style.backgroundColor = "";
  }

  function themeVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function setInputHintBackground(id, color) {
    var el = document.getElementById(id);
    if (!el) return;
    el.style.backgroundColor = color || "";
  }

  /**
   * しきい値による背景ヒント（色は app-theme.css の --input-hint-* を参照）
   * - proc-3 × est-11: 日数 < 交換サイクル → bad、一致 → caution
   * - 段ボール選択時 soryo-11 / soryo-38: 重量しきい値で good / caution / bad
   */
  function applyConditionalTextboxBackgrounds() {
    var cycle = parseNumEst(getInputValue("proc-3"));
    var days = parseNumEst(getInputValue("est-11"));
    var proc3Color = "";
    if (cycle !== null && days !== null) {
      if (days < cycle) {
        proc3Color = themeVar("--input-hint-proc3-bad");
      } else if (days === cycle) {
        proc3Color = themeVar("--input-hint-proc3-caution");
      }
    }
    setInputHintBackground("proc-3", proc3Color);

    var isCardboard = getRadioValue("est_soryo_box") === "1";

    function getWeightHintColor(weight) {
      if (weight === null) return "";
      if (weight <= 12) return themeVar("--input-hint-weight-good");
      if (weight < 15) return themeVar("--input-hint-weight-caution");
      return themeVar("--input-hint-weight-bad");
    }

    var soryo11 = parseNumEst(getInputValue("soryo-11"));
    var soryo38 = parseNumEst(getInputValue("soryo-38"));
    setInputHintBackground("soryo-11", isCardboard ? getWeightHintColor(soryo11) : "");
    setInputHintBackground("soryo-38", isCardboard ? getWeightHintColor(soryo38) : "");
  }

  function calcProc8Normal() {
    var cycle = parseNumEst(getInputValue("proc-6"));
    var rate = parseNumEst(getInputValue("proc-7"));
    if (cycle === null || rate === null || cycle <= 0 || rate <= 0) {
      setInputValue("proc-8", "0");
      return;
    }
    var v = ceilToDecimals(cycle * rate, 2);
    if (v < 0.01) v = 0.01;
    setInputValue("proc-8", formatPriceOut(v));
  }

  function calcProc8OtherUnderOneDay() {
    var rate = parseNumEst(getInputValue("proc-7"));
    var lot = parseNumEst(getInputValue("est-7"));
    // 必要値が無い場合は保存済み値を保持（ロード時に空へ潰さない）
    if (rate === null || lot === null || lot <= 0 || rate <= 0) return;
    var v = ceilToDecimals(rate / lot, 2);
    if (v < 0.01) v = 0.01;
    setInputValue("proc-8", formatPriceOut(v));
  }

  function calcProc12AndProc13ForNormalProc5() {
    // 計算前にリセット（空欄は 0 扱い）
    setZeroAndReset(["proc-12", "proc-13"]);
    var sec = parseNumOrZeroEst(getInputValue("proc-11"));
    var rate = parseNumOrZeroEst(getInputValue("proc-7"));
    var lot = parseNumOrZeroEst(getInputValue("est-7"));
    var amount = sec * rate;
    if (Number.isFinite(amount) && amount > 0) {
      setInputValue("proc-12", formatPriceOut(amount));
    }
    if (lot > 0 && Number.isFinite(amount)) {
      var setCost = ceilToDecimals(amount / lot, 2);
      setInputValue("proc-13", formatPriceOut(setCost));
    }
  }

  function applyProc5ModeAndCosts() {
    var isOtherMode = isOtherUnderOneDayProc5Selected();

    if (isOtherMode) {
      // 値は保持しつつ編集不可
      setReadonlyAndBackground("proc-13", true);
      setReadonlyAndBackground("proc-6", true);
      // セットガイドブッシュレス／難易度は設定不可（値は保持）
      setDisabledAndBackground("proc-cb-1", true);
      setDisabledAndBackground("proc-9", true);
      setReadonlyAndBackground("proc-10", true);
      setReadonlyAndBackground("proc-11", true);
      setReadonlyAndBackground("proc-12", true);
      // 賃率は編集可（値は保持）
      setReadonlyAndBackground("proc-7", false);
      calcProc8OtherUnderOneDay();
    } else {
      setDisabledAndBackground("proc-cb-1", false);
      setDisabledAndBackground("proc-9", false);
      setReadonlyAndBackground("proc-10", true);
      setReadonlyAndBackground("proc-11", true);
      setReadonlyAndBackground("proc-12", true);
      setReadonlyAndBackground("proc-13", true);
      setReadonlyAndBackground("proc-6", false);
      setReadonlyAndBackground("proc-7", true);
      applyGuideBushlessBehavior();
      calcProc8Normal();
      calcProc12AndProc13ForNormalProc5();
    }
    applyProc5ModeAndCosts._prevOtherMode = isOtherMode;
    schedulePriceAggregation();
  }
  applyProc5ModeAndCosts._prevOtherMode = false;

  function bindRateReflect(selectEl, targetInputEl) {
    if (!selectEl || !targetInputEl) return;
    var update = function () {
      var selected = selectEl.options[selectEl.selectedIndex];
      if (!selected) {
        targetInputEl.value = "";
        return;
      }
      targetInputEl.value = formatRateSum(selected.getAttribute("data-rate-sum") || "");
    };
    selectEl.addEventListener("change", update);
    update();
  }

  // 切削機械が「別の選択肢に変わった」ときだけ賃率をマスタ(data-rate-sum)へ同期する。
  // 同一値での change 再発火（初期化・スクリプト連携など）では保存済み proc-7 を潰さない。
  var lastProc5ValueForRateSync = proc5Select ? String(proc5Select.value || "") : "";

  if (proc5Select && proc6Input) {
    proc5Select.addEventListener("change", function () {
      enableProcKakouKensaRateReplaceFromMaster();
      var nextIsOther = isOtherUnderOneDayProc5Selected();
      var wasOther = !!applyProc5ModeAndCosts._prevOtherMode;
      // ユーザー操作で「その他(1日未満)」へ切替えた時のみ、賃率・原価を空にする
      if (nextIsOther && !wasOther) {
        setInputValue("proc-7", "");
        setInputValue("proc-8", "");
      }
      var keyNow = String(proc5Select.value || "");
      if (!nextIsOther) {
        if (keyNow !== lastProc5ValueForRateSync) {
          reflectRateSumToProc7();
          lastProc5ValueForRateSync = keyNow;
        }
      } else {
        lastProc5ValueForRateSync = keyNow;
      }
      applyProc5ModeAndCosts();
    });
    // 賃率(proc-7)のマスタ自動補完は行わない。
    // ・ロットあり: 空欄でも保存値のまま（最新マスタで上書きしない）。ページ末尾の初期化も同様。
    // ・ロットなし: performResetInputsExceptBasic 末尾の reflectRateSumToProc7 で既定どおり入れる。
  }
  if (proc9Select) {
    proc9Select.addEventListener("change", function () {
      enableProcKakouKensaRateReplaceFromMaster();
      applyGuideBushlessBehavior();
      applyProc5ModeAndCosts();
    });
  }

  ["proc-6", "proc-7", "proc-11", "est-7"].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", applyProc5ModeAndCosts);
    el.addEventListener("change", applyProc5ModeAndCosts);
  });

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

  function bindNumericOnlyInputsFromConfig() {
    TEXTBOX_NUMERIC_ONLY_INPUT_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || el.tagName !== "INPUT") return;
      var allowDecimal = !TEXTBOX_DISPLAY_NO_FRACTION_SET[id];
      bindNumericOnlyInput(el, { allowDecimal: allowDecimal });
    });
  }

  bindNumericOnlyInputsFromConfig();

  /** 初期費用: 数量・単価が両方入力済みなら金額を 数量×単価（整数）で上書き（金額は手入力も可・再計算時に上書き） */
  function updateShokiHiyouKingakuFromQtyUnitPrice() {
    var qEl = document.getElementById("shoki-hiyou-suryo");
    var pEl = document.getElementById("shoki-hiyou-tanka");
    var kEl = document.getElementById("shoki-hiyou-kingaku");
    if (!qEl || !pEl || !kEl) return;
    var qs = (qEl.value || "").replace(/,/g, "").trim();
    var ps = (pEl.value || "").replace(/,/g, "").trim();
    if (qs === "" || ps === "") return;
    var qi = Math.trunc(Number(qs));
    var pi = Math.trunc(Number(ps));
    if (!Number.isFinite(qi) || !Number.isFinite(pi)) return;
    var prod = qi * pi;
    if (!Number.isFinite(prod)) return;
    kEl.value = formatNumberForDisplay(prod, 0);
  }

  function syncShokiHiyouDeleteButtonDisabled() {
    var delBtn = document.getElementById("shoki-hiyou-btn-delete");
    var idEl = document.getElementById("shoki-hiyou-id");
    if (!delBtn || !idEl) return;
    var idv = (idEl.value || "").replace(/,/g, "").trim();
    delBtn.disabled = !idv;
  }

  function applyShokiHiyouRowToForm(r) {
    if (!r) return;
    function setInputVal(id, v) {
      var el = document.getElementById(id);
      if (!el) return;
      el.value = v == null ? "" : String(v);
    }
    setInputVal("shoki-hiyou-id", r.ID);
    setInputVal("shoki-hiyou-hinmei", r["品名"]);
    setInputVal("shoki-hiyou-suryo", r["数量"]);
    setInputVal("shoki-hiyou-tanka", r["単価"]);
    setInputVal("shoki-hiyou-kingaku", r["金額"]);
    var tani = document.getElementById("shoki-hiyou-tani");
    if (tani) {
      var tv = r["単位"] == null ? "" : String(r["単位"]).trim();
      tani.value = tv;
    }
    ["shoki-hiyou-suryo", "shoki-hiyou-tanka", "shoki-hiyou-kingaku"].forEach(function (fid) {
      formatTextBoxByRule(fid);
    });
    syncShokiHiyouDeleteButtonDisabled();
  }

  function renderShokiHiyouTableBody(rows) {
    var tbody = document.querySelector("#shoki-hiyou-table tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    (rows || []).forEach(function (row) {
      var tr = document.createElement("tr");
      function tdText(txt) {
        var td = document.createElement("td");
        td.textContent = txt == null ? "" : String(txt);
        return td;
      }
      tr.appendChild(tdText(row.ID));
      var tdH = document.createElement("td");
      var idVal = row.ID != null && String(row.ID).trim() !== "" ? String(row.ID).trim() : "";
      if (idVal) {
        var a = document.createElement("a");
        a.href = "#";
        a.className = "shoki-hiyou-hinmei-link";
        a.setAttribute("data-initial-cost-id", idVal);
        a.textContent = row["品名"] == null ? "" : String(row["品名"]);
        tdH.appendChild(a);
      } else {
        tdH.textContent = row["品名"] == null ? "" : String(row["品名"]);
      }
      tr.appendChild(tdH);
      tr.appendChild(tdText(row["数量"]));
      tr.appendChild(tdText(row["単位"]));
      tr.appendChild(tdText(row["単価"]));
      tr.appendChild(tdText(row["金額"]));
      tbody.appendChild(tr);
    });
  }

  function clearShokiHiyouForm() {
    ["shoki-hiyou-id", "shoki-hiyou-hinmei", "shoki-hiyou-suryo", "shoki-hiyou-tanka", "shoki-hiyou-kingaku"].forEach(
      function (id) {
        var el = document.getElementById(id);
        if (el) el.value = "";
      }
    );
    var tani = document.getElementById("shoki-hiyou-tani");
    if (tani) tani.value = "";
    syncShokiHiyouDeleteButtonDisabled();
  }

  function shokiHiyouValidateRegisterFields() {
    var hin = (document.getElementById("shoki-hiyou-hinmei").value || "").trim();
    var suryo = (document.getElementById("shoki-hiyou-suryo").value || "").replace(/,/g, "").trim();
    var tani = (document.getElementById("shoki-hiyou-tani").value || "").trim();
    var tanka = (document.getElementById("shoki-hiyou-tanka").value || "").replace(/,/g, "").trim();
    if (!hin) {
      window.alert("品名を入力してください");
      return false;
    }
    if (!suryo) {
      window.alert("数量を入力してください");
      return false;
    }
    if (!tani) {
      window.alert("単位を選択してください");
      return false;
    }
    if (!tanka) {
      window.alert("単価を入力してください");
      return false;
    }
    return true;
  }

  function shokiHiyouBuildSavePayload() {
    var estimateId = getActiveEstimateId();
    var idEl = document.getElementById("shoki-hiyou-id");
    var idVal = idEl ? (idEl.value || "").replace(/,/g, "").trim() : "";
    var payload = {
      estimate_id: estimateId,
      id: idVal,
    };
    payload["品名"] = (document.getElementById("shoki-hiyou-hinmei").value || "").trim();
    payload["数量"] = getValue("shoki-hiyou-suryo");
    payload["単位"] = (document.getElementById("shoki-hiyou-tani").value || "").trim();
    payload["単価"] = getValue("shoki-hiyou-tanka");
    payload["金額"] = getValue("shoki-hiyou-kingaku");
    return payload;
  }

  (function bindShokiHiyouAmountAutoCalc() {
    var suryo = document.getElementById("shoki-hiyou-suryo");
    var tanka = document.getElementById("shoki-hiyou-tanka");
    if (suryo) {
      suryo.addEventListener("input", updateShokiHiyouKingakuFromQtyUnitPrice);
      suryo.addEventListener("change", updateShokiHiyouKingakuFromQtyUnitPrice);
    }
    if (tanka) {
      tanka.addEventListener("input", updateShokiHiyouKingakuFromQtyUnitPrice);
      tanka.addEventListener("change", updateShokiHiyouKingakuFromQtyUnitPrice);
    }
  })();

  /** 初期費用一覧: 品名クリックで API から 1 件取得しフォームへ反映 */
  (function bindShokiHiyouTableHinmeiClick() {
    var table = document.getElementById("shoki-hiyou-table");
    if (!table) return;
    table.addEventListener("click", function (e) {
      var a = e.target.closest("a.shoki-hiyou-hinmei-link");
      if (!a) return;
      e.preventDefault();
      var rowId = (a.getAttribute("data-initial-cost-id") || "").trim();
      var estimateId = getActiveEstimateId();
      if (!rowId || !estimateId) return;
      var url =
        "/api/est_calc/initial_cost_row?estimate_id=" +
        encodeURIComponent(estimateId) +
        "&id=" +
        encodeURIComponent(rowId);
      fetch(url)
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, status: res.status, data: data };
          });
        })
        .then(function (result) {
          var data = result.data;
          if (!result.ok || data.error) {
            window.alert(data.error || "取得に失敗しました");
            return;
          }
          var r = data.row;
          if (!r) return;
          applyShokiHiyouRowToForm(r);
        })
        .catch(function () {
          window.alert("取得に失敗しました");
        });
    });
  })();

  function bindSoryoReflect(selectEl, targets) {
    if (!selectEl) return;
    var update = function () {
      var selected = selectEl.options[selectEl.selectedIndex];
      targets.forEach(function (target) {
        if (!target.inputEl) return;
        if (!selected || !selected.value) {
          target.inputEl.value = "";
          return;
        }
        target.inputEl.value = selected.getAttribute(target.attrName) || "";
      });
    };
    selectEl.addEventListener("change", update);
    // 初期表示時は保存済み値を優先し、選択変更時のみ連動反映する
  }

  bindSoryoReflect(soryo3Select, [
    { inputEl: soryo4Input, attrName: "data-size" },
    { inputEl: soryo5Input, attrName: "data-weight" },
  ]);
  bindSoryoReflect(soryo8Select, [{ inputEl: soryo9Input, attrName: "data-price" }]);
  bindSoryoReflect(soryo13Select, [
    { inputEl: soryo14Input, attrName: "data-capacity" },
    { inputEl: soryo15Input, attrName: "data-price" },
  ]);
  bindSoryoReflect(soryo29Select, [
    { inputEl: soryo30Input, attrName: "data-capacity" },
    { inputEl: soryo31Input, attrName: "data-price" },
  ]);

  /** 梱包サイズ(soryo-3)の選択から箱サイズ・重量へ反映（納入先変更時も同じ値を取る） */
  function reflectSoryoBoxSizeAndWeightFromPackaging() {
    if (!soryo3Select || !soryo4Input || !soryo5Input) return;
    var selected = soryo3Select.options[soryo3Select.selectedIndex];
    if (!selected || !selected.value) {
      soryo4Input.value = "";
      soryo5Input.value = "";
      return;
    }
    soryo4Input.value = selected.getAttribute("data-size") || "";
    soryo5Input.value = selected.getAttribute("data-weight") || "";
  }

  function reflectSoryoShippingByRegionAndSize() {
    reflectSoryoBoxSizeAndWeightFromPackaging();
    if (!soryo2Select || !soryo3Select) return;
    var soryo6Input = document.getElementById("soryo-6");
    if (!soryo6Input) return;

    var regionOpt = soryo2Select.options[soryo2Select.selectedIndex];
    var sizeOpt = soryo3Select.options[soryo3Select.selectedIndex];
    var reg = regionOpt ? (regionOpt.getAttribute("data-reg") || "").trim() : "";
    var sizeName = sizeOpt ? (sizeOpt.text || "").trim() : "";
    if (!reg || !sizeName || sizeName === "未選択") {
      return;
    }

    var url =
      "/api/est_calc/shipping_by_region_size?reg=" +
      encodeURIComponent(reg) +
      "&size_name=" +
      encodeURIComponent(sizeName);

    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && !data.error) {
          if (data.shipping == null) {
            soryo6Input.value = "";
          } else {
            soryo6Input.value = String(data.shipping);
            formatTextBoxByRule("soryo-6");
          }
        }
        recalcSoryoShippingPackaging();
        schedulePriceAggregation();
      })
      .catch(function () {
        // 送料反映エラーは画面操作を止めない
      });
  }
  if (soryo2Select) soryo2Select.addEventListener("change", reflectSoryoShippingByRegionAndSize);
  if (soryo3Select) soryo3Select.addEventListener("change", reflectSoryoShippingByRegionAndSize);

  function sanitizeFilenamePart(text, maxLen) {
    var s = (text || "").replace(/[\r\n]/g, " ").trim();
    s = s.replace(/[<>:"/\\|?*]/g, "_");
    if (typeof maxLen === "number" && maxLen >= 0) {
      s = s.slice(0, maxLen);
    }
    return s;
  }

  function buildDefaultFileName() {
    var customer = sanitizeFilenamePart(est3Input ? est3Input.value : "", 8);
    var estimate = sanitizeFilenamePart(estimateId, null);
    var lot = sanitizeFilenamePart(currentLotId, null);
    return "原価見積書_" + customer + "_" + estimate + "_" + lot + ".xlsx";
  }

  function showExportConfirmDialog() {
    return new Promise(function (resolve) {
      var overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.background = "rgba(0, 0, 0, 0.35)";
      overlay.style.zIndex = "3000";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";

      var dialog = document.createElement("div");
      dialog.style.width = "420px";
      dialog.style.maxWidth = "calc(100vw - 32px)";
      dialog.style.background = "#fff";
      dialog.style.border = "1px solid #ccc";
      dialog.style.borderRadius = "6px";
      dialog.style.padding = "14px";
      dialog.style.boxSizing = "border-box";

      var title = document.createElement("div");
      title.textContent = "確認";
      title.style.fontWeight = "700";
      title.style.marginBottom = "10px";

      var message = document.createElement("div");
      message.innerHTML =
        "原価見積書への出力前に内容を保存しますか？<br>(いいえで保存せずに出力)";
      message.style.marginBottom = "14px";
      message.style.lineHeight = "1.5";

      var actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.justifyContent = "flex-end";
      actions.style.gap = "8px";

      function makeButton(label, value) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = label;
        btn.addEventListener("click", function () {
          document.body.removeChild(overlay);
          resolve(value);
        });
        return btn;
      }

      actions.appendChild(makeButton("はい", "yes"));
      actions.appendChild(makeButton("いいえ", "no"));
      actions.appendChild(makeButton("キャンセル", "cancel"));

      dialog.appendChild(title);
      dialog.appendChild(message);
      dialog.appendChild(actions);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
    });
  }

  function showSaveConfirmDialog() {
    return new Promise(function (resolve) {
      var overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.background = "rgba(0, 0, 0, 0.35)";
      overlay.style.zIndex = "3000";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";

      var dialog = document.createElement("div");
      dialog.style.width = "420px";
      dialog.style.maxWidth = "calc(100vw - 32px)";
      dialog.style.background = "#fff";
      dialog.style.border = "1px solid #ccc";
      dialog.style.borderRadius = "6px";
      dialog.style.padding = "14px";
      dialog.style.boxSizing = "border-box";

      var title = document.createElement("div");
      title.textContent = "確認";
      title.style.fontWeight = "700";
      title.style.marginBottom = "10px";

      var message = document.createElement("div");
      message.innerHTML =
        "入力した見積りデータを保存しますか？<br>(使用中ロットID欄が空の場合新規で差分が登録されます)";
      message.style.marginBottom = "14px";
      message.style.lineHeight = "1.5";

      var actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.justifyContent = "flex-end";
      actions.style.gap = "8px";

      function makeButton(label, value) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = label;
        btn.addEventListener("click", function () {
          document.body.removeChild(overlay);
          resolve(value);
        });
        return btn;
      }

      actions.appendChild(makeButton("はい", "yes"));
      actions.appendChild(makeButton("いいえ", "no"));
      dialog.appendChild(title);
      dialog.appendChild(message);
      dialog.appendChild(actions);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
    });
  }

  function showYesNoConfirmDialog(titleText, messageText, messageHtml) {
    return new Promise(function (resolve) {
      var overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.background = "rgba(0, 0, 0, 0.35)";
      overlay.style.zIndex = "3000";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";

      var dialog = document.createElement("div");
      dialog.style.width = "420px";
      dialog.style.maxWidth = "calc(100vw - 32px)";
      dialog.style.background = "#fff";
      dialog.style.border = "1px solid #ccc";
      dialog.style.borderRadius = "6px";
      dialog.style.padding = "14px";
      dialog.style.boxSizing = "border-box";

      var title = document.createElement("div");
      title.textContent = titleText || "確認";
      title.style.fontWeight = "700";
      title.style.marginBottom = "10px";

      var message = document.createElement("div");
      if (messageHtml != null) {
        message.innerHTML = messageHtml;
      } else {
        message.textContent = messageText || "";
      }
      message.style.marginBottom = "14px";
      message.style.lineHeight = "1.5";

      var actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.justifyContent = "flex-end";
      actions.style.gap = "8px";

      function makeButton(label, value) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = label;
        btn.addEventListener("click", function () {
          document.body.removeChild(overlay);
          resolve(value);
        });
        return btn;
      }

      actions.appendChild(makeButton("はい", "yes"));
      actions.appendChild(makeButton("いいえ", "no"));

      dialog.appendChild(title);
      dialog.appendChild(message);
      dialog.appendChild(actions);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
    });
  }

  function showOkDialog(titleText, messageText) {
    return new Promise(function (resolve) {
      var overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.background = "rgba(0, 0, 0, 0.35)";
      overlay.style.zIndex = "3000";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";

      var dialog = document.createElement("div");
      dialog.style.width = "420px";
      dialog.style.maxWidth = "calc(100vw - 32px)";
      dialog.style.background = "#fff";
      dialog.style.border = "1px solid #ccc";
      dialog.style.borderRadius = "6px";
      dialog.style.padding = "14px";
      dialog.style.boxSizing = "border-box";

      var title = document.createElement("div");
      title.textContent = titleText || "確認";
      title.style.fontWeight = "700";
      title.style.marginBottom = "10px";

      var message = document.createElement("div");
      message.textContent = messageText || "";
      message.style.marginBottom = "14px";
      message.style.lineHeight = "1.5";

      var actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.justifyContent = "flex-end";

      var okBtn = document.createElement("button");
      okBtn.type = "button";
      okBtn.textContent = "OK";
      okBtn.addEventListener("click", function () {
        document.body.removeChild(overlay);
        resolve();
      });

      actions.appendChild(okBtn);
      dialog.appendChild(title);
      dialog.appendChild(message);
      dialog.appendChild(actions);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
    });
  }

  function showSavedDialog() {
    return new Promise(function (resolve) {
      var overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.background = "rgba(0, 0, 0, 0.35)";
      overlay.style.zIndex = "3000";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";

      var dialog = document.createElement("div");
      dialog.style.width = "360px";
      dialog.style.maxWidth = "calc(100vw - 32px)";
      dialog.style.background = "#fff";
      dialog.style.border = "1px solid #ccc";
      dialog.style.borderRadius = "6px";
      dialog.style.padding = "14px";
      dialog.style.boxSizing = "border-box";

      var title = document.createElement("div");
      title.textContent = "確認";
      title.style.fontWeight = "700";
      title.style.marginBottom = "10px";

      var message = document.createElement("div");
      message.textContent = "保存しました";
      message.style.marginBottom = "14px";

      var actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.justifyContent = "flex-end";

      var okBtn = document.createElement("button");
      okBtn.type = "button";
      okBtn.textContent = "OK";
      okBtn.addEventListener("click", function () {
        document.body.removeChild(overlay);
        resolve();
      });

      actions.appendChild(okBtn);
      dialog.appendChild(title);
      dialog.appendChild(message);
      dialog.appendChild(actions);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
    });
  }

  function getMat2Name() {
    if (!mat2Select) return "";
    var selected = mat2Select.options[mat2Select.selectedIndex];
    return selected ? selected.text : "";
  }

  function getSelectedTextById(id) {
    var el = document.getElementById(id);
    if (!el || el.tagName !== "SELECT") return "";
    var selected = el.options[el.selectedIndex];
    return selected ? (selected.text || "").trim() : "";
  }

  function getValue(id) {
    var el = document.getElementById(id);
    if (!el) return "";
    var v = el.value;
    if (TEXTBOX_NUMERIC_ONLY_SET[id]) {
      var n = parseNumEst(v);
      return n === null ? "" : String(n);
    }
    return v;
  }

  function getCheckedValue(id, checkedValue) {
    var el = document.getElementById(id);
    if (!el) return "0";
    return el.checked ? checkedValue : "0";
  }

  function getRadioValue(name) {
    var checked = document.querySelector('input[name="' + name + '"]:checked');
    return checked ? checked.value : "";
  }

  /** 単価計算等・集計用 */
  function parseNumEst(v) {
    if (v == null || v === "") return null;
    var s = String(v).replace(/,/g, "").trim();
    if (s === "") return null;
    var n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function parseNumOrZeroEst(v) {
    var n = parseNumEst(v);
    return n === null ? 0 : n;
  }

  function ceilToDecimals(x, places) {
    var p = Math.pow(10, places);
    // 浮動小数誤差で 0.01 だけ不正に繰り上がるのを防ぐ
    return Math.ceil((x - 1e-9) * p) / p;
  }

  function roundToDecimals(x, places) {
    var p = Math.pow(10, places);
    // 浮動小数誤差の丸めズレ対策
    return Math.round((x + 1e-9) * p) / p;
  }

  /** 千の位カンマ + 小数 places 桁（整数部のみのときは小数点なし） */
  /** @param {boolean} [useComma] 千の位カンマ（省略時 true） */
  function formatNumberForDisplay(n, places, useComma) {
    if (!Number.isFinite(n)) return "";
    var fixed = roundToDecimals(n, places).toFixed(places);
    if (useComma === false) return fixed;
    var parts = fixed.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.length > 1 ? parts[0] + "." + parts[1] : parts[0];
  }

  function formatPriceOut(n) {
    if (n === null || n === undefined || !Number.isFinite(n)) return "";
    return formatNumberForDisplay(ceilToDecimals(n, 2), 2);
  }

  /** 送料・梱包: 選択中モードの計算結果のみ空にして再計算（他方・日当たりは保持） */
  function recalcSoryoShippingPackaging() {
    var boxMode = getRadioValue("est_soryo_box");
    var isPlastic = boxMode === "2";
    var isCardboard = boxMode === "1";

    function round2(n) {
      return roundToDecimals(n, 2);
    }

    function calcTrayBlock(iriId, capId, priceId, lidId, outN, outSum, outUnit) {
      var iri = parseNumEst(getInputValue(iriId));
      var cap = parseNumEst(getInputValue(capId));
      var price = parseNumEst(getInputValue(priceId));
      var lidEl = document.getElementById(lidId);
      var lid = lidEl ? parseNumOrZeroEst(lidEl.value) : 0;
      if (cap === null || cap <= 0 || iri === null || iri < 0) return;
      var x = Math.floor(iri / cap);
      if (iri % cap !== 0) x += 1;
      x += lid;
      setInputValue(outN, formatNumberForDisplay(x, 0));
      if (price === null) return;
      var sum = x * price;
      setInputValue(outSum, formatNumberForDisplay(round2(sum), 2));
      if (iri > 0) {
        setInputValue(outUnit, formatNumberForDisplay(round2(sum / iri), 2));
      }
    }

    if (!isPlastic) {
      clearInputValues(["soryo-37", "soryo-38", "soryo-39"]);
      var lot = parseNumEst(getInputValue("est-7"));
      var days = parseNumEst(getInputValue("soryo-36"));
      var nittouPerDay = null;
      if (lot !== null && days !== null && days > 0) {
        nittouPerDay = round2(lot / days);
        setInputValue("soryo-37", formatNumberForDisplay(nittouPerDay, 2));
      }
      var unitG = parseNumEst(getInputValue("mat-3"));
      if (unitG !== null && nittouPerDay !== null) {
        var kg = (unitG * nittouPerDay) / 1000;
        setInputValue("soryo-38", formatNumberForDisplay(round2(kg), 2));
      }
      var ship6 = parseNumEst(getInputValue("soryo-6"));
      if (ship6 !== null && nittouPerDay !== null && nittouPerDay > 0) {
        setInputValue("soryo-39", formatNumberForDisplay(round2(ship6 / nittouPerDay), 2));
      }
    }

    if (isCardboard) {
      clearInputValues(["soryo-7", "soryo-11", "soryo-12", "soryo-17", "soryo-18", "soryo-19"]);
      var ship6b = parseNumEst(getInputValue("soryo-6"));
      var boxIri = parseNumEst(getInputValue("soryo-10"));
      var unitGForBox = parseNumEst(getInputValue("mat-3"));
      if (boxIri !== null && unitGForBox !== null && boxIri > 0 && unitGForBox > 0) {
        setInputValue(
          "soryo-11",
          formatNumberForDisplay(round2((boxIri * unitGForBox) / 1000), 2)
        );
      }
      if (ship6b !== null && boxIri !== null && boxIri > 0) {
        setInputValue("soryo-7", formatNumberForDisplay(round2(ship6b / boxIri), 2));
      }
      var boxPrice = parseNumEst(getInputValue("soryo-9"));
      if (boxPrice !== null && boxIri !== null && boxIri > 0) {
        setInputValue("soryo-12", formatNumberForDisplay(round2(boxPrice / boxIri), 2));
      }
      calcTrayBlock("soryo-10", "soryo-14", "soryo-15", "soryo-16", "soryo-17", "soryo-18", "soryo-19");
    }

    if (isPlastic) {
      clearInputValues(["soryo-22", "soryo-23", "soryo-28", "soryo-33", "soryo-34", "soryo-35"]);
      var palN = parseNumEst(getInputValue("soryo-21"));
      var boxIriP = parseNumEst(getInputValue("soryo-27"));
      var load = null;
      if (palN !== null && boxIriP !== null) {
        load = palN * boxIriP;
        setInputValue("soryo-22", formatNumberForDisplay(round2(load), 0));
      }
      var palPrice = parseNumEst(getInputValue("soryo-20"));
      if (palPrice !== null && load !== null && load > 0) {
        setInputValue("soryo-23", formatNumberForDisplay(round2(palPrice / load), 2));
      }
      var s24 = (document.getElementById("soryo-24") && document.getElementById("soryo-24").value) || "";
      if (String(s24).trim() === "支給") {
        setInputValue("soryo-28", formatNumberForDisplay(0, 2));
      } else {
        var p26 = parseNumEst(getInputValue("soryo-26"));
        var i27 = parseNumEst(getInputValue("soryo-27"));
        if (p26 !== null && i27 !== null && i27 > 0) {
          setInputValue("soryo-28", formatNumberForDisplay(round2(p26 / i27), 2));
        }
      }
      calcTrayBlock("soryo-27", "soryo-30", "soryo-31", "soryo-32", "soryo-33", "soryo-34", "soryo-35");
    }
  }

  // ---------------------------------------------------------------------------
  // 材料（径・取り数・一本重・一個重・材料費系）連動計算
  // ---------------------------------------------------------------------------

  function applyMat8FromMat5Diameter() {
    setInputValue("mat-8", "");
    var x = parseNumEst(getInputValue("mat-5"));
    if (x === null || x <= 0) return;
    if (x <= 7) setInputValue("mat-8", "2");
    else if (x <= 16) setInputValue("mat-8", "2.5");
    else setInputValue("mat-8", "3");
  }

  function recalcMat9Torisu() {
    setInputValue("mat-9", "");
    setInputValue("mat-10", "");
    var L = parseNumOrZeroEst(getInputValue("mat-6"));
    var Z = parseNumOrZeroEst(getInputValue("mat-7"));
    var T = parseNumOrZeroEst(getInputValue("mat-8"));
    var denom = Z + T;
    if (denom === 0) return;
    var x = (L - 300) / denom;
    if (!Number.isFinite(x)) return;
    setInputValue("mat-9", formatNumberForDisplay(roundToDecimals(x, 2), 2));
    var torisuInput = Math.trunc(x);
    setInputValue("mat-10", formatNumberForDisplay(torisuInput, 0));
  }

  function recalcMat13IpponWeight() {
    setInputValue("mat-13", "");
    var d = parseNumEst(getInputValue("mat-5"));
    var len = parseNumEst(getInputValue("mat-6"));
    var sg = parseNumEst(getInputValue("mat-12"));
    if (d === null || len === null || sg === null) return;
    if (d <= 0 || len <= 0) return;
    var mat4El = document.getElementById("mat-4");
    var shape = mat4El ? String(mat4El.value || "").trim() : "";
    var r10 = (d / 2) / 10;
    var x = r10 * r10 * 3.14 * (len / 10) * sg;
    if (shape === "2") x *= 1.15;
    else if (shape === "3") x *= 1.263;
    if (!Number.isFinite(x)) return;
    setInputValue("mat-13", formatNumberForDisplay(roundToDecimals(x, 2), 2));
  }

  function recalcMat14PieceWeight() {
    setInputValue("mat-14", "");
    var unit = parseNumEst(getInputValue("mat-13"));
    var take = parseNumEst(getInputValue("mat-10"));
    if (unit === null || take === null || take <= 0) return;
    var x = unit / take;
    if (!Number.isFinite(x)) return;
    setInputValue("mat-14", formatNumberForDisplay(roundToDecimals(x, 2), 2));
  }

  /** 真鍮詳細: 素材単価・スクラップ単価・材料費（br-1/9/10）と mat-19 クリア */
  function recalcShinchuuBrMaterialCosts() {
    if (!brCb1 || !brCb1.checked) return;
    clearInputValues(["br-1", "br-9", "br-10"]);
    setInputValue("mat-19", "");

    var r1 = getRadioValue("est_shinchuu_r1");
    var r2 = getRadioValue("est_shinchuu_r2");
    var is97Tanjyu = r1 === "2" && r2 === "1";
    var mat14 = parseNumEst(getInputValue("mat-14"));
    var mat15 = parseNumEst(getInputValue("mat-15"));
    var delta125Minus97 = 125 - 97;

    if (is97Tanjyu) {
      if (mat14 === null || mat15 === null) {
        schedulePriceAggregation();
        return;
      }
      var xRaw = (mat14 * (mat15 - delta125Minus97)) / 1000;
      var xInt = roundToDecimals(xRaw, 2);
      setInputValue("mat-16", formatNumberForDisplay(xInt, 2));
      var yieldPct = parseNumOrZeroEst(getInputValue("mat-17"));
      var y = roundToDecimals(xInt * (yieldPct / 100), 2);
      setInputValue("mat-18", formatNumberForDisplay(y, 2));
      var sum = roundToDecimals(xInt + y, 2);
      setInputValue("mat-11", formatNumberForDisplay(sum, 2));
      setInputValue("br-1", formatNumberForDisplay(sum, 2));
    } else {
      var mat11 = parseNumEst(getInputValue("mat-11"));
      if (mat11 !== null) {
        setInputValue("br-1", formatNumberForDisplay(roundToDecimals(mat11, 2), 2));
      }
    }
    var br6 = parseNumEst(getInputValue("br-6"));
    var br7 = parseNumEst(getInputValue("br-7"));
    var br8 = parseNumEst(getInputValue("br-8"));
    if (br6 !== null && br7 !== null && br8 !== null) {
      var scrapUnitRaw = (br6 * br7 * (br8 / 100)) / 1000;
      var br9val = roundToDecimals(scrapUnitRaw, 3);
      setInputValue("br-9", formatNumberForDisplay(br9val, 2));
    }
    var br1n = parseNumEst(getInputValue("br-1"));
    var br9n = parseNumEst(getInputValue("br-9"));
    if (br1n !== null && br9n !== null) {
      setInputValue("br-10", formatNumberForDisplay(roundToDecimals(br1n - br9n, 2), 2));
    }
    schedulePriceAggregation();
  }

  function syncBr6FromBr5() {
    if (!brCb1 || !brCb1.checked) return;
    if (br56Syncing) return;
    br56Syncing = true;
    setInputValue("br-6", "");
    var m14 = parseNumEst(getInputValue("mat-14"));
    var b5 = parseNumEst(getInputValue("br-5"));
    if (m14 !== null && b5 !== null) {
      setInputValue("br-6", formatNumberForDisplay(roundToDecimals(m14 - b5, 2), 2));
    }
    br56Syncing = false;
    recalcShinchuuBrMaterialCosts();
  }

  function syncBr5FromBr6() {
    if (!brCb1 || !brCb1.checked) return;
    if (br56Syncing) return;
    br56Syncing = true;
    setInputValue("br-5", "");
    var m14 = parseNumEst(getInputValue("mat-14"));
    var b6 = parseNumEst(getInputValue("br-6"));
    if (m14 !== null && b6 !== null) {
      setInputValue("br-5", formatNumberForDisplay(roundToDecimals(m14 - b6, 2), 2));
    }
    br56Syncing = false;
    recalcShinchuuBrMaterialCosts();
  }

  function recalcMat16Mat18Mat11MaterialCost() {
    clearInputValues(["mat-16", "mat-18", "mat-11"]);
    var one = parseNumEst(getInputValue("mat-14"));
    var price = parseNumEst(getInputValue("mat-15"));
    if (one === null || price === null) {
      if (brCb1 && brCb1.checked) {
        recalcBrR1NPriceDerived();
        recalcShinchuuBrMaterialCosts();
      }
      return;
    }
    var x = roundToDecimals((one / 1000) * price, 2);
    setInputValue("mat-16", formatNumberForDisplay(x, 2));
    var yieldPct = parseNumOrZeroEst(getInputValue("mat-17"));
    var y = roundToDecimals(x * (yieldPct / 100), 2);
    setInputValue("mat-18", formatNumberForDisplay(y, 2));
    var z = roundToDecimals(x + y, 2);
    setInputValue("mat-11", formatNumberForDisplay(z, 2));
    if (brCb1 && brCb1.checked) {
      recalcBrR1NPriceDerived();
      recalcShinchuuBrMaterialCosts();
    }
  }

  function runMaterialChainFromMat5() {
    applyMat8FromMat5Diameter();
    recalcMat9Torisu();
    recalcMat13IpponWeight();
    recalcMat14PieceWeight();
    recalcMat16Mat18Mat11MaterialCost();
    schedulePriceAggregation();
  }

  function runMaterialChainFromMat678() {
    recalcMat9Torisu();
    recalcMat13IpponWeight();
    recalcMat14PieceWeight();
    recalcMat16Mat18Mat11MaterialCost();
    schedulePriceAggregation();
  }

  function runMaterialChainMat9Only() {
    recalcMat9Torisu();
    recalcMat14PieceWeight();
    recalcMat16Mat18Mat11MaterialCost();
    schedulePriceAggregation();
  }

  function runMaterialChainFromMat4Mat12() {
    recalcMat13IpponWeight();
    recalcMat14PieceWeight();
    recalcMat16Mat18Mat11MaterialCost();
    schedulePriceAggregation();
  }

  function runMaterialChainFromMat10() {
    recalcMat14PieceWeight();
    recalcMat16Mat18Mat11MaterialCost();
    schedulePriceAggregation();
  }

  function runMaterialChainMat15Mat17() {
    recalcMat16Mat18Mat11MaterialCost();
    schedulePriceAggregation();
  }

  /** 真鍮詳細: RM125 / 不二工機97 と N社価格・材料単価から 建値・増値・スクラップベースを算出 */
  function recalcBrR1NPriceDerived() {
    if (!brCb1 || !brCb1.checked) return;
    setInputValue("br-3", "");
    setInputValue("br-4", "");
    var r1 = getRadioValue("est_shinchuu_r1");
    var nPrice = parseNumEst(getInputValue("br-2"));
    var mat15 = parseNumEst(getInputValue("mat-15"));
    var delta125Minus97 = 125 - 97;

    if (r1 === "1") {
      setInputValue("br-7", "");
      if (nPrice === null) {
        schedulePriceAggregation();
        return;
      }
      var tate125 = nPrice + 125;
      setInputValue("br-3", formatNumberForDisplay(roundToDecimals(tate125, 0), 0));
      if (mat15 !== null) {
        setInputValue("br-4", formatNumberForDisplay(roundToDecimals(mat15 - tate125, 0), 0));
      }
    } else if (r1 === "2") {
      if (nPrice === null) {
        setInputValue("br-7", "");
        schedulePriceAggregation();
        return;
      }
      var tate97 = nPrice + 97;
      setInputValue("br-3", formatNumberForDisplay(roundToDecimals(tate97, 0), 0));
      if (mat15 !== null) {
        setInputValue(
          "br-4",
          formatNumberForDisplay(roundToDecimals(mat15 - tate97 - delta125Minus97, 0), 0)
        );
      }
      setInputValue("br-7", formatNumberForDisplay(roundToDecimals(tate97 - 140, 0), 0, false));
    } else {
      setInputValue("br-7", "");
    }
    schedulePriceAggregation();
  }

  /** 単重(mat-3)変更時: 入数(soryo-1) = 12000/単重 を1の位で切り捨て（例 1234.56→1230） */
  function applySoryo1FromMat3UnitWeight() {
    setInputValue("soryo-1", "");
    var w = parseNumEst(getInputValue("mat-3"));
    if (w === null || w <= 0) return;
    var x = 12000 / w;
    if (!Number.isFinite(x)) return;
    var t = Math.floor(x / 10) * 10;
    setInputValue("soryo-1", formatNumberForDisplay(t, 0));
  }

  function bindMaterialDerivedCalculations() {
    var mat3 = document.getElementById("mat-3");
    if (mat3) {
      var onMat3ForSoryo1 = function () {
        applySoryo1FromMat3UnitWeight();
        recalcSoryoShippingPackaging();
        schedulePriceAggregation();
      };
      mat3.addEventListener("input", onMat3ForSoryo1);
      mat3.addEventListener("change", onMat3ForSoryo1);
    }
    var mat5 = document.getElementById("mat-5");
    if (mat5) {
      mat5.addEventListener("input", runMaterialChainFromMat5);
      mat5.addEventListener("change", runMaterialChainFromMat5);
    }
    ["mat-6", "mat-8"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", runMaterialChainFromMat678);
      el.addEventListener("change", runMaterialChainFromMat678);
    });
    var mat7 = document.getElementById("mat-7");
    if (mat7) {
      mat7.addEventListener("input", runMaterialChainMat9Only);
      mat7.addEventListener("change", runMaterialChainMat9Only);
    }
    var mat4 = document.getElementById("mat-4");
    if (mat4) {
      mat4.addEventListener("change", runMaterialChainFromMat4Mat12);
    }
    var mat12 = document.getElementById("mat-12");
    if (mat12) {
      mat12.addEventListener("input", runMaterialChainFromMat4Mat12);
      mat12.addEventListener("change", runMaterialChainFromMat4Mat12);
    }
    var mat10 = document.getElementById("mat-10");
    if (mat10) {
      mat10.addEventListener("input", runMaterialChainFromMat10);
      mat10.addEventListener("change", runMaterialChainFromMat10);
    }
    ["mat-15", "mat-17"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", runMaterialChainMat15Mat17);
      el.addEventListener("change", runMaterialChainMat15Mat17);
    });
    var br2 = document.getElementById("br-2");
    if (br2) {
      br2.addEventListener("input", runMaterialChainMat15Mat17);
      br2.addEventListener("change", runMaterialChainMat15Mat17);
    }
    document.querySelectorAll('input[name="est_shinchuu_r1"]').forEach(function (r) {
      r.addEventListener("change", runMaterialChainMat15Mat17);
    });
    var br5 = document.getElementById("br-5");
    var br6 = document.getElementById("br-6");
    if (br5) {
      br5.addEventListener("input", syncBr6FromBr5);
      br5.addEventListener("change", syncBr6FromBr5);
    }
    if (br6) {
      br6.addEventListener("input", syncBr5FromBr6);
      br6.addEventListener("change", syncBr5FromBr6);
    }
    ["br-7", "br-8"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", recalcShinchuuBrMaterialCosts);
      el.addEventListener("change", recalcShinchuuBrMaterialCosts);
    });
  }

  function setZeroAndReset(ids) {
    ids.forEach(function (id) {
      setInputValue(id, "0");
    });
  }

  function calcEst9DailyOutput() {
    setZeroAndReset(["est-9"]);
    var ct = parseNumEst(getInputValue("est-8"));
    if (ct === null || ct <= 0) return false;
    var nissan = 82800 / ct;
    if (!Number.isFinite(nissan)) return false;
    setInputValue("est-9", formatNumberForDisplay(roundToDecimals(nissan, 2), 2));
    return true;
  }

  function calcEst11Days() {
    setZeroAndReset(["est-11"]);
    var lot = parseNumEst(getInputValue("est-7"));
    var nissanInput = parseNumEst(getInputValue("est-10"));
    var adj = parseNumOrZeroEst(getInputValue("est-12"));
    if (lot === null) lot = 0;
    if (nissanInput === null || nissanInput <= 0) return false;
    var baseDays = lot / nissanInput;
    if (!Number.isFinite(baseDays)) return false;
    var days = roundToDecimals(baseDays, 2) + adj;
    if (!Number.isFinite(days)) return false;
    setInputValue("est-11", formatNumberForDisplay(roundToDecimals(days, 2), 2));
    return true;
  }

  function reflectProc2CycleToProc3() {
    if (!proc2Select) return false;
    var selected = proc2Select.options[proc2Select.selectedIndex];
    if (!selected) return false;
    var cycle = selected.getAttribute("data-cycle");
    if (cycle == null || String(cycle).trim() === "") return false;
    setInputValue("proc-3", String(cycle));
    return true;
  }

  function calcProc4ToolCost() {
    setZeroAndReset(["proc-4"]);
    var days = parseNumOrZeroEst(getInputValue("est-11"));
    var cycle = parseNumOrZeroEst(getInputValue("proc-3"));
    var toolPrice = parseNumOrZeroEst(getInputValue("proc-1"));
    var lot = parseNumOrZeroEst(getInputValue("est-7"));
    if (cycle <= 0 || lot <= 0) return false;
    var cost = (days / cycle) * toolPrice / lot;
    if (!Number.isFinite(cost)) return false;
    setInputValue("proc-4", formatPriceOut(cost));
    return true;
  }

  /**
   * サイクル×賃率で原価を自動計算する。
   * 小数第3位で切り上げ（= 小数第2位まで）し、0.01 以下は 0.01 を下限にする。
   */
  function calcCostFromCycleAndRate(cycleId, rateId, costId, cbId) {
    if (cbId && !isCbChecked(cbId)) return false;
    var cycle = parseNumEst(getInputValue(cycleId));
    var rate = parseNumEst(getInputValue(rateId));
    if (cycle === null || rate === null) return false;
    if (cycle <= 0 || rate <= 0) return false;
    var cost = ceilToDecimals(cycle * rate, 2);
    if (cost <= 0.01) cost = 0.01;
    setInputValue(costId, formatPriceOut(cost));
    return true;
  }

  function bindCycleAutoCostCalculation() {
    var rows = [
      // 加工
      { cycleId: "proc-15", rateId: "proc-16", costId: "proc-17", cbId: "proc-cb-2" },
      { cycleId: "proc-18", rateId: "proc-19", costId: "proc-20", cbId: "proc-cb-3" },
      { cycleId: "proc-21", rateId: "proc-22", costId: "proc-23", cbId: "proc-cb-4" },
      { cycleId: "proc-28", rateId: "proc-29", costId: "proc-30", cbId: "proc-cb-5" },
      // 洗浄・計量・梱包（チェックボックスなし）
      { cycleId: "proc-25", rateId: "proc-26", costId: "proc-27", cbId: null, bindRateToo: true },
      { cycleId: "proc-37", rateId: "proc-38", costId: "proc-39", cbId: null, bindRateToo: true },
      // 検査
      { cycleId: "kensa-1", rateId: "kensa-2", costId: "kensa-3", cbId: "kensa-cb-1" },
      { cycleId: "kensa-4", rateId: "kensa-5", costId: "kensa-6", cbId: "kensa-cb-2" },
      { cycleId: "kensa-7", rateId: "kensa-8", costId: "kensa-9", cbId: "kensa-cb-3" },
      { cycleId: "kensa-10", rateId: "kensa-11", costId: "kensa-12", cbId: "kensa-cb-4" },
      { cycleId: "kensa-13", rateId: "kensa-14", costId: "kensa-15", cbId: "kensa-cb-5" },
      // その他検査: kensa-18 の賃率を各行に適用
      { cycleId: "kensa-17", rateId: "kensa-18", costId: "kensa-19", cbId: "kensa-cb-6" },
      { cycleId: "kensa-21", rateId: "kensa-18", costId: "kensa-22", cbId: "kensa-cb-6" },
      { cycleId: "kensa-24", rateId: "kensa-18", costId: "kensa-25", cbId: "kensa-cb-6" },
      { cycleId: "kensa-27", rateId: "kensa-18", costId: "kensa-28", cbId: "kensa-cb-6" },
      { cycleId: "kensa-30", rateId: "kensa-18", costId: "kensa-31", cbId: "kensa-cb-6" },
    ];

    rows.forEach(function (row) {
      var cycleEl = document.getElementById(row.cycleId);
      if (!cycleEl) return;
      var update = function () {
        var updated = calcCostFromCycleAndRate(row.cycleId, row.rateId, row.costId, row.cbId);
        if (updated) schedulePriceAggregation();
      };
      cycleEl.addEventListener("input", update);
      cycleEl.addEventListener("change", update);
      if (row.bindRateToo) {
        var rateEl = document.getElementById(row.rateId);
        if (rateEl) {
          rateEl.addEventListener("input", update);
          rateEl.addEventListener("change", update);
        }
      }
    });
  }

  function bindFormulaCalculations() {
    function onEst8Changed() {
      calcEst9DailyOutput();
    }

    function onDaysInputsChanged() {
      calcEst11Days();
      calcProc4ToolCost();
      schedulePriceAggregation();
    }

    function onProc4InputsChanged() {
      calcProc4ToolCost();
      schedulePriceAggregation();
    }

    var est8El = document.getElementById("est-8");
    if (est8El) {
      est8El.addEventListener("input", onEst8Changed);
      est8El.addEventListener("change", onEst8Changed);
    }

    ["est-7", "est-10", "est-12"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", onDaysInputsChanged);
      el.addEventListener("change", onDaysInputsChanged);
    });

    var est11El = document.getElementById("est-11");
    if (est11El) {
      est11El.addEventListener("input", onProc4InputsChanged);
      est11El.addEventListener("change", onProc4InputsChanged);
    }

    ["proc-1", "proc-3"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", onProc4InputsChanged);
      el.addEventListener("change", onProc4InputsChanged);
    });

    if (proc2Select) {
      proc2Select.addEventListener("change", function () {
        reflectProc2CycleToProc3();
        calcProc4ToolCost();
        schedulePriceAggregation();
      });
    }

  }

  function calcShippingAndGrandUnitOnLoad() {
    // DB未保存のため、初期表示時のみ再計算する
    setZeroAndReset(["f-in-b5", "f-in-b6"]);
    var boxRadio = getRadioValue("est_soryo_box");
    var ship = 0;
    if (boxRadio === "2") {
      ship =
        parseNumOrZeroEst(getInputValue("soryo-23")) +
        parseNumOrZeroEst(getInputValue("soryo-28")) +
        parseNumOrZeroEst(getInputValue("soryo-35"));
    } else {
      ship =
        parseNumOrZeroEst(getInputValue("soryo-7")) +
        parseNumOrZeroEst(getInputValue("soryo-12")) +
        parseNumOrZeroEst(getInputValue("soryo-19"));
    }
    setInputValue("f-in-b5", formatPriceOut(ship));

    var estimateUnit = parseNumOrZeroEst(getInputValue("f-in-b4"));
    var grand = estimateUnit + ship;
    setInputValue("f-in-b6", formatPriceOut(grand));
  }

  function isCbChecked(id) {
    var el = document.getElementById(id);
    return !!(el && el.checked);
  }

  function sumProcessingManagementTotal() {
    var sum = 0;
    var isOtherMode = isOtherUnderOneDayProc5Selected();
    var procPairs = [
      { id: "proc-4", cb: null },
      { id: "proc-8", cb: null },
      { id: "proc-13", cb: null },
      { id: "proc-17", cb: "proc-cb-2" },
      { id: "proc-20", cb: "proc-cb-3" },
      { id: "proc-23", cb: "proc-cb-4" },
      { id: "proc-27", cb: null },
      { id: "proc-30", cb: "proc-cb-5" },
      { id: "proc-39", cb: null },
    ];
    procPairs.forEach(function (row) {
      if (isOtherMode && row.id === "proc-13") return;
      if (row.cb && !isCbChecked(row.cb)) return;
      var n = parseNumEst(getInputValue(row.id));
      if (n !== null) sum += n;
    });

    var kensaSingle = [
      { cb: "kensa-cb-1", cost: "kensa-3" },
      { cb: "kensa-cb-2", cost: "kensa-6" },
      { cb: "kensa-cb-3", cost: "kensa-9" },
      { cb: "kensa-cb-4", cost: "kensa-12" },
      { cb: "kensa-cb-5", cost: "kensa-15" },
    ];
    kensaSingle.forEach(function (row) {
      if (!isCbChecked(row.cb)) return;
      var n = parseNumEst(getInputValue(row.cost));
      if (n !== null) sum += n;
    });

    if (isCbChecked("kensa-cb-6")) {
      ["kensa-19", "kensa-22", "kensa-25", "kensa-28", "kensa-31"].forEach(function (id) {
        var n = parseNumEst(getInputValue(id));
        if (n !== null) sum += n;
      });
    }

    return sum;
  }

  /** 検査費▲・検査チャージ用: 処理前検査＋検査ブロック原価の合計（チェックONかつ数値があるもののみ） */
  function sumInspectionCostsDetailed() {
    var total = 0;
    var rows = [];

    function addRow(cb, cycleId, costId) {
      if (!isCbChecked(cb)) return;
      var c = parseNumEst(getInputValue(costId));
      var cy = parseNumEst(getInputValue(cycleId));
      if (c !== null) total += c;
      rows.push({ cb: cb, cycleId: cycleId, costId: costId, cost: c, cycle: cy });
    }

    addRow("proc-cb-5", "proc-28", "proc-30");
    addRow("kensa-cb-1", "kensa-1", "kensa-3");
    addRow("kensa-cb-2", "kensa-4", "kensa-6");
    addRow("kensa-cb-3", "kensa-7", "kensa-9");
    addRow("kensa-cb-4", "kensa-10", "kensa-12");
    addRow("kensa-cb-5", "kensa-13", "kensa-15");

    if (isCbChecked("kensa-cb-6")) {
      [
        ["kensa-17", "kensa-19"],
        ["kensa-21", "kensa-22"],
        ["kensa-24", "kensa-25"],
        ["kensa-27", "kensa-28"],
        ["kensa-30", "kensa-31"],
      ].forEach(function (pair) {
        addRow("kensa-cb-6", pair[0], pair[1]);
      });
    }

    return { total: total, rows: rows };
  }

  /** 初回集計のみ: テンプレート/DB の機械チャージ(f-ch-7)を自動計算で上書きしない */
  var skipInitialMechanicalChargeAggregation = true;

  function runPriceAggregation() {
    var b2El = document.getElementById("f-in-b2");
    var b3El = document.getElementById("f-in-b3");
    var b2Str = b2El ? (b2El.value || "").trim() : "";
    var b3Str = b3El ? (b3El.value || "").trim() : "";

    var clearAggIds = [
      "f-in-1", "f-in-3",
      "f-out-1", "f-out-3", "f-out-4", "f-out-6",
      "f-ch-1", "f-ch-2", "f-ch-3", "f-ch-4", "f-ch-5", "f-ch-6",
      "f-ch-7", "f-ch-8", "f-ch-9", "f-ch-10",
      "f-in-b1", "f-in-b4", "f-in-b5", "f-in-b6",
    ];
    if (skipInitialMechanicalChargeAggregation) {
      clearAggIds = clearAggIds.filter(function (id) {
        return id !== "f-ch-7";
      });
    }
    clearInputValues(clearAggIds);

    var proc33 = isCbChecked("proc-cb-6") ? parseNumEst(getInputValue("proc-33")) : null;
    var proc35 = isCbChecked("proc-cb-6") ? parseNumEst(getInputValue("proc-35")) : null;

    var out1 = proc33 !== null ? proc33 : null;
    var out4 = proc35 !== null ? proc35 : null;
    setInputValue("f-out-1", out1 !== null ? formatPriceOut(out1) : "");
    setInputValue("f-out-4", out4 !== null ? formatPriceOut(out4) : "");

    var rateOut2 = parseNumEst(getInputValue("f-out-2"));
    var rateOut5 = parseNumEst(getInputValue("f-out-5"));
    var out3 = null;
    if (out1 !== null && rateOut2 !== null) {
      out3 = ceilToDecimals(out1 * (rateOut2 / 100), 2);
    }
    var out6 = null;
    if (out4 !== null && rateOut5 !== null) {
      out6 = ceilToDecimals(out4 * (rateOut5 / 100), 2);
    }
    setInputValue("f-out-3", out3 !== null ? formatPriceOut(out3) : "");
    setInputValue("f-out-6", out6 !== null ? formatPriceOut(out6) : "");

    var sumIn = sumProcessingManagementTotal();
    setInputValue("f-in-1", formatPriceOut(sumIn));

    var rateIn2 = parseNumEst(getInputValue("f-in-2"));
    var in3 = null;
    if (rateIn2 !== null) {
      in3 = ceilToDecimals(sumIn * (rateIn2 / 100), 2);
    }
    setInputValue("f-in-3", in3 !== null ? formatPriceOut(in3) : "");

    var mat19 = parseNumOrZeroEst(getInputValue("mat-19"));
    var nOut1 = out1 !== null ? out1 : 0;
    var nOut4 = out4 !== null ? out4 : 0;
    var nOut3 = out3 !== null ? out3 : 0;
    var nOut6 = out6 !== null ? out6 : 0;
    var nIn3 = in3 !== null ? in3 : 0;
    var costTotal = mat19 + sumIn + nIn3 + nOut1 + nOut4 + nOut3 + nOut6;
    setInputValue("f-in-b1", formatPriceOut(costTotal));

    var b2Num = parseNumEst(b2Str);
    var b3Num = parseNumEst(b3Str);
    var margin = null;
    if (b2Num !== null && b2Str !== "") {
      margin = ceilToDecimals(sumIn * (b2Num / 100), 2);
      setInputValue("f-in-b3", formatPriceOut(margin));
    } else if (b3Num !== null && b3Str !== "") {
      if (sumIn > 0) {
        setInputValue("f-in-b2", String(roundToDecimals((b3Num / sumIn) * 100, 2)));
      }
      margin = b3Num;
    } else {
      margin = 0;
      setInputValue("f-in-b2", "");
      setInputValue("f-in-b3", "");
    }

    if (margin === null || !Number.isFinite(margin)) margin = 0;
    var marginNum = margin;

    var estimateUnit = costTotal + marginNum;
    setInputValue("f-in-b4", formatPriceOut(estimateUnit));

    var boxRadio = getRadioValue("est_soryo_box");
    var ship = 0;
    if (boxRadio === "2") {
      ship =
        parseNumOrZeroEst(getInputValue("soryo-23")) +
        parseNumOrZeroEst(getInputValue("soryo-28")) +
        parseNumOrZeroEst(getInputValue("soryo-35"));
    } else {
      ship =
        parseNumOrZeroEst(getInputValue("soryo-7")) +
        parseNumOrZeroEst(getInputValue("soryo-12")) +
        parseNumOrZeroEst(getInputValue("soryo-19"));
    }
    setInputValue("f-in-b5", formatPriceOut(ship));

    var grand = estimateUnit + ship;
    setInputValue("f-in-b6", formatPriceOut(grand));

    var inspDet = sumInspectionCostsDetailed();
    var inspSum = inspDet.total;

    var ch1 = costTotal + marginNum - mat19;
    var ch2 = ch1 - parseNumOrZeroEst(getInputValue("proc-4"));
    var surfSum =
      (isCbChecked("proc-cb-6") ? parseNumOrZeroEst(getInputValue("proc-33")) : 0) +
      (isCbChecked("proc-cb-6") ? parseNumOrZeroEst(getInputValue("proc-35")) : 0);
    var ch3 = ch2 - surfSum;
    var ch4 = ch3 - nOut3 - nOut6;
    var ch5 = ch4 - inspSum;
    var ch6 = ch5 - parseNumOrZeroEst(getInputValue("proc-39"));

    setInputValue("f-ch-1", formatPriceOut(ch1));
    setInputValue("f-ch-2", formatPriceOut(ch2));
    setInputValue("f-ch-3", formatPriceOut(ch3));
    setInputValue("f-ch-4", formatPriceOut(ch4));
    setInputValue("f-ch-5", formatPriceOut(ch5));
    setInputValue("f-ch-6", formatPriceOut(ch6));

    var lot = parseNumEst(getInputValue("est-7"));
    var days = parseNumEst(getInputValue("est-11"));
    var ch7 = null;
    if (days !== null && days > 0 && lot !== null) {
      ch7 = ch6 * (lot / days);
    }
    if (!skipInitialMechanicalChargeAggregation) {
      setInputValue("f-ch-7", ch7 !== null && Number.isFinite(ch7) ? formatPriceOut(ch7) : "");
    }

    var ch8Sum = 0;
    if (lot !== null && lot > 0) {
      inspDet.rows.forEach(function (r) {
        var c = r.cost;
        var cy = r.cycle;
        if (c === null || cy === null || cy <= 0) return;
        var rawHead = (lot / 20) / (28800 / cy);
        var heads = Math.ceil(rawHead);
        if (heads < 1) heads = 1;
        var term = (lot * c) / 20 / heads;
        if (Number.isFinite(term)) {
          ch8Sum += roundToDecimals(term, 3);
        }
      });
    }
    ch8Sum = roundToDecimals(ch8Sum, 2);
    setInputValue("f-ch-8", formatPriceOut(ch8Sum));

    var ch9 = null;
    var packCost = parseNumEst(getInputValue("proc-39"));
    var boxIri = null;
    if (boxRadio === "2") {
      boxIri = parseNumEst(getInputValue("soryo-27"));
    } else {
      boxIri = parseNumEst(getInputValue("soryo-10"));
    }
    if (lot !== null && packCost !== null && boxIri !== null && boxIri > 0) {
      var rawPack = (lot / 20 / boxIri) * (300 / 28800);
      var packHeads = Math.ceil(rawPack);
      if (packHeads < 1) packHeads = 1;
      ch9 = (lot * packCost) / 20 / packHeads;
    }
    setInputValue("f-ch-9", ch9 !== null && Number.isFinite(ch9) ? formatPriceOut(ch9) : "");

    var nCh7 = ch7 !== null && Number.isFinite(ch7) ? ch7 : 0;
    if (skipInitialMechanicalChargeAggregation) {
      var domCh7 = parseNumEst(getInputValue("f-ch-7"));
      nCh7 = domCh7 !== null ? domCh7 : 0;
    }
    var nCh9 = ch9 !== null && Number.isFinite(ch9) ? ch9 : 0;
    setInputValue("f-ch-10", formatPriceOut(nCh7 + ch8Sum + nCh9));

    skipInitialMechanicalChargeAggregation = false;
  }

  var priceAggTimer = null;
  function schedulePriceAggregation() {
    if (priceAggTimer) clearTimeout(priceAggTimer);
    priceAggTimer = setTimeout(function () {
      priceAggTimer = null;
      runPriceAggregation();
      applyConditionalTextboxBackgrounds();
    }, 90);
  }

  var fInB2El = document.getElementById("f-in-b2");
  var fInB3El = document.getElementById("f-in-b3");
  if (fInB2El) {
    fInB2El.addEventListener("input", function () {
      setInputValue("f-in-b3", "");
      schedulePriceAggregation();
    });
  }
  if (fInB3El) {
    fInB3El.addEventListener("input", function () {
      setInputValue("f-in-b2", "");
      schedulePriceAggregation();
    });
  }

  (function attachPriceAggregationListeners() {
    var ids = [
      "mat-19", "f-in-2", "f-out-2", "f-out-5",
      "est-7", "est-11",
      "proc-4", "proc-8", "proc-13", "proc-17", "proc-20", "proc-23", "proc-27", "proc-30", "proc-33", "proc-35", "proc-39",
      "proc-28",
      "kensa-1", "kensa-3", "kensa-4", "kensa-6", "kensa-7", "kensa-9", "kensa-10", "kensa-12",
      "kensa-13", "kensa-15", "kensa-17", "kensa-19", "kensa-21", "kensa-22", "kensa-24", "kensa-25",
      "kensa-27", "kensa-28", "kensa-30", "kensa-31",
      "soryo-7", "soryo-12", "soryo-19", "soryo-23", "soryo-28", "soryo-35", "soryo-10", "soryo-27",
    ];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", schedulePriceAggregation);
      el.addEventListener("change", schedulePriceAggregation);
    });

    var cbIds = [
      "proc-cb-1", "proc-cb-2", "proc-cb-3", "proc-cb-4", "proc-cb-5", "proc-cb-6",
      "kensa-cb-1", "kensa-cb-2", "kensa-cb-3", "kensa-cb-4", "kensa-cb-5", "kensa-cb-6",
    ];
    cbIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("change", schedulePriceAggregation);
    });

    soryoBoxRadios.forEach(function (r) {
      r.addEventListener("change", schedulePriceAggregation);
    });
  })();

  (function bindSoryoPackagingRecalcListeners() {
    function tick() {
      recalcSoryoShippingPackaging();
      schedulePriceAggregation();
    }
    var ids = [
      "est-7",
      "soryo-36",
      "soryo-6",
      "soryo-9",
      "soryo-10",
      "soryo-16",
      "soryo-8",
      "soryo-13",
      "soryo-14",
      "soryo-15",
      "soryo-20",
      "soryo-21",
      "soryo-27",
      "soryo-26",
      "soryo-29",
      "soryo-30",
      "soryo-31",
      "soryo-32",
    ];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", tick);
      el.addEventListener("change", tick);
    });
    soryoBoxRadios.forEach(function (r) {
      r.addEventListener("change", tick);
    });
    tick();
  })();

  (function bindConditionalBackgroundListeners() {
    ["proc-3", "est-11", "soryo-11", "soryo-38"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", applyConditionalTextboxBackgrounds);
      el.addEventListener("change", applyConditionalTextboxBackgrounds);
    });
    soryoBoxRadios.forEach(function (r) {
      r.addEventListener("change", applyConditionalTextboxBackgrounds);
    });
  })();

  bindCycleAutoCostCalculation();

  (function bindProc24Proc36SelectRateAndCost() {
    function wire(selectId, rateId, cycleId, costId) {
      var sel = document.getElementById(selectId);
      if (!sel) return;
      function syncFromDropdown(replaceRateFromOption) {
        var opt = sel.options[sel.selectedIndex];
        if (!opt || !(String(opt.value || "").trim())) {
          setInputValue(rateId, "");
          setInputValue(costId, "");
          schedulePriceAggregation();
          return;
        }
        if (replaceRateFromOption) {
          var raw = opt.getAttribute("data-rate-sum") || "";
          if (!String(raw).trim()) {
            setInputValue(rateId, "");
          } else {
            setInputValue(rateId, formatRateSum(raw));
          }
        }
        calcCostFromCycleAndRate(cycleId, rateId, costId, null);
        schedulePriceAggregation();
      }
      sel.addEventListener("change", function () {
        enableProcKakouKensaRateReplaceFromMaster();
        syncFromDropdown(true);
      });
      // 初回のみ賃率は触らず、保存値のまま原価だけ再計算
      syncFromDropdown(false);
    }
    wire("proc-24", "proc-26", "proc-25", "proc-27");
    wire("proc-36", "proc-38", "proc-37", "proc-39");
  })();

  bindFormulaCalculations();
  bindMaterialDerivedCalculations();

  function buildSavePayload() {
    var activeEstimateId = getActiveEstimateId();
    var payload = {
      estimate_id: activeEstimateId,
      lot_id: getValue("est-6").trim(),
      est_7: getValue("est-7"),
      est_8: getValue("est-8"),
      est_9: getValue("est-9"),
      est_10: getValue("est-10"),
      est_11: getValue("est-11"),
      est_12: getValue("est-12"),
      shinchuu_r1: getRadioValue("est_shinchuu_r1"),
      shinchuu_r2: getRadioValue("est_shinchuu_r2"),
      br_cb_1: !!(document.getElementById("br-cb-1") && document.getElementById("br-cb-1").checked),
      est_soryo_box: getRadioValue("est_soryo_box"),
      proc_cb_1: getCheckedValue("proc-cb-1", "-1"),
      proc_cb_2: getCheckedValue("proc-cb-2", "-1"),
      proc_cb_3: getCheckedValue("proc-cb-3", "-1"),
      proc_cb_4: getCheckedValue("proc-cb-4", "-1"),
      proc_cb_5: getCheckedValue("proc-cb-5", "-1"),
      proc_cb_6: getCheckedValue("proc-cb-6", "-1"),
      kensa_cb_1: getCheckedValue("kensa-cb-1", "-1"),
      kensa_cb_2: getCheckedValue("kensa-cb-2", "-1"),
      kensa_cb_3: getCheckedValue("kensa-cb-3", "-1"),
      kensa_cb_4: getCheckedValue("kensa-cb-4", "-1"),
      kensa_cb_5: getCheckedValue("kensa-cb-5", "-1"),
      kensa_cb_6: getCheckedValue("kensa-cb-6", "-1"),
    };

    var i;
    for (i = 1; i <= 19; i++) payload["mat_" + i] = getValue("mat-" + i);
    for (i = 1; i <= 10; i++) payload["br_" + i] = getValue("br-" + i);
    for (i = 1; i <= 39; i++) payload["proc_" + i] = getValue("proc-" + i);
    for (i = 1; i <= 31; i++) payload["kensa_" + i] = getValue("kensa-" + i);
    for (i = 1; i <= 39; i++) payload["soryo_" + i] = getValue("soryo-" + i);
    for (i = 1; i <= 3; i++) payload["f_in_" + i] = getValue("f-in-" + i);
    for (i = 1; i <= 6; i++) payload["f_out_" + i] = getValue("f-out-" + i);
    payload.f_in_b1 = getValue("f-in-b1");
    payload.f_in_b2 = getValue("f-in-b2");
    payload.f_in_b3 = getValue("f-in-b3");
    payload.f_in_b4 = getValue("f-in-b4");
    payload.f_in_b5 = getValue("f-in-b5");
    payload.f_in_b6 = getValue("f-in-b6");
    for (i = 1; i <= 10; i++) {
      if (i === 3) {
        payload.f_ch_3 = getValue("f-ch-4");
      } else if (i === 4) {
        payload.f_ch_4 = getValue("f-ch-3");
      } else {
        payload["f_ch_" + i] = getValue("f-ch-" + i);
      }
    }
    return payload;
  }

  function runPreExportSave() {
    var payload = buildSavePayload();
    return fetch("/api/est_calc/pre_export_save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data.error) {
          throw new Error(data.error);
        }
      });
  }

  function exportExcel() {
    var activeEstimateId = getActiveEstimateId();
    var payload = buildSavePayload();
    payload.est_1 = document.getElementById("est-1") ? document.getElementById("est-1").value : "";
    payload.est_2 = document.getElementById("est-2") ? document.getElementById("est-2").value : "";
    payload.est_3 = est3Input ? est3Input.value : "";
    payload.est_4 = est4Input ? est4Input.value : "";
    payload.est_5 = activeEstimateId;
    payload.est_6 = currentLotId;
    payload.est_7 = est7Input ? est7Input.value : "";
    payload.mat_1 = mat1Input ? mat1Input.value : "";
    payload.mat_2_name = getMat2Name();
    payload.mat_3 = mat3Input ? mat3Input.value : "";
    payload.proc_5_name = getSelectedTextById("proc-5");
    payload.proc_14_name = getSelectedTextById("proc-14");
    payload.proc_24_name = getSelectedTextById("proc-24");
    payload.proc_36_name = getSelectedTextById("proc-36");
    payload.proc_32_name = getSelectedTextById("proc-32");
    payload.proc_34_name = getSelectedTextById("proc-34");
    payload.soryo_8_name = getSelectedTextById("soryo-8");
    payload.soryo_13_name = getSelectedTextById("soryo-13");
    payload.soryo_29_name = getSelectedTextById("soryo-29");

    return fetch("/api/est_calc/export_xlsx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(function (res) {
      return res.json().then(function (data) {
        if (data && data.cancelled) {
          return;
        }
        if (!res.ok || (data && data.error && data.ok !== true)) {
          throw new Error((data && data.error) || "Excel出力に失敗しました");
        }
      });
    });
  }

  if (resetInputsBtn) {
    resetInputsBtn.addEventListener("click", function () {
      showYesNoConfirmDialog("確認", "入力欄をリセットしますか？", null)
        .then(function (choice) {
          if (choice !== "yes") return;
          performResetInputsExceptBasic();
        })
        .catch(function () {});
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener("click", function () {
      var activeEstimateId = getEstimateIdFromEst5Input();
      if (!activeEstimateId) {
        alert("見積りが選択されていません");
        return;
      }
      showExportConfirmDialog()
        .then(function (choice) {
          if (choice === "cancel") return;
          if (choice === "yes") {
            return runPreExportSave().then(exportExcel);
          }
          return exportExcel();
        })
        .catch(function (err) {
          alert("処理に失敗しました: " + err.message);
        });
    });
  }

  /** 見積り追加ボタンと同じ: clear_usage_flag → コピー確認 → add_estimate_lot → 再読込 */
  function performAddEstimateLotSequence() {
    var activeEstimateId = getEstimateIdFromEst5Input();
    if (!activeEstimateId) {
      alert("見積りが選択されていません");
      return Promise.resolve();
    }
    return showYesNoConfirmDialog(
      "確認",
      "原価見積りID：" + activeEstimateId + " の見積りデータを新たに追加しますか？",
      null
    )
      .then(function (choice) {
        if (choice !== "yes") return;
        return fetch("/api/est_calc/clear_usage_flag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estimate_id: activeEstimateId }),
        })
          .then(function (res) {
            return res.json();
          })
          .then(function (data) {
            if (data && data.error) throw new Error(data.error);
            return showYesNoConfirmDialog(
              "確認",
              null,
              "追加する見積りデータに現在入力されている<br>データをコピーしますか？<br>(「いいえ」で全て未入力の状態)"
            );
          });
      })
      .then(function (copyChoice) {
        if (!copyChoice) return;
        var copyData = copyChoice === "yes";
        var payload = buildSavePayload();
        payload.copy_data = copyData;
        return fetch("/api/est_calc/add_estimate_lot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
          .then(function (res) {
            return res.json();
          })
          .then(function (data) {
            if (data && data.error) throw new Error(data.error);
            window.location.href =
              "est_calc.html?estimate_id=" + encodeURIComponent(activeEstimateId);
          });
      })
      .catch(function (err) {
        alert("処理に失敗しました: " + err.message);
      });
  }

  syncShokiHiyouDeleteButtonDisabled();

  var shokiRegisterBtn = document.getElementById("shoki-hiyou-btn-register");
  var shokiCancelBtn = document.getElementById("shoki-hiyou-btn-cancel");
  var shokiDeleteBtn = document.getElementById("shoki-hiyou-btn-delete");

  if (shokiRegisterBtn) {
    shokiRegisterBtn.addEventListener("click", function () {
      var estimateId = getActiveEstimateId();
      if (!estimateId) {
        window.alert("原価見積りIDがありません");
        return;
      }
      if (!shokiHiyouValidateRegisterFields()) return;
      var idEl = document.getElementById("shoki-hiyou-id");
      var idVal = idEl ? (idEl.value || "").replace(/,/g, "").trim() : "";
      var msg = idVal ? "上書きしますか？" : "登録しますか？";
      showYesNoConfirmDialog("確認", msg, null)
        .then(function (choice) {
          if (choice !== "yes") return;
          var payload = shokiHiyouBuildSavePayload();
          return fetch("/api/est_calc/initial_cost_save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
            .then(function (res) {
              return res.json().then(function (data) {
                return { ok: res.ok, data: data };
              });
            })
            .then(function (result) {
              var data = result.data;
              if (!result.ok || data.error) {
                throw new Error(data.error || "保存に失敗しました");
              }
              renderShokiHiyouTableBody(data.rows);
              if (idVal) {
                syncShokiHiyouDeleteButtonDisabled();
              } else {
                clearShokiHiyouForm();
              }
            });
        })
        .catch(function (err) {
          window.alert(err.message || "保存に失敗しました");
        });
    });
  }

  if (shokiCancelBtn) {
    shokiCancelBtn.addEventListener("click", function () {
      clearShokiHiyouForm();
    });
  }

  if (shokiDeleteBtn) {
    shokiDeleteBtn.addEventListener("click", function () {
      if (shokiDeleteBtn.disabled) return;
      var estimateId = getActiveEstimateId();
      var idEl = document.getElementById("shoki-hiyou-id");
      var idVal = idEl ? (idEl.value || "").replace(/,/g, "").trim() : "";
      if (!estimateId || !idVal) return;
      showYesNoConfirmDialog(
        "確認",
        "ID:" + idVal + " の初期費用を削除しますか？",
        null
      )
        .then(function (choice) {
          if (choice !== "yes") return;
          return fetch("/api/est_calc/initial_cost_delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estimate_id: estimateId, id: idVal }),
          })
            .then(function (res) {
              return res.json().then(function (data) {
                return { ok: res.ok, data: data };
              });
            })
            .then(function (result) {
              var data = result.data;
              if (!result.ok || data.error) {
                throw new Error(data.error || "削除に失敗しました");
              }
              renderShokiHiyouTableBody(data.rows);
              clearShokiHiyouForm();
            });
        })
        .catch(function (err) {
          window.alert(err.message || "削除に失敗しました");
        });
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      var activeEstimateId = getEstimateIdFromEst5Input();
      if (!activeEstimateId) {
        alert("見積りが選択されていません");
        return;
      }
      showSaveConfirmDialog()
        .then(function (choice) {
          if (choice !== "yes") return;
          if (!getCurrentLotIdFromInput()) {
            return performAddEstimateLotSequence();
          }
          return runPreExportSave().then(showSavedDialog);
        })
        .catch(function (err) {
          alert("処理に失敗しました: " + err.message);
        });
    });
  }

  if (addBtn) {
    addBtn.addEventListener("click", function () {
      performAddEstimateLotSequence();
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", function () {
      var activeEstimateId = getEstimateIdFromEst5Input();
      if (!activeEstimateId) {
        alert("見積りが選択されていません");
        return;
      }
      if (!currentLotId) {
        alert("ロットID(est-6)がありません。");
        return;
      }

      showYesNoConfirmDialog(
        "確認",
        "ロットID：" + currentLotId + " を削除しますか？",
        null
      )
        .then(function (choice) {
          if (choice !== "yes") {
            return showOkDialog("確認", "キャンセルしました");
          }

          return fetch("/api/est_calc/delete_estimate_lot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              estimate_id: activeEstimateId,
              lot_id: currentLotId,
            }),
          })
            .then(function (res) {
              return res.json();
            })
            .then(function (data) {
              if (data && data.error) throw new Error(data.error);
              return showOkDialog(
                "確認",
                "ロットID：" + currentLotId + " のデータを削除しました"
              );
            })
            .then(function () {
              window.location.href =
                "est_calc.html?estimate_id=" + encodeURIComponent(activeEstimateId);
            });
        })
        .catch(function (err) {
          alert("処理に失敗しました: " + err.message);
        });
    });
  }

  document.getElementById("lot-table").addEventListener("click", function (e) {
    var link = e.target.closest("a.lot-id-link");
    if (!link) return;
    e.preventDefault();
    var lotId = (link.getAttribute("data-lot-id") || "").trim();
    var activeEstimateId = getActiveEstimateId();
    if (!lotId || !activeEstimateId) return;

    fetch("/api/est_calc/set_lot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        estimate_id: activeEstimateId,
        current_lot_id: currentLotId,
        lot_id: lotId,
      }),
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data.error) {
          alert(data.error);
          return;
        }
        window.location.href = "est_calc.html?estimate_id=" + encodeURIComponent(activeEstimateId);
      })
      .catch(function (err) {
        alert("通信エラー: " + err.message);
      });
  });

  // 使用中ロットID が無いときは入力リセットと同じ既定値（歩留り・洗浄・計量梱包・粗利率26・各賃率の初期反映など）
  if (!hasCurrentLotIdOnLoad) {
    performResetInputsExceptBasic();
  }

  // 初期反映（各種状態・連動処理）完了後に一括で 0 を空へ変換
  applyProc5ModeAndCosts();
  replaceLoadedZeroWithEmpty();
  calcShippingAndGrandUnitOnLoad();
  formatAllNonRateTextBoxesTo2();
  formatAllRateTextBoxesTo3();
  applyConditionalTextboxBackgrounds();
})();
