from __future__ import annotations

import ctypes
from ctypes import wintypes
from typing import Any

# 表示設定（webview_app と共有）
# REF_SCREEN_WIDTH = 1920
# REF_SCREEN_HEIGHT = 1080
# 一覧表向けに作業領域のほぼ全体を使う
WINDOW_WIDTH_RATIO = 0.95
WINDOW_HEIGHT_RATIO = 0.95
WINDOW_TOP_OFFSET_RATIO = 0.03

_SPI_GETWORKAREA = 0x0030
_ENUM_CURRENT_SETTINGS = -1


class _RECT(ctypes.Structure):
    _fields_ = [
        ("left", wintypes.LONG),
        ("top", wintypes.LONG),
        ("right", wintypes.LONG),
        ("bottom", wintypes.LONG),
    ]


class _DEVMODE(ctypes.Structure):
    _fields_ = [
        ("dmDeviceName", wintypes.WCHAR * 32),
        ("dmSpecVersion", wintypes.WORD),
        ("dmDriverVersion", wintypes.WORD),
        ("dmSize", wintypes.WORD),
        ("dmDriverExtra", wintypes.WORD),
        ("dmFields", wintypes.DWORD),
        ("dmOrientation", ctypes.c_short),
        ("dmPaperSize", ctypes.c_short),
        ("dmPaperLength", ctypes.c_short),
        ("dmPaperWidth", ctypes.c_short),
        ("dmScale", ctypes.c_short),
        ("dmCopies", ctypes.c_short),
        ("dmDefaultSource", ctypes.c_short),
        ("dmPrintQuality", ctypes.c_short),
        ("dmColor", ctypes.c_short),
        ("dmDuplex", ctypes.c_short),
        ("dmYResolution", ctypes.c_short),
        ("dmTTOption", ctypes.c_short),
        ("dmCollate", ctypes.c_short),
        ("dmFormName", wintypes.WCHAR * 32),
        ("dmLogPixels", wintypes.WORD),
        ("dmBitsPerPel", wintypes.DWORD),
        ("dmPelsWidth", wintypes.DWORD),
        ("dmPelsHeight", wintypes.DWORD),
        ("dmDisplayFlags", wintypes.DWORD),
        ("dmDisplayFrequency", wintypes.DWORD),
        ("dmICMMethod", wintypes.DWORD),
        ("dmICMIntent", wintypes.DWORD),
        ("dmMediaType", wintypes.DWORD),
        ("dmDitherType", wintypes.DWORD),
        ("dmReserved1", wintypes.DWORD),
        ("dmReserved2", wintypes.DWORD),
        ("dmPanningWidth", wintypes.DWORD),
        ("dmPanningHeight", wintypes.DWORD),
    ]


def _ensure_process_dpi_aware() -> None:
    """プロセスを DPI 認識状態にする（設定済みなら無視される）。

    これを行わないと GetDpiForSystem が 96(=100%) を返し、実際の拡大率を取得できない。
    """
    try:
        # PER_MONITOR_AWARE_V2 = -4
        if ctypes.windll.user32.SetProcessDpiAwarenessContext(ctypes.c_void_p(-4)):
            return
    except Exception:
        pass
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(2)  # PER_MONITOR_AWARE
        return
    except Exception:
        pass
    try:
        ctypes.windll.user32.SetProcessDPIAware()
    except Exception:
        pass


def _physical_screen_size() -> tuple[int, int] | None:
    """EnumDisplaySettings で物理解像度を取得（DPI認識状態に依存しない）。"""
    try:
        dm = _DEVMODE()
        dm.dmSize = ctypes.sizeof(_DEVMODE)
        if ctypes.windll.user32.EnumDisplaySettingsW(
            None, _ENUM_CURRENT_SETTINGS, ctypes.byref(dm)
        ):
            return int(dm.dmPelsWidth), int(dm.dmPelsHeight)
    except Exception:
        pass
    return None


def detect_display_scale() -> float:
    """Windows の表示スケール（125%→1.25）を返す。取得失敗時は 1.0。"""
    _ensure_process_dpi_aware()
    # 認識状態を有効化した後は GetDpiForSystem が実DPIを返す
    try:
        dpi = ctypes.windll.user32.GetDpiForSystem()
        if dpi and dpi >= 96:
            return dpi / 96.0
    except Exception:
        pass
    # フォールバック: 物理解像度 / 論理解像度
    try:
        phys = _physical_screen_size()
        logi_w = ctypes.windll.user32.GetSystemMetrics(0)
        if phys and phys[0] and logi_w:
            ratio = phys[0] / logi_w
            if ratio > 0:
                return ratio
    except Exception:
        pass
    return 1.0


def design_window_size(logical_w: int, logical_h: int) -> tuple[int, int]:
    return int(logical_w * WINDOW_WIDTH_RATIO), int(logical_h * WINDOW_HEIGHT_RATIO)


def reference_work_area(zoom_ratio: float, ref_screen_width: int, ref_screen_height: int) -> tuple[int, int]:
    """zoom 倍率で割った論理サイズ (width, height) を返す。"""
    zoom = zoom_ratio if zoom_ratio > 0 else 1.0
    taskbar = int(ref_screen_height * WINDOW_TOP_OFFSET_RATIO)
    ref_w = ref_screen_width
    ref_h = ref_screen_height - taskbar
    return int(ref_w / zoom), int(ref_h / zoom)


def _system_scale() -> float:
    return detect_display_scale()


def logical_work_area() -> tuple[int, int, int, int] | None:
    """ctypes で作業領域（タスクバー除外）を論理ピクセルで返す。取得失敗時は None。"""
    try:
        user32 = ctypes.windll.user32
        rect = _RECT()
        if not user32.SystemParametersInfoW(_SPI_GETWORKAREA, 0, ctypes.byref(rect), 0):
            return None
        scale = _system_scale()
        return (
            int(rect.left / scale),
            int(rect.top / scale),
            int((rect.right - rect.left) / scale),
            int((rect.bottom - rect.top) / scale),
        )
    except Exception:
        return None


def get_display_info() -> dict[str, Any]:
    """フロントエンドへ渡す表示情報。bootstrap API から返す。"""
    from app.user_config import get_font_size_percent

    phys = _physical_screen_size()
    if phys:
        ref_screen_width, ref_screen_height = phys
    else:
        ref_screen_width, ref_screen_height = 1920, 1080
    zoom = detect_display_scale()
    logical_w, logical_h = reference_work_area(zoom, ref_screen_width, ref_screen_height)
    design_window_w, design_window_h = design_window_size(logical_w, logical_h)
    area = logical_work_area()
    if area:
        work_x, work_y, work_w, work_h = area
    else:
        work_x, work_y, work_w, work_h = 0, 0, logical_w, logical_h
    font_size_percent = get_font_size_percent()
    return {
        "ref_screen_width": ref_screen_width,
        "ref_screen_height": ref_screen_height,
        "zoom_ratio": zoom,
        "logical_width": logical_w,
        "logical_height": logical_h,
        "design_window_width": design_window_w,
        "design_window_height": design_window_h,
        "work_area_width": work_w,
        "work_area_height": work_h,
        "work_area_x": work_x,
        "work_area_y": work_y,
        "font_size_percent": font_size_percent,
        "font_size_ratio": font_size_percent / 100.0,
    }
