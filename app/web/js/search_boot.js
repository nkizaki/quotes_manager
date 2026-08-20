(function () {
  "use strict";

  function fillSelect(id, items) {
    var sel = document.getElementById(id);
    if (!sel) return;
    var first = sel.querySelector("option");
    sel.innerHTML = "";
    if (first && first.value === "") {
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

  window.quotesSearchReady = (async function () {
    var data = await window.quotesApi("/api/search/page", {});
    if (data && data.error) {
      throw new Error(data.error);
    }
    fillSelect("sales-select", data.sales_list);
    fillSelect("customer-select", data.customer_list);
    fillSelect("new-sales-select", data.sales_list);
    fillSelect("new-customer-select", data.customer_list);
    await new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "js/search.js";
      s.onload = resolve;
      s.onerror = function () {
        reject(new Error("search.js の読み込みに失敗しました"));
      };
      document.body.appendChild(s);
    });
    return data;
  })().catch(function (err) {
    console.error(err);
    window.alert(err && err.message ? err.message : String(err));
  });
})();
