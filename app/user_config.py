"""ユーザー設定（%LOCALAPPDATA%\\見積り管理\\config.json）。"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

APP_DIR_NAME = "見積り管理"
CONFIG_FILE_NAME = "config.json"
DEFAULT_FONT_SIZE_PERCENT = 100
MIN_FONT_SIZE_PERCENT = 50
MAX_FONT_SIZE_PERCENT = 300

QUOTE_SEARCH_PREFS_KEY = "quote_search_prefs"
COST_QUOTE_SEARCH_PREFS_KEY = "cost_quote_search_prefs"

_QUOTE_ORDER_COLS = {
    "見積りID",
    "管理NO",
    "営業担当",
    "客先名",
    "客先部署",
    "客先担当者",
    "品番",
    "品名",
    "依頼日",
    "提出日",
    "備考",
}
_COST_QUOTE_ORDER_COLS = {
    "原価見積りID",
    "管理NO",
    "営業担当",
    "客先名",
    "品番",
    "品名",
    "備考",
}


def app_data_dir() -> Path:
    base = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA") or str(Path.home())
    return Path(base) / APP_DIR_NAME


def config_path() -> Path:
    return app_data_dir() / CONFIG_FILE_NAME


def _default_config() -> dict[str, Any]:
    return {
        "font_size_percent": DEFAULT_FONT_SIZE_PERCENT,
        "last_save_folder": "",
    }


def _normalize_font_size_percent(value: Any) -> int:
    try:
        if isinstance(value, str):
            text = value.strip().replace("%", "")
            num = float(text) if text else DEFAULT_FONT_SIZE_PERCENT
        else:
            num = float(value)
    except (TypeError, ValueError):
        return DEFAULT_FONT_SIZE_PERCENT
    percent = int(round(num))
    if percent < MIN_FONT_SIZE_PERCENT:
        return MIN_FONT_SIZE_PERCENT
    if percent > MAX_FONT_SIZE_PERCENT:
        return MAX_FONT_SIZE_PERCENT
    return percent


def _normalize_last_save_folder(value: Any) -> str:
    if value is None:
        return ""
    s = str(value).strip()
    if not s:
        return ""
    try:
        return str(Path(s))
    except Exception:
        return s


def _str_pref(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _normalize_order_dir(value: Any) -> str:
    s = _str_pref(value).lower()
    return "desc" if s in ("desc", "descending", "降順") else "asc"


def _normalize_quote_search_prefs(raw: dict[str, Any] | None) -> dict[str, Any]:
    src = raw if isinstance(raw, dict) else {}
    order_by = _str_pref(src.get("order_by") or src.get("order_col") or "見積りID")
    if order_by not in _QUOTE_ORDER_COLS:
        order_by = "見積りID"
    return {
        "sales_id": _str_pref(src.get("sales_id")),
        "customer_code": _str_pref(src.get("customer_code")),
        "part_no": _str_pref(src.get("part_no")),
        "part_name": _str_pref(src.get("part_name")),
        "quote_id": _str_pref(src.get("quote_id")),
        "order_by": order_by,
        "order_dir": _normalize_order_dir(src.get("order_dir")),
    }


def _normalize_cost_quote_search_prefs(raw: dict[str, Any] | None) -> dict[str, Any]:
    src = raw if isinstance(raw, dict) else {}
    order_by = _str_pref(src.get("order_by") or src.get("order_col") or "原価見積りID")
    if order_by not in _COST_QUOTE_ORDER_COLS:
        order_by = "原価見積りID"
    return {
        "sales_id": _str_pref(src.get("sales_id")),
        "customer_code": _str_pref(src.get("customer_code")),
        "part_no": _str_pref(src.get("part_no")),
        "part_name": _str_pref(src.get("part_name")),
        "estimate_id": _str_pref(src.get("estimate_id")),
        "order_by": order_by,
        "order_dir": _normalize_order_dir(src.get("order_dir")),
    }


def _normalize_config(raw: dict[str, Any] | None) -> dict[str, Any]:
    src = raw if isinstance(raw, dict) else {}
    data: dict[str, Any] = {
        "font_size_percent": _normalize_font_size_percent(
            src.get("font_size_percent", DEFAULT_FONT_SIZE_PERCENT)
        ),
        "last_save_folder": _normalize_last_save_folder(src.get("last_save_folder", "")),
    }
    # 検索オプションはキーがあるときだけ保持（無い場合は作らない＝復元しない）
    if QUOTE_SEARCH_PREFS_KEY in src and isinstance(src.get(QUOTE_SEARCH_PREFS_KEY), dict):
        data[QUOTE_SEARCH_PREFS_KEY] = _normalize_quote_search_prefs(src.get(QUOTE_SEARCH_PREFS_KEY))
    if COST_QUOTE_SEARCH_PREFS_KEY in src and isinstance(src.get(COST_QUOTE_SEARCH_PREFS_KEY), dict):
        data[COST_QUOTE_SEARCH_PREFS_KEY] = _normalize_cost_quote_search_prefs(
            src.get(COST_QUOTE_SEARCH_PREFS_KEY)
        )
    return data


def _write_config(data: dict[str, Any]) -> None:
    path = config_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = _normalize_config(data)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def ensure_user_config() -> dict[str, Any]:
    path = config_path()
    if not path.is_file():
        data = _default_config()
        _write_config(data)
        return data
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(raw, dict):
            raise ValueError("invalid config")
        data = _normalize_config(raw)
        needs_write = (
            raw.get("font_size_percent") != data["font_size_percent"]
            or raw.get("last_save_folder", "") != data["last_save_folder"]
            or "last_save_folder" not in raw
        )
        if needs_write:
            _write_config(data)
        return data
    except Exception:
        data = _default_config()
        _write_config(data)
        return data


def get_font_size_percent() -> int:
    return int(ensure_user_config().get("font_size_percent", DEFAULT_FONT_SIZE_PERCENT))


def set_font_size_percent(value: Any) -> dict[str, Any]:
    percent = _normalize_font_size_percent(value)
    data = ensure_user_config()
    data["font_size_percent"] = percent
    _write_config(data)
    try:
        candidates = [Path(__file__).resolve().parents[1] / "app" / "web" / "js" / "font_size_pref.js"]
        if getattr(sys, "frozen", False):
            meipass = Path(getattr(sys, "_MEIPASS", "") or "")
            if meipass:
                candidates.append(meipass / "app" / "web" / "js" / "font_size_pref.js")
        text = f"window.__SHIP_INSP_FONT_SIZE_PERCENT__ = {percent};\n"
        for path in candidates:
            try:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(text, encoding="utf-8")
            except Exception:
                continue
    except Exception:
        pass
    return data


def get_last_save_folder() -> str:
    """保存ダイアログ初期ディレクトリ。存在しない場合は空文字。"""
    folder = _normalize_last_save_folder(ensure_user_config().get("last_save_folder", ""))
    if folder and os.path.isdir(folder):
        return folder
    return ""


def set_last_save_folder(value: Any) -> dict[str, Any]:
    """
    最後に保存したフォルダを記録する。
    ファイルパスが渡された場合は親ディレクトリを使う。
    """
    raw = _normalize_last_save_folder(value)
    folder = ""
    if raw:
        p = Path(raw)
        if p.suffix:
            folder = str(p.parent)
        else:
            folder = str(p)
        if folder and not os.path.isdir(folder):
            parent = str(Path(folder).parent)
            folder = parent if parent and os.path.isdir(parent) else folder
    data = ensure_user_config()
    data["last_save_folder"] = _normalize_last_save_folder(folder)
    _write_config(data)
    return data


def get_search_prefs(kind: str) -> dict[str, Any] | None:
    """
    保存済み検索オプションを返す。キーが無い場合は None（復元しない）。
    kind: "quote" | "cost_quote"
    """
    data = ensure_user_config()
    if kind == "quote":
        prefs = data.get(QUOTE_SEARCH_PREFS_KEY)
        return dict(prefs) if isinstance(prefs, dict) else None
    if kind == "cost_quote":
        prefs = data.get(COST_QUOTE_SEARCH_PREFS_KEY)
        return dict(prefs) if isinstance(prefs, dict) else None
    return None


def set_search_prefs(kind: str, prefs: Any) -> dict[str, Any]:
    """検索オプションを保存する。"""
    data = ensure_user_config()
    raw = prefs if isinstance(prefs, dict) else {}
    if kind == "quote":
        data[QUOTE_SEARCH_PREFS_KEY] = _normalize_quote_search_prefs(raw)
    elif kind == "cost_quote":
        data[COST_QUOTE_SEARCH_PREFS_KEY] = _normalize_cost_quote_search_prefs(raw)
    else:
        return {"ok": False, "error": "kind が不正です"}
    _write_config(data)
    return {"ok": True, "prefs": get_search_prefs(kind)}
