(function () {
  "use strict";

  const API_METHODS = {
    "/api/bootstrap": "bootstrap",
    "/api/config/font-size": "set_font_size",
    "/api/config/font-size-get": "get_font_size",
    "/api/search/page": "get_search_page",
    "/api/est_calc/page": "get_est_calc_page",
    "/api/est_calc/set_lot": "est_calc_set_lot",
    "/api/est_calc/clear_usage_flag": "est_calc_clear_usage_flag",
    "/api/est_calc/add_estimate_lot": "est_calc_add_estimate_lot",
    "/api/est_calc/delete_estimate_lot": "est_calc_delete_estimate_lot",
    "/api/est_calc/pre_export_save": "est_calc_pre_export_save",
    "/api/est_calc/shipping_by_region_size": "est_calc_shipping_by_region_size",
    "/api/est_calc/initial_cost_row": "est_calc_initial_cost_row",
    "/api/est_calc/initial_cost_save": "est_calc_initial_cost_save",
    "/api/est_calc/initial_cost_delete": "est_calc_initial_cost_delete",
    "/api/est_calc/export_xlsx": "est_calc_export_xlsx",
    "/api/rate_master": "rate_master_list",
    "/api/rate_master/save": "rate_master_save",
    "/api/rate_master/delete": "rate_master_delete",
    "/api/freight_master": "freight_master_list",
    "/api/freight_master/save": "freight_master_save",
    "/api/freight_master/delete": "freight_master_delete",
    "/api/tray_master": "tray_master_list",
    "/api/tray_master/save": "tray_master_save",
    "/api/tray_master/delete": "tray_master_delete",
    "/api/dbox_master": "dbox_master_list",
    "/api/dbox_master/save": "dbox_master_save",
    "/api/dbox_master/delete": "dbox_master_delete",
    "/api/sales_master": "sales_master_list",
    "/api/sales_master/save": "sales_master_save",
    "/api/sales_master/delete": "sales_master_delete",
    "/api/customer_master": "customer_master_list",
    "/api/customer_master/save": "customer_master_save",
    "/api/customer_master/delete": "customer_master_delete",
    "/api/rm_master": "rm_master_list",
    "/api/rm_master/save": "rm_master_save",
    "/api/rm_master/delete": "rm_master_delete",
    "/api/surface_master": "surface_master_list",
    "/api/surface_master/save": "surface_master_save",
    "/api/surface_master/delete": "surface_master_delete",
    "/api/machine_charge_master": "machine_charge_master_list",
    "/api/machine_charge_master/save": "machine_charge_master_save",
    "/api/machine_charge_master/delete": "machine_charge_master_delete",
    "/api/search_conditions": "search_conditions",
    "/api/quote_search_conditions": "quote_search_conditions",
    "/api/register_quote": "register_quote",
    "/api/update_quote_history": "update_quote_history",
    "/api/register_estimate": "register_estimate",
    "/api/update_estimate_history": "update_estimate_history",
    "/api/search_delete_estimate": "search_delete_estimate",
    "/api/search": "api_search",
  };

  let bridgeReadyPromise = null;

  function getBridge() {
    return window.pywebview && window.pywebview.api;
  }

  function isBridgeReady(bridge) {
    bridge = bridge || getBridge();
    return Boolean(bridge && typeof bridge.bootstrap === "function");
  }

  function waitForBridge(timeoutMs) {
    timeoutMs = timeoutMs || 30000;
    if (bridgeReadyPromise) return bridgeReadyPromise;
    bridgeReadyPromise = new Promise(function (resolve, reject) {
      var timer;
      var poller;
      function cleanup() {
        if (timer) clearTimeout(timer);
        if (poller) clearInterval(poller);
        window.removeEventListener("pywebviewready", onReady);
      }
      function tryResolve() {
        var bridge = getBridge();
        if (!isBridgeReady(bridge)) return false;
        cleanup();
        resolve(bridge);
        return true;
      }
      function onReady() {
        tryResolve();
      }
      if (tryResolve()) return;
      timer = setTimeout(function () {
        cleanup();
        bridgeReadyPromise = null;
        reject(new Error("pywebview API の初期化がタイムアウトしました。"));
      }, timeoutMs);
      poller = setInterval(tryResolve, 50);
      window.addEventListener("pywebviewready", onReady);
    });
    return bridgeReadyPromise;
  }

  function parseUrl(url) {
    var text = String(url || "");
    var q = text.indexOf("?");
    var path = q >= 0 ? text.slice(0, q) : text;
    var query = {};
    if (q >= 0) {
      new URLSearchParams(text.slice(q + 1)).forEach(function (value, key) {
        query[key] = value;
      });
    }
    return { path: path, query: query };
  }

  async function quotesApi(path, payload) {
    var method = API_METHODS[path];
    if (!method) {
      throw new Error("未対応の API: " + path);
    }
    var bridge = await waitForBridge();
    var fn = bridge[method];
    if (typeof fn !== "function") {
      bridgeReadyPromise = null;
      throw new Error("API メソッドが利用できません: " + method);
    }
    if (payload == null) {
      return fn.call(bridge);
    }
    return fn.call(bridge, payload);
  }

  function jsonResponse(data, ok) {
    var body = JSON.stringify(data == null ? {} : data);
    return {
      ok: ok !== false,
      status: ok === false ? 500 : 200,
      json: function () {
        return Promise.resolve(data == null ? {} : data);
      },
      text: function () {
        return Promise.resolve(body);
      },
      blob: function () {
        return Promise.reject(new Error("blob 応答には対応していません"));
      },
    };
  }

  var nativeFetch = window.fetch.bind(window);
  window.fetch = function (url, options) {
    var parsed = parseUrl(url);
    if (!API_METHODS[parsed.path]) {
      return nativeFetch(url, options);
    }
    options = options || {};
    var payload = Object.assign({}, parsed.query);
    if (options.body) {
      var body = options.body;
      if (typeof body === "string") {
        try {
          Object.assign(payload, JSON.parse(body));
        } catch (e) {
          /* ignore */
        }
      } else if (typeof body === "object") {
        Object.assign(payload, body);
      }
    }
    return quotesApi(parsed.path, payload).then(function (data) {
      var failed = Boolean(data && data.error && data.ok !== true);
      return jsonResponse(data, !failed);
    });
  };

  window.quotesApi = quotesApi;
  window.quotesWaitForBridge = waitForBridge;
  window.shipInspApi = quotesApi;
  window.shipInspWaitForBridge = waitForBridge;
})();
