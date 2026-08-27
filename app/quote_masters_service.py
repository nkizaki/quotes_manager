"""見積り管理・共通マスタ（営業 / 客先 / RM / 表面処理 / 比重 / 機械チャージ）の CRUD API。"""
from __future__ import annotations

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from app.database import get_connection


def _json_safe_cell(v):
    if v is None:
        return None
    if isinstance(v, (str, int, float, bool)):
        return v
    if isinstance(v, Decimal):
        try:
            return float(v)
        except Exception:
            return str(v)
    return str(v)


def _row_to_dict(row, col_names):
    return {col_names[i]: _json_safe_cell(row[i]) for i in range(len(col_names))}


def _list_query(sql):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(sql)
        rows = cur.fetchall()
        col_names = [c[0] for c in cur.description]
        conn.close()
        out_rows = [_row_to_dict(r, col_names) for r in rows]
        return {"rows": out_rows, "columns": col_names}
    except Exception as e:
        return {"error": str(e)}


def _str_or_none(raw):
    if raw is None:
        return None
    s = str(raw).strip()
    return s if s != "" else None


def _parse_optional_int(raw, label="数値"):
    if raw is None:
        return None
    s = str(raw).strip().replace(",", "")
    if s == "":
        return None
    try:
        d = Decimal(s)
        if d != d.to_integral_value(rounding=ROUND_HALF_UP):
            raise ValueError(f"{label}は整数で入力してください: " + str(raw))
        return int(d)
    except (InvalidOperation, ValueError):
        raise ValueError(f"{label}を整数にできません: " + str(raw))


def _parse_optional_decimal(raw, label="数値"):
    if raw is None:
        return None
    s = str(raw).strip().replace(",", "")
    if s == "":
        return None
    try:
        return float(Decimal(s))
    except (InvalidOperation, ValueError):
        raise ValueError(f"{label}を数値にできません: " + str(raw))


def _key_empty(raw):
    return raw is None or str(raw).strip() == ""


def _next_numeric_code(cur, table_jp, code_col_jp, width=None):
    """数値として解釈できる既存コードの最大+1。width 指定時はゼロ埋め。"""
    cur.execute(f"SELECT [{code_col_jp}] FROM {table_jp}")
    max_n = 0
    for row in cur.fetchall():
        s = str(row[0]).strip() if row and row[0] is not None else ""
        if s.isdigit():
            max_n = max(max_n, int(s))
    n = max_n + 1
    if width is not None:
        return str(n).zfill(width)
    return str(n)


# ----- 営業マスタ -----

def api_sales_master_list(payload=None):
    return _list_query("SELECT * FROM t_営業マスタ ORDER BY コード ASC")


def api_sales_master_save(payload=None):
    """コード空なら採番して INSERT、既存コードなら UPDATE。"""
    data = payload or {}
    code = _str_or_none(data.get("コード"))
    sales = _str_or_none(data.get("営業担当"))
    flag = _str_or_none(data.get("表示フラグ"))
    try:
        conn = get_connection()
        cur = conn.cursor()
        if not code:
            code = _next_numeric_code(cur, "t_営業マスタ", "コード", width=2)
            cur.execute(
                "INSERT INTO t_営業マスタ ([コード], [営業担当], [表示フラグ]) VALUES (?, ?, ?)",
                (code, sales, flag),
            )
            conn.commit()
            conn.close()
            return {"ok": True, "id": code, "inserted": True}
        cur.execute("SELECT 1 FROM t_営業マスタ WHERE コード=?", (code,))
        exists = cur.fetchone() is not None
        if exists:
            cur.execute(
                "UPDATE t_営業マスタ SET [営業担当]=?, [表示フラグ]=? WHERE コード=?",
                (sales, flag, code),
            )
            if cur.rowcount == 0:
                conn.close()
                return {"error": "該当コードの行がありません"}
            conn.commit()
            conn.close()
            return {"ok": True, "id": code, "inserted": False}
        cur.execute(
            "INSERT INTO t_営業マスタ ([コード], [営業担当], [表示フラグ]) VALUES (?, ?, ?)",
            (code, sales, flag),
        )
        conn.commit()
        conn.close()
        return {"ok": True, "id": code, "inserted": True}
    except Exception as e:
        return {"error": str(e)}


