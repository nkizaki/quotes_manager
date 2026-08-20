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


def app_data_dir() -> Path:
    base = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA") or str(Path.home())
    return Path(base) / APP_DIR_NAME


def config_path() -> Path:
    return app_data_dir() / CONFIG_FILE_NAME


def _default_config() -> dict[str, Any]:
    return {"font_size_percent": DEFAULT_FONT_SIZE_PERCENT}


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


def _write_config(data: dict[str, Any]) -> None:
    path = config_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "font_size_percent": _normalize_font_size_percent(
            data.get("font_size_percent", DEFAULT_FONT_SIZE_PERCENT)
        )
    }
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
        data = {
            "font_size_percent": _normalize_font_size_percent(
                raw.get("font_size_percent", DEFAULT_FONT_SIZE_PERCENT)
            )
        }
        if raw.get("font_size_percent") != data["font_size_percent"]:
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
    data = {"font_size_percent": percent}
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
