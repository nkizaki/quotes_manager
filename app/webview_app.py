from __future__ import annotations

import ctypes
import os
import sys
from pathlib import Path

import webview

import loadenv
from app.api import Api
from app.user_config import ensure_user_config, get_font_size_percent


def app_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__))))
    return Path(__file__).resolve().parents[1]


def resource_path(*parts: str) -> Path:
    return app_root().joinpath(*parts)


def _write_font_size_pref_js() -> None:
    path = resource_path("app", "web", "js", "font_size_pref.js")
    try:
        percent = int(get_font_size_percent())
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            f"window.__SHIP_INSP_FONT_SIZE_PERCENT__ = {percent};\n",
            encoding="utf-8",
        )
    except Exception:
        pass


def _apply_taskbar_icon(window, icon_path: Path) -> None:
    if sys.platform != "win32" or not icon_path.is_file():
        return
    try:
        import win32con
        import win32gui

        path = str(icon_path.resolve())
        hwnd = window.native.Handle.ToInt32()
        for width, height, icon_kind in (
            (0, 0, win32con.ICON_BIG),
            (16, 16, win32con.ICON_SMALL),
        ):
            flags = win32con.LR_LOADFROMFILE
            if width == 0:
                flags |= win32con.LR_DEFAULTSIZE
            icon_handle = win32gui.LoadImage(
                0, path, win32con.IMAGE_ICON, width, height, flags
            )
            if icon_handle:
                win32gui.SendMessage(hwnd, win32con.WM_SETICON, icon_kind, icon_handle)
    except Exception:
        pass


def _on_gui_ready(window, icon_path: Path) -> None:
    _apply_taskbar_icon(window, icon_path)
    try:
        window.maximize()
    except Exception:
        pass


def run() -> None:
    os.environ["QUOTES_MANAGER_LAUNCHER"] = "1"
    os.chdir(app_root())

    root = str(app_root())
    if root not in sys.path:
        sys.path.insert(0, root)

    ensure_user_config()
    _write_font_size_pref_js()
    api = Api()

    myappid = "QuotesManager." + (loadenv.version or "1.0.0")
    try:
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(myappid)
    except Exception:
        pass

    html_path = resource_path("app", "web", "index.html")
    icon_path = resource_path("app", "web", "icons", "icon.ico")
    icon = str(icon_path.resolve()) if icon_path.is_file() else None

    window = webview.create_window(
        "見積り管理",
        html_path.as_uri(),
        js_api=api,
        text_select=True,
        maximized=True,
    )

    webview.start(
        _on_gui_ready,
        (window, icon_path),
        icon=icon,
        debug=loadenv.devflg,
    )