def api_sales_master_delete(payload=None):
    data = payload or {}
    code = _str_or_none(data.get("コード"))
    if not code:
        return {"error": "コードが必要です"}
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM t_営業マスタ WHERE コード=?", (code,))
        if cur.rowcount == 0:
            conn.close()
            return {"error": "該当コードの行がありません"}
        conn.commit()
        conn.close()
        return {"ok": True}
    except Exception as e:
        return {"error": str(e)}


# ----- 客先マスタ -----

def api_customer_master_list(payload=None):
    return _list_query("SELECT * FROM t_客先マスタ ORDER BY コード ASC")


def api_customer_master_save(payload=None):
    """コード空なら採番して INSERT、既存コードなら UPDATE。"""
    data = payload or {}
    code = _str_or_none(data.get("コード"))
    name = _str_or_none(data.get("客先名"))
    official = _str_or_none(data.get("正式名称"))
    kana = _str_or_none(data.get("かな"))
    flag = _str_or_none(data.get("表示フラグ"))
    try:
        conn = get_connection()
        cur = conn.cursor()
        if not code:
            code = _next_numeric_code(cur, "t_客先マスタ", "コード", width=None)
            if len(code) > 3:
                conn.close()
                return {"error": "採番したコードが桁数上限(3)を超えます"}
            cur.execute(
                "INSERT INTO t_客先マスタ ([コード], [客先名], [正式名称], [かな], [表示フラグ]) VALUES (?, ?, ?, ?, ?)",
                (code, name, official, kana, flag),
            )
            conn.commit()
            conn.close()
            return {"ok": True, "id": code, "inserted": True}
        cur.execute("SELECT 1 FROM t_客先マスタ WHERE コード=?", (code,))
        exists = cur.fetchone() is not None
        if exists:
            cur.execute(
                "UPDATE t_客先マスタ SET [客先名]=?, [正式名称]=?, [かな]=?, [表示フラグ]=? WHERE コード=?",
                (name, official, kana, flag, code),
            )
            if cur.rowcount == 0:
                conn.close()
                return {"error": "該当コードの行がありません"}
            conn.commit()
            conn.close()
            return {"ok": True, "id": code, "inserted": False}
        cur.execute(
            "INSERT INTO t_客先マスタ ([コード], [客先名], [正式名称], [かな], [表示フラグ]) VALUES (?, ?, ?, ?, ?)",
            (code, name, official, kana, flag),
        )
        conn.commit()
        conn.close()
        return {"ok": True, "id": code, "inserted": True}
    except Exception as e:
        return {"error": str(e)}


def api_customer_master_delete(payload=None):
    data = payload or {}
    code = _str_or_none(data.get("コード"))
    if not code:
        return {"error": "コードが必要です"}
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM t_客先マスタ WHERE コード=?", (code,))
        if cur.rowcount == 0:
            conn.close()
            return {"error": "該当コードの行がありません"}
        conn.commit()
        conn.close()
        return {"ok": True}
    except Exception as e:
        return {"error": str(e)}


# ----- RMマスタ（ID=rm_id） -----

def api_rm_master_list(payload=None):
    # rm_id は COLUMN_NAME_MAP の ID→id と衝突するため英語列名で ORDER
    return _list_query("SELECT * FROM t_RMマスタ ORDER BY rm_id ASC")


