"""config.env を読み込み、アプリから参照する設定値を公開する。"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from urllib.parse import quote_plus


def _project_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def _bundled_config_env_path() -> Path | None:
    if not getattr(sys, "frozen", False):
        return None
    meipass = getattr(sys, "_MEIPASS", "")
    if not meipass:
        return None
    bundled = Path(meipass) / "config.env"
    return bundled if bundled.is_file() else None


def _config_env_path() -> Path:
    override = os.environ.get("QUOTES_MANAGER_CONFIG_ENV", "").strip()
    if override:
        return Path(override)
    local = _project_root() / "config.env"
    if local.is_file():
        return local
    bundled = _bundled_config_env_path()
    if bundled is not None:
        return bundled
    return local


def _parse_env_file(path: Path) -> dict[str, str]:
    if not path.is_file():
        raise FileNotFoundError(
            f"設定ファイルが見つかりません: {path}\n"
            "config.env.example を config.env にコピーして編集してください。"
        )
    values: dict[str, str] = {}
    with path.open(encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            key, sep, value = line.partition("=")
            if not sep:
                continue
            key = key.strip()
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            values[key] = value
    return values


def _as_bool(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _require(env: dict[str, str], key: str) -> str:
    value = env.get(key, "").strip()
    if not value:
        raise ValueError(f"config.env に {key} が設定されていません。")
    return value


_env = _parse_env_file(_config_env_path())

devflg = _as_bool(_env.get("DEVFLG", "false"))
version = _env.get("VERSION", "1.0.0").strip() or "1.0.0"

POSTGRES_HOST = _require(_env, "POSTGRES_HOST")
POSTGRES_PORT = int(_env.get("POSTGRES_PORT", "5432").strip() or "5432")
POSTGRES_USER = _require(_env, "POSTGRES_USER")
POSTGRES_PASSWORD = _require(_env, "POSTGRES_PASSWORD")
POSTGRES_SCHEMA = _env.get("POSTGRES_SCHEMA", "public").strip() or "public"
QUOTES_MANAGER_DB = _env.get("QUOTES_MANAGER_DB", "quotes_manager_db").strip() or "quotes_manager_db"

POSTGRES_CONNECTION_URL = (
    _env.get("POSTGRES_CONNECTION_URL", "").strip() or _env.get("DATABASE_URL", "").strip() or ""
)
if not POSTGRES_CONNECTION_URL:
    user = quote_plus(POSTGRES_USER)
    password = quote_plus(POSTGRES_PASSWORD)
    POSTGRES_CONNECTION_URL = (
        f"postgresql://{user}:{password}@{POSTGRES_HOST}:{POSTGRES_PORT}/{QUOTES_MANAGER_DB}"
    )


def postgres_display() -> str:
    return f"PostgreSQL {POSTGRES_HOST}:{POSTGRES_PORT}/{QUOTES_MANAGER_DB}"
