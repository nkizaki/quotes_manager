from __future__ import annotations

import base64
from datetime import date, datetime
from decimal import Decimal
from typing import Any

import loadenv
import webview
from app.display_info import get_display_info
from app.user_config import ensure_user_config, get_font_size_percent, set_font_size_percent
from app import cost_quote_service as svc


def _json_safe(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, bytes):
        return base64.b64encode(value).decode("ascii")
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    return str(value)


def _call(fn, payload=None):
    try:
        result = fn(payload or {})
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": str(exc)}
    if result is None:
        return {"ok": True}
    if isinstance(result, dict) and "error" in result and not result.get("ok"):
        return _json_safe(result)
    if isinstance(result, dict) and "ok" not in result and "error" not in result:
        result = {"ok": True, **result}
    return _json_safe(result)


class Api:
    def __init__(self) -> None:
        # pywebview は js_api の非 _ 属性を再帰走査する。Window を公開すると
        # native/WebView2 COM へ入り込み、起動時にエラーログが出る。
        self._window = None

    def bootstrap(self) -> dict[str, Any]:
        ensure_user_config()
        return {
            "ok": True,
            "version": loadenv.version,
            "devflg": loadenv.devflg,
            "db_display": loadenv.postgres_display(),
            "display": get_display_info(),
            "font_size_percent": get_font_size_percent(),
        }

    def get_font_size(self) -> dict[str, Any]:
        try:
            return {"ok": True, "font_size_percent": get_font_size_percent()}
        except Exception as exc:  # noqa: BLE001
            return {"ok": False, "error": str(exc)}

    def set_font_size(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        payload = payload or {}
        try:
            data = set_font_size_percent(payload.get("font_size_percent", payload.get("value")))
            return {"ok": True, "font_size_percent": data["font_size_percent"]}
        except Exception as exc:  # noqa: BLE001
            return {"ok": False, "error": str(exc)}

    def get_search_page(self, payload=None):
        return _call(svc.get_search_page, payload)

    def get_est_calc_page(self, payload=None):
        return _call(svc.get_est_calc_page, payload)

    def est_calc_set_lot(self, payload=None):
        return _call(svc.api_est_calc_set_lot, payload)

    def est_calc_clear_usage_flag(self, payload=None):
        return _call(svc.api_est_calc_clear_usage_flag, payload)

    def est_calc_add_estimate_lot(self, payload=None):
        return _call(svc.api_est_calc_add_estimate_lot, payload)

    def est_calc_delete_estimate_lot(self, payload=None):
        return _call(svc.api_est_calc_delete_estimate_lot, payload)

    def est_calc_pre_export_save(self, payload=None):
        return _call(svc.api_est_calc_pre_export_save, payload)

    def est_calc_shipping_by_region_size(self, payload=None):
        return _call(svc.api_est_calc_shipping_by_region_size, payload)

    def est_calc_initial_cost_row(self, payload=None):
        return _call(svc.api_est_calc_initial_cost_row, payload)

    def est_calc_initial_cost_save(self, payload=None):
        return _call(svc.api_est_calc_initial_cost_save, payload)

    def est_calc_initial_cost_delete(self, payload=None):
        return _call(svc.api_est_calc_initial_cost_delete, payload)

    def est_calc_export_xlsx(self, payload=None):
        try:
            result = svc.api_est_calc_export_xlsx(payload or {})
            if not isinstance(result, dict) or result.get("error"):
                return _json_safe(result if isinstance(result, dict) else {"error": "Excel出力に失敗しました"})
            raw = result.get("_xlsx_bytes")
            name = result.get("_xlsx_name") or "原価見積書.xlsx"
            if not raw:
                return {"error": "Excel出力に失敗しました"}
            dest = None
            if self._window is not None:
                dest = self._window.create_file_dialog(
                    webview.SAVE_DIALOG,
                    save_filename=str(name),
                    file_types=("Excel Files (*.xlsx)",),
                )
            if not dest:
                return {"ok": False, "cancelled": True}
            path = dest[0] if isinstance(dest, (list, tuple)) else dest
            with open(path, "wb") as f:
                f.write(raw)
            return {"ok": True, "path": str(path)}
        except Exception as exc:  # noqa: BLE001
            return {"ok": False, "error": str(exc)}

    def rate_master_list(self, payload=None):
        return _call(svc.api_rate_master_list, payload)

    def rate_master_save(self, payload=None):
        return _call(svc.api_rate_master_save, payload)

    def rate_master_delete(self, payload=None):
        return _call(svc.api_rate_master_delete, payload)

    def freight_master_list(self, payload=None):
        return _call(svc.api_freight_master_list, payload)

    def freight_master_save(self, payload=None):
        return _call(svc.api_freight_master_save, payload)

    def freight_master_delete(self, payload=None):
        return _call(svc.api_freight_master_delete, payload)

    def tray_master_list(self, payload=None):
        return _call(svc.api_tray_master_list, payload)

    def tray_master_save(self, payload=None):
        return _call(svc.api_tray_master_save, payload)

    def tray_master_delete(self, payload=None):
        return _call(svc.api_tray_master_delete, payload)

    def dbox_master_list(self, payload=None):
        return _call(svc.api_dbox_master_list, payload)

    def dbox_master_save(self, payload=None):
        return _call(svc.api_dbox_master_save, payload)

    def dbox_master_delete(self, payload=None):
        return _call(svc.api_dbox_master_delete, payload)

    def search_conditions(self, payload=None):
        return _call(svc.api_search_conditions, payload)

    def register_estimate(self, payload=None):
        return _call(svc.api_register_estimate, payload)

    def update_estimate_history(self, payload=None):
        return _call(svc.api_update_estimate_history, payload)

    def search_delete_estimate(self, payload=None):
        return _call(svc.api_search_delete_estimate, payload)

    def api_search(self, payload=None):
        return _call(svc.api_search, payload)