def api_rm_master_save(payload=None):
    """1件固定。一般・不二工機のみ UPDATE（追加なし）。"""
    data = payload or {}
    try:
        general = _parse_optional_int(data.get("一般"), "一般")
        fuji = _parse_optional_int(data.get("不二工機"), "不二工機")
    except ValueError as ex:
        return {"error": str(ex)}
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT rm_id FROM t_RMマスタ ORDER BY rm_id ASC")
        rows = cur.fetchall()
        if not rows:
            conn.close()
            return {"error": "RMマスタにデータがありません"}
        if len(rows) > 1:
            # 想定外だが、指定IDがあればその行、なければ先頭のみ更新
            rid = _str_or_none(data.get("ID")) or rows[0][0]
        else:
            rid = rows[0][0]
        cur.execute(
            "UPDATE t_RMマスタ SET [一般]=?, [不二工機]=? WHERE rm_id=?",
            (general, fuji, rid),
        )
        if cur.rowcount == 0:
            conn.close()
            return {"error": "更新対象の行がありません"}
        conn.commit()
        conn.close()
        return {"ok": True, "id": rid, "inserted": False}
    except Exception as e:
        return {"error": str(e)}


def api_rm_master_delete(payload=None):
    return {"error": "RMマスタは削除できません"}


# ----- 表面処理マスタ（ID=BIGSERIAL） -----

def api_surface_master_list(payload=None):
    return _list_query("SELECT * FROM t_表面処理マスタ ORDER BY ID ASC")


def api_surface_master_save(payload=None):
    data = payload or {}
    rid = data.get("ID")
    name = _str_or_none(data.get("表面処理名"))
    sort_order = _str_or_none(data.get("並び順"))
    is_insert = _key_empty(rid)
    try:
        conn = get_connection()
        cur = conn.cursor()
        if is_insert:
            cur.execute(
                "INSERT INTO t_表面処理マスタ ([表面処理名], [並び順]) VALUES (?, ?)",
                (name, sort_order),
            )
            conn.commit()
            cur.execute("SELECT MAX(ID) FROM t_表面処理マスタ")
            mx = cur.fetchone()
            new_id = mx[0] if mx else None
            conn.close()
            if new_id is None:
                return {"error": "登録後のIDを取得できませんでした"}
            return {"ok": True, "id": new_id, "inserted": True}
        try:
            rid_param = int(str(rid).strip())
        except ValueError:
            rid_param = str(rid).strip()
        cur.execute(
            "UPDATE t_表面処理マスタ SET [表面処理名]=?, [並び順]=? WHERE ID=?",
            (name, sort_order, rid_param),
        )
        if cur.rowcount == 0:
            conn.close()
            return {"error": "該当IDの行がありません"}
        conn.commit()
        conn.close()
        return {"ok": True, "id": rid_param, "inserted": False}
    except Exception as e:
        return {"error": str(e)}


def api_surface_master_delete(payload=None):
    data = payload or {}
    rid = data.get("ID")
    if _key_empty(rid):
        return {"error": "IDが必要です"}
    try:
        rid_param = int(str(rid).strip())
    except ValueError:
        rid_param = str(rid).strip()
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM t_表面処理マスタ WHERE ID=?", (rid_param,))
        if cur.rowcount == 0:
            conn.close()
            return {"error": "該当IDの行がありません"}
        conn.commit()
        conn.close()
        return {"ok": True}
    except Exception as e:
        return {"error": str(e)}


# ----- 比重マスタ（ID=BIGSERIAL） -----

def api_gravity_master_list(payload=None):
    return _list_query("SELECT * FROM t_比重マスタ ORDER BY ID ASC")


