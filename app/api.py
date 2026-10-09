from __future__ import annotations

import base64
import os
import subprocess
import sys
from datetime import date, datetime
from decimal import Decimal
from typing import Any

import loadenv
import webview
from app.display_info import get_display_info
from app.user_config import (
    ensure_user_config,
    get_font_size_percent,
    get_last_save_folder,
    get_search_prefs,
    set_font_size_percent,
    set_last_save_folder,
    set_search_prefs,
)
from app import quotes_service as svc
from app import quote_masters_service as qms


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

    def get_search_prefs(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        payload = payload or {}
        kind = str(payload.get("kind") or "").strip()
        try:
            prefs = get_search_prefs(kind)
            if prefs is None:
                return {"ok": True, "has_prefs": False, "prefs": None}
            return {"ok": True, "has_prefs": True, "prefs": prefs}
        except Exception as exc:  # noqa: BLE001
            return {"ok": False, "error": str(exc)}

    def set_search_prefs(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        payload = payload or {}
        kind = str(payload.get("kind") or "").strip()
        prefs = payload.get("prefs") if isinstance(payload.get("prefs"), dict) else payload
        try:
            result = set_search_prefs(kind, prefs)
            if result.get("ok") is False:
                return _json_safe(result)
            return {"ok": True, "prefs": result.get("prefs")}
        except Exception as exc:  # noqa: BLE001
            return {"ok": False, "error": str(exc)}

    def get_search_page(self, payload=None):
        return _call(svc.get_search_page, payload)

    def get_est_calc_page(self, payload=None):
        return _call(svc.get_est_calc_page, payload)

    def get_quote_calc_page(self, payload=None):
        return _call(svc.get_quote_calc_page, payload) # 見積り計算ページを取得

    def delete_quote_calc_brass(self, payload=None):
        return _call(svc.delete_quote_calc_brass, payload)

    def delete_quote_calc_material(self, payload=None):
        return _call(svc.delete_quote_calc_material, payload)

    def save_quote_calc_material(self, payload=None):
        return _call(svc.save_quote_calc_material, payload)

    def save_quote_calc_processing(self, payload=None):
        return _call(svc.save_quote_calc_processing, payload)

    def delete_quote_calc_processing(self, payload=None):
        return _call(svc.delete_quote_calc_processing, payload)

    def quote_calc_packaging_list(self, payload=None):
        return _call(svc.api_quote_calc_packaging_list, payload)

    def quote_calc_packaging_row(self, payload=None):
        return _call(svc.api_quote_calc_packaging_row, payload)

    def quote_calc_packaging_save(self, payload=None):
        return _call(svc.api_quote_calc_packaging_save, payload)

    def quote_calc_packaging_delete(self, payload=None):
        return _call(svc.api_quote_calc_packaging_delete, payload)

    def quote_calc_initial_cost_row(self, payload=None):
        return _call(svc.api_quote_calc_initial_cost_row, payload)

    def quote_calc_initial_cost_save(self, payload=None):
        return _call(svc.api_quote_calc_initial_cost_save, payload)

    def quote_calc_initial_cost_delete(self, payload=None):
        return _call(svc.api_quote_calc_initial_cost_delete, payload)

    def quote_calc_surface_list(self, payload=None):
        return _call(svc.api_quote_calc_surface_list, payload)

    def quote_calc_surface_row(self, payload=None):
        return _call(svc.api_quote_calc_surface_row, payload)

    def quote_calc_surface_save(self, payload=None):
        return _call(svc.api_quote_calc_surface_save, payload)

    def quote_calc_surface_delete(self, payload=None):
        return _call(svc.api_quote_calc_surface_delete, payload)

    def quote_calc_conditions_save(self, payload=None):
        return _call(svc.api_quote_calc_conditions_save, payload)

    def quote_calc_remarks_save(self, payload=None):
        return _call(svc.api_quote_calc_remarks_save, payload)

    def quote_calc_create_doc_check(self, payload=None):
        return _call(svc.api_quote_calc_create_doc_check, payload)

    def quote_calc_export_xlsx(self, payload=None):
        """見積書 xlsx を生成し、保存ダイアログで書き出す。"""
        try:
            result = svc.api_quote_calc_export_xlsx(payload or {})
            if not isinstance(result, dict) or result.get("error"):
                return _json_safe(
                    result if isinstance(result, dict) else {"error": "見積書作成に失敗しました"}
                )
            raw = result.get("_xlsx_bytes")
            name = result.get("_xlsx_name") or "見積書.xlsx"
            if not raw:
                return {"error": "見積書作成に失敗しました"}
            return self._save_xlsx_with_dialog(raw, name)
        except Exception as exc:  # noqa: BLE001
            return {"ok": False, "error": str(exc)}

    def _open_saved_file(self, path: str) -> None:
        """保存したファイルを OS 既定アプリで開く（失敗しても握りつぶす）。"""
        try:
            if sys.platform.startswith("win"):
                os.startfile(path)  # type: ignore[attr-defined]
            elif sys.platform == "darwin":
                subprocess.Popen(["open", path])
            else:
                subprocess.Popen(["xdg-open", path])
        except Exception:
            pass

    _XLSX_FILE_IN_USE_MSG = "同じ名前のExcelが開かれているため\n保存に失敗しました"

    def _save_xlsx_with_dialog(self, raw, name: str) -> dict[str, Any]:
        """保存ダイアログ表示 → 書き込み → 最終保存フォルダを config.json に記録 → ファイルを開く。"""
        if not webview.windows:
            return {"ok": False, "error": "ウィンドウが初期化されていません。"}
        window = webview.windows[0]
        directory = get_last_save_folder()
        dest = window.create_file_dialog(
            webview.SAVE_DIALOG,
            directory=directory,
            save_filename=str(name),
            file_types=("Excel Files (*.xlsx)",),
        )
        if not dest:
            return {"ok": False, "cancelled": True}
        path = dest[0] if isinstance(dest, (list, tuple)) else dest
        path = str(path)
        try:
            with open(path, "wb") as f:
                f.write(raw)
        except PermissionError:
            return {
                "ok": False,
                "error_code": "file_in_use",
                "error": self._XLSX_FILE_IN_USE_MSG,
            }
        except OSError as exc:
            if getattr(exc, "errno", None) == 13:
                return {
                    "ok": False,
                    "error_code": "file_in_use",
                    "error": self._XLSX_FILE_IN_USE_MSG,
                }
            raise
        try:
            set_last_save_folder(path)
        except Exception:
            pass
        self._open_saved_file(path)
        return {"ok": True, "path": path}

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
        """原価見積書 xlsx を生成し、保存ダイアログで書き出す。"""
        try:
            result = svc.api_est_calc_export_xlsx(payload or {})
            if not isinstance(result, dict) or result.get("error"):
                return _json_safe(result if isinstance(result, dict) else {"error": "Excel出力に失敗しました"})
            raw = result.get("_xlsx_bytes")
            name = result.get("_xlsx_name") or "原価見積書.xlsx"
            if not raw:
                return {"error": "Excel出力に失敗しました"}
            return self._save_xlsx_with_dialog(raw, name)
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

    def sales_master_list(self, payload=None):
        return _call(qms.api_sales_master_list, payload)

    def sales_master_save(self, payload=None):
        return _call(qms.api_sales_master_save, payload)

    def sales_master_delete(self, payload=None):
        return _call(qms.api_sales_master_delete, payload)

    def customer_master_list(self, payload=None):
        return _call(qms.api_customer_master_list, payload)

    def customer_master_save(self, payload=None):
        return _call(qms.api_customer_master_save, payload)

    def customer_master_delete(self, payload=None):
        return _call(qms.api_customer_master_delete, payload)

    def rm_master_list(self, payload=None):
        return _call(qms.api_rm_master_list, payload)

    def rm_master_save(self, payload=None):
        return _call(qms.api_rm_master_save, payload)

    def rm_master_delete(self, payload=None):
        return _call(qms.api_rm_master_delete, payload)

    def surface_master_list(self, payload=None):
        return _call(qms.api_surface_master_list, payload)

    def surface_master_save(self, payload=None):
        return _call(qms.api_surface_master_save, payload)

    def surface_master_delete(self, payload=None):
        return _call(qms.api_surface_master_delete, payload)

    def gravity_master_list(self, payload=None):
        return _call(qms.api_gravity_master_list, payload)

    def gravity_master_save(self, payload=None):
        return _call(qms.api_gravity_master_save, payload)

    def gravity_master_delete(self, payload=None):
        return _call(qms.api_gravity_master_delete, payload)

    def machine_charge_master_list(self, payload=None):
        return _call(qms.api_machine_charge_master_list, payload)

    def machine_charge_master_save(self, payload=None):
        return _call(qms.api_machine_charge_master_save, payload)

    def machine_charge_master_delete(self, payload=None):
        return _call(qms.api_machine_charge_master_delete, payload)

    def cost_quote_margin_summary_export_xlsx(self, payload=None):
        """粗利率集計 xlsx を生成し、保存ダイアログで書き出す。"""
        try:
            result = svc.api_cost_quote_margin_summary_export_xlsx(payload or {})
            if not isinstance(result, dict) or result.get("error"):
                return _json_safe(
                    result if isinstance(result, dict) else {"error": "集計エクスポートに失敗しました"}
                )
            raw = result.get("_xlsx_bytes")
            name = result.get("_xlsx_name") or "原価見積_粗利集計.xlsx"
            if not raw:
                return {"error": "集計エクスポートに失敗しました"}
            return self._save_xlsx_with_dialog(raw, name)
        except Exception as exc:  # noqa: BLE001
            return {"ok": False, "error": str(exc)}

    def search_conditions(self, payload=None):
        return _call(svc.api_search_conditions, payload)

    def quote_search_conditions(self, payload=None):
        return _call(svc.api_quote_search_conditions, payload)

    def register_quote(self, payload=None):
        return _call(svc.api_register_quote, payload)

    def update_quote_history(self, payload=None):
        return _call(svc.api_update_quote_history, payload)

    def results_summary(self, payload=None):
        return _call(svc.api_results_summary, payload)

    def register_estimate(self, payload=None):
        return _call(svc.api_register_estimate, payload)

    def update_estimate_history(self, payload=None):
        return _call(svc.api_update_estimate_history, payload)

    def search_delete_estimate(self, payload=None):
        return _call(svc.api_search_delete_estimate, payload)

    def search_delete_quote(self, payload=None):
        return _call(svc.api_search_delete_quote, payload)

    def api_search(self, payload=None):
        return _call(svc.api_search, payload)
