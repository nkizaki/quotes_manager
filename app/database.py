"""PostgreSQL 接続（quotes_manager_db）。"""
from __future__ import annotations

from contextlib import contextmanager

import psycopg2

import loadenv
from app.pg_map import pg_sql, translate_col_name


def postgres_connect_params(database: str | None = None) -> dict:
    return {
        "host": loadenv.POSTGRES_HOST,
        "port": loadenv.POSTGRES_PORT,
        "user": loadenv.POSTGRES_USER,
        "password": loadenv.POSTGRES_PASSWORD,
        "dbname": database or loadenv.QUOTES_MANAGER_DB,
    }


def connect_postgres(database: str | None = None):
    conn = psycopg2.connect(**postgres_connect_params(database))
    schema = getattr(loadenv, "POSTGRES_SCHEMA", "public") or "public"
    with conn.cursor() as cur:
        cur.execute("SET search_path TO %s, public", (schema,))
    return conn


class CompatCursor:
    """Access 時代の日本語 SQL / `?` プレースホルダを PostgreSQL 向けに変換する。"""

    def __init__(self, cur):
        self._cur = cur
        self.description = None
        self.rowcount = -1

    def execute(self, sql, params=None):
        rewritten = pg_sql(sql)
        if params is None:
            self._cur.execute(rewritten)
        else:
            if isinstance(params, list):
                params = tuple(params)
            self._cur.execute(rewritten, params)
        self.rowcount = self._cur.rowcount
        if self._cur.description:
            self.description = [(translate_col_name(c.name),) for c in self._cur.description]
        else:
            self.description = None
        return self

    def fetchone(self):
        return self._cur.fetchone()

    def fetchall(self):
        return self._cur.fetchall()


class CompatConnection:
    def __init__(self, conn):
        self._conn = conn

    def cursor(self):
        return CompatCursor(self._conn.cursor())

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()


def get_connection():
    return CompatConnection(connect_postgres())


@contextmanager
def connect():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()