def api_gravity_master_save(payload=None):
    data = payload or {}
    rid = data.get("ID")
    name = _str_or_none(data.get("名称"))
    try:
        gravity = _parse_optional_decimal(data.get("比重"), "比重")
    except ValueError as ex:
        return {"error": str(ex)}
    is_insert = _key_empty(rid)
    try:
        conn = get_connection()
        cur = conn.cursor()
        if is_insert:
            cur.execute(
                "INSERT INTO t_比重マスタ ([名称], [比重]) VALUES (?, ?)",
                (name, gravity),
            )
            conn.commit()
            cur.execute("SELECT MAX(ID) FROM t_比重マスタ")
            mx = cur.fetchone()
            new_id = mx[0] if mx else None
            conn.close()
            if new_id is None:
                return {"error": "登録後のIDを取得できませんでした"}
            return {"ok": True, "id": new_id, "inserted": True}
        try:
            rid_param = int(str(rid).strip())
        except ValueError:
            rid_param = str(rid).strip()
        cur.execute(
            "UPDATE t_比重マスタ SET [名称]=?, [比重]=? WHERE ID=?",
            (name, gravity, rid_param),
        )
        if cur.rowcount == 0:
            conn.close()
            return {"error": "該当IDの行がありません"}
        conn.commit()
        conn.close()
        return {"ok": True, "id": rid_param, "inserted": False}
    except Exception as e:
        return {"error": str(e)}


def api_gravity_master_delete(payload=None):
    data = payload or {}
    rid = data.get("ID")
    if _key_empty(rid):
        return {"error": "IDが必要です"}
    try:
        rid_param = int(str(rid).strip())
    except ValueError:
        rid_param = str(rid).strip()
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM t_比重マスタ WHERE ID=?", (rid_param,))
        if cur.rowcount == 0:
            conn.close()
            return {"error": "該当IDの行がありません"}
        conn.commit()
        conn.close()
        return {"ok": True}
    except Exception as e:
        return {"error": str(e)}


# ----- 機械チャージ（ID=INTEGER、空なら MAX+1） -----

def api_machine_charge_master_list(payload=None):
    return _list_query("SELECT * FROM t_機械チャージ ORDER BY ID ASC")


def api_machine_charge_master_save(payload=None):
    data = payload or {}
    rid = data.get("ID")
    model = _str_or_none(data.get("機種"))
    try:
        cmin = _parse_optional_int(data.get("チャージMin"), "チャージMin")
        cmax = _parse_optional_int(data.get("チャージMax"), "チャージMax")
    except ValueError as ex:
        return {"error": str(ex)}
    is_insert = _key_empty(rid)
    try:
        conn = get_connection()
        cur = conn.cursor()
        if is_insert:
            cur.execute("SELECT MAX(ID) FROM t_機械チャージ")
            mx = cur.fetchone()
            new_id = int(mx[0] or 0) + 1
            cur.execute(
                "INSERT INTO t_機械チャージ ([ID], [機種], [チャージMin], [チャージMax]) VALUES (?, ?, ?, ?)",
                (new_id, model, cmin, cmax),
            )
            conn.commit()
            conn.close()
            return {"ok": True, "id": new_id, "inserted": True}
        try:
            rid_param = int(str(rid).strip())
        except ValueError:
            return {"error": "IDは整数で入力してください"}
        cur.execute(
            "UPDATE t_機械チャージ SET [機種]=?, [チャージMin]=?, [チャージMax]=? WHERE ID=?",
            (model, cmin, cmax, rid_param),
        )
        if cur.rowcount == 0:
            conn.close()
            return {"error": "該当IDの行がありません"}
        conn.commit()
        conn.close()
        return {"ok": True, "id": rid_param, "inserted": False}
    except Exception as e:
        return {"error": str(e)}


def api_machine_charge_master_delete(payload=None):
    data = payload or {}
    rid = data.get("ID")
    if _key_empty(rid):
        return {"error": "IDが必要です"}
    try:
        rid_param = int(str(rid).strip())
    except ValueError:
        rid_param = str(rid).strip()
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM t_機械チャージ WHERE ID=?", (rid_param,))
        if cur.rowcount == 0:
            conn.close()
            return {"error": "該当IDの行がありません"}
        conn.commit()
        conn.close()
        return {"ok": True}
    except Exception as e:
        return {"error": str(e)}
