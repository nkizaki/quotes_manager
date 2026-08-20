"""Access 日本語 SQL を PostgreSQL 英語識別子へ変換する。"""
from __future__ import annotations

import re

from app.name_maps import COLUMN_NAME_MAP, TABLE_NAME_MAP

_TABLES_BY_LEN = tuple(sorted(TABLE_NAME_MAP.items(), key=lambda x: -len(x[0])))
_COLUMNS_BY_LEN = tuple(sorted(COLUMN_NAME_MAP.items(), key=lambda x: -len(x[0])))

# 英語カラム名 → 画面/既存ロジックが使う日本語名
# 衝突があるキーは本アプリで実際に使う日本語側を優先する
_PG_TO_JP: dict[str, str] = {}
for jp, pg in COLUMN_NAME_MAP.items():
    if pg not in _PG_TO_JP:
        _PG_TO_JP[pg] = jp
_PG_TO_JP["region_name"] = "地方名"
_PG_TO_JP["equipment_name"] = "設備名等"
_PG_TO_JP["code"] = "コード"
_PG_TO_JP["id"] = "ID"
_PG_TO_JP["2"] = "表面処理費2"
_PG_TO_JP["cost_quote_id"] = "原価見積りID"
_PG_TO_JP["lot_id"] = "ロットID"
_PG_TO_JP["quote_id"] = "見積りID"
_PG_TO_JP["rm_id"] = "ID"


def quote_ident(name: str) -> str:
    if not name:
        return name
    if name[0].isdigit() or not name.isidentifier() or name != name.lower():
        return '"' + name.replace('"', '""') + '"'
    return name


def translate_col_name(pg_name: str) -> str:
    if not pg_name:
        return pg_name
    key = pg_name.rsplit(".", 1)[-1]
    if key.startswith("[") and key.endswith("]"):
        key = key[1:-1]
    return _PG_TO_JP.get(key, pg_name)


_LITERAL_RE = re.compile(r"('(?:''|[^'])*')")


def _rewrite_code(sql: str) -> str:
    text = sql
    for jp, en in _TABLES_BY_LEN:
        text = text.replace(jp, en)

    def _bracket(match: re.Match[str]) -> str:
        jp = match.group(1)
        return quote_ident(COLUMN_NAME_MAP.get(jp, jp))

    text = re.sub(r"\[([^\]]+)\]", _bracket, text)
    for jp, en in _COLUMNS_BY_LEN:
        ident = quote_ident(en)
        if jp.isascii():
            text = re.sub(rf"\b{re.escape(jp)}\b", ident, text)
        else:
            text = text.replace(jp, ident)
    text = text.replace("?", "%s")
    return text


def pg_sql(sql: str) -> str:
    parts = _LITERAL_RE.split(sql)
    out: list[str] = []
    for i, part in enumerate(parts):
        if i % 2 == 1:
            out.append(part)
        else:
            out.append(_rewrite_code(part))
    return "".join(out)
