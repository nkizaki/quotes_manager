"""xlwings による Excel テンプレート書き込み共通処理。"""
from __future__ import annotations

import os
import shutil
import tempfile
from typing import Callable


def sheet_names(wb) -> list[str]:
    return [s.name for s in wb.sheets]


def set_value(ws, addr, value) -> None:
    """
    セルへ値を設定。addr は 'A1' または (row, col)（1始まり）。
    '=' で始まる文字列は数式として設定する。
    """
    rng = ws.range(addr)
    if isinstance(value, str) and value.startswith("="):
        rng.formula = value
    else:
        rng.value = value


def set_number_format(rng, number_format: str) -> None:
    """NumberFormat 設定。結合セル等で失敗しても握りつぶす。"""
    try:
        rng.number_format = number_format
    except Exception:
        try:
            rng[0, 0].number_format = number_format
        except Exception:
            pass


def set_number(ws, addr, value, number_format: str | None = None) -> None:
    rng = ws.range(addr)
    rng.value = value
    if number_format is not None:
        set_number_format(rng, number_format)


def export_bytes_from_template(
    template_path: str,
    fill_workbook: Callable,
    *,
    activate_sheet: str | None = None,
    activate_cell: str = "A1",
) -> bytes:
    """
    テンプレートを一時コピーして xlwings で開き、fill_workbook(wb) で書き込み後、
    バイト列を返す。Excel プロセスは必ず終了する。
    """
    try:
        import xlwings as xw
    except ImportError as exc:
        raise RuntimeError(
            "xlwings がインストールされていません。pip install xlwings を実行してください。"
        ) from exc

    if not os.path.exists(template_path):
        raise FileNotFoundError(f"テンプレートが見つかりません: {template_path}")

    tmp_path = None
    app = None
    wb = None
    try:
        fd, tmp_path = tempfile.mkstemp(suffix=".xlsx")
        os.close(fd)
        shutil.copy2(template_path, tmp_path)

        app = xw.App(visible=False, add_book=False)
        app.display_alerts = False
        try:
            app.screen_updating = False
        except Exception:
            pass

        wb = app.books.open(tmp_path)
        fill_workbook(wb)

        if activate_sheet:
            try:
                ws = wb.sheets[activate_sheet]
                ws.activate()
                ws.range(activate_cell).select()
            except Exception:
                pass

        wb.save()
        wb.close()
        wb = None

        with open(tmp_path, "rb") as f:
            return f.read()
    finally:
        if wb is not None:
            try:
                wb.close()
            except Exception:
                pass
        if app is not None:
            try:
                app.quit()
            except Exception:
                pass
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass
