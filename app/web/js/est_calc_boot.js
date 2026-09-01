(function () {
  "use strict";

  function setVal(id, value) {
    var el = document.getElementById(id);
    if (!el) return;
    el.value = value == null ? "" : String(value);
  }

  function setChecked(id, on) {
    var el = document.getElementById(id);
    if (el) el.checked = Boolean(on);
  }

  function fillOptions(selectId, options, selected, attrMap, defaults) {
    var sel = document.getElementById(selectId);
    if (!sel) return;
    var keepFirst = sel.querySelector('option[value=""]');
    var firstHtml = keepFirst ? keepFirst.outerHTML : '<option value="">未選択</option>';
    sel.innerHTML = firstHtml;
    (options || []).forEach(function (opt) {
      var option = document.createElement("option");
      option.value = opt.id == null ? "" : String(opt.id);
      option.textContent = opt.name == null ? "" : String(opt.name);
      if (attrMap) {
        Object.keys(attrMap).forEach(function (attr) {
          var key = attrMap[attr];
          if (opt[key] != null && opt[key] !== "") {
            option.setAttribute(attr, String(opt[key]));
          }
        });
      }
      sel.appendChild(option);
    });
    var want = selected == null ? "" : String(selected);
    if (want) {
      sel.value = want;
      if (sel.value !== want) {
        Array.from(sel.options).some(function (o) {
          if ((o.textContent || "").trim() === want) {
            sel.value = o.value;
            return true;
          }
          return false;
        });
      }
    } else if (defaults && defaults.name) {
      Array.from(sel.options).some(function (o) {
        if ((o.textContent || "").trim() === defaults.name) {
          sel.value = o.value;
          return true;
        }
        return false;
      });
    }
  }

  function fillLotTable(rows) {
    var tbody = document.querySelector("#lot-table tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    (rows || []).forEach(function (row) {
      var tr = document.createElement("tr");
      var td0 = document.createElement("td");
      var a = document.createElement("a");
      a.href = "#";
      a.className = "lot-id-link";
      a.setAttribute("data-lot-id", row["ロットID"] == null ? "" : String(row["ロットID"]));
      a.textContent = row["ロットID"] == null ? "" : String(row["ロットID"]);
      td0.appendChild(a);
      tr.appendChild(td0);
      var td1 = document.createElement("td");
      td1.textContent = row["ロット数"] == null ? "" : String(row["ロット数"]);
      tr.appendChild(td1);
      var td2 = document.createElement("td");
      td2.textContent = row["見積単価"] == null ? "" : String(row["見積単価"]);
      tr.appendChild(td2);
      tbody.appendChild(tr);
    });
  }

  function fillInitialCostTable(rows) {
    var tbody = document.querySelector("#shoki-hiyou-table tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    (rows || []).forEach(function (row) {
      var tr = document.createElement("tr");
      function tdText(v) {
        var td = document.createElement("td");
        td.textContent = v == null ? "" : String(v);
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

  function setText(id, text) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text == null ? "" : String(text);
  }

  function applyRmMaster(data) {
    var general = data && data.rm_general != null ? String(data.rm_general) : "";
    var fuji = data && data.rm_fuji_koki != null ? String(data.rm_fuji_koki) : "";
    if (general !== "") setText("br-r1-125-val", " " + general);
    if (fuji !== "") setText("br-r1-97-val", " " + fuji);
    window.estCalcRmMaster = {
      general: general,
      fuji_koki: fuji,
    };
  }

  function applyPage(data) {
    document.body.setAttribute("data-rate-default-map", JSON.stringify(data.rate_default_map || {}));
    var i;
    for (i = 1; i <= 12; i++) setVal("est-" + i, data["est_" + i]);
    for (i = 1; i <= 19; i++) {
      if (i === 2 || i === 4) continue;
      setVal("mat-" + i, data["mat_" + i]);
    }
    fillOptions("mat-2", data.zairyo_2_options, data.mat_2, { "data-specgravity": "specgravity" });
    setVal("mat-4", data.mat_4);

    applyRmMaster(data);
    setChecked("br-cb-1", data.shinchuu_has_row);
    var r1 = String(data.shinchuu_r1 || "1");
    setChecked("br-r1-125", r1 !== "2");
    setChecked("br-r1-97", r1 === "2");
    var r2 = String(data.shinchuu_r2 || "1");
    setChecked("br-r2-tanjyu", r2 !== "2");
    setChecked("br-r2-scrap", r2 === "2");
    for (i = 1; i <= 10; i++) {
      if (i === 8) setVal("br-8", data.br_8_display);
      else setVal("br-" + i, data["br_" + i]);
    }

    fillOptions("proc-2", data.kakou_2_options, data.proc_2, {
      "data-hiju": "specgravity",
      "data-weight": "weight",
      "data-cycle": "cycle",
    });
    fillOptions("proc-5", data.kakou_5_options, data.proc_5, { "data-rate-sum": "rate_sum" });
    fillOptions("proc-14", data.kakou_14_options, data.proc_14, { "data-rate-sum": "rate_sum" });
    fillOptions("proc-24", data.kakou_24_options, data.proc_24, { "data-rate-sum": "rate_sum" }, { name: "四槽洗浄" });
    fillOptions("proc-32", data.kakou_32_options, data.proc_32);
    fillOptions("proc-34", data.kakou_34_options, data.proc_34);
    fillOptions("proc-36", data.kakou_36_options, data.proc_36, { "data-rate-sum": "rate_sum" }, { name: "人件費" });
    setVal("proc-9", data.proc_9);
    for (i = 1; i <= 39; i++) {
      if ([2, 5, 9, 14, 24, 32, 34, 36].indexOf(i) >= 0) continue;
      setVal("proc-" + i, data["proc_" + i]);
    }
    for (i = 1; i <= 6; i++) setChecked("proc-cb-" + i, data["proc_cb_" + i]);

    for (i = 1; i <= 31; i++) setVal("kensa-" + i, data["kensa_" + i]);
    for (i = 1; i <= 6; i++) setChecked("kensa-cb-" + i, data["kensa_cb_" + i]);

    var box = String(data.est_soryo_box || "1");
    setChecked("soryo-box-1", box !== "2");
    setChecked("soryo-box-2", box === "2");
    fillOptions("soryo-2", data.soryo_2_options, data.soryo_2, { "data-reg": "reg" });
    fillOptions("soryo-3", data.soryo_3_options, data.soryo_3, { "data-size": "size", "data-weight": "weight" });
    fillOptions("soryo-8", data.soryo_8_options, data.soryo_8, { "data-price": "price" });
    fillOptions("soryo-13", data.soryo_13_options, data.soryo_13, { "data-capacity": "capacity", "data-price": "price" });
    fillOptions("soryo-29", data.soryo_29_options, data.soryo_29, { "data-capacity": "capacity", "data-price": "price" });
    setVal("soryo-16", data.soryo_16 == null || data.soryo_16 === "" ? "0" : data.soryo_16);
    setVal("soryo-24", data.soryo_24 || "未選択");
    setVal("soryo-32", data.soryo_32 == null || data.soryo_32 === "" ? "0" : data.soryo_32);
    for (i = 1; i <= 39; i++) {
      if ([2, 3, 8, 13, 16, 24, 29, 32].indexOf(i) >= 0) continue;
      setVal("soryo-" + i, data["soryo_" + i]);
    }

    for (i = 1; i <= 3; i++) setVal("f-in-" + i, data["f_in_" + i]);
    for (i = 1; i <= 6; i++) setVal("f-out-" + i, data["f_out_" + i]);
    setVal("f-in-b1", data.f_in_b1);
    setVal("f-in-b2", data.f_in_b2);
    setVal("f-in-b3", data.f_in_b3);
    setVal("f-in-b4", data.f_in_b4);
    for (i = 1; i <= 10; i++) setVal("f-ch-" + i, data["f_ch_" + i]);

    fillLotTable(data.lot_rows);
    fillInitialCostTable(data.initial_cost_rows);
  }

  window.quotesEstCalcReady = (async function () {
    var estimateId = (new URLSearchParams(window.location.search).get("estimate_id") || "").trim();
    var data = await window.quotesApi("/api/est_calc/page", { estimate_id: estimateId });
    if (data && data.error) {
      throw new Error(data.error);
    }
    applyPage(data || {});
    await new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "js/est_calc.js";
      s.onload = resolve;
      s.onerror = function () {
        reject(new Error("est_calc.js の読み込みに失敗しました"));
      };
      document.body.appendChild(s);
    });
    return data;
  })().catch(function (err) {
    console.error(err);
    window.alert(err && err.message ? err.message : String(err));
  });
})();
