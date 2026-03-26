"""SQLite storage helpers for channel control-plane data."""

from __future__ import annotations

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from nion.config.paths import get_paths


def get_channels_db_path() -> Path:
    path = get_paths().base_dir / "channels" / "channels.db"
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


SCHEMA_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS channel_configs (
      platform TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 0,
      mode TEXT NOT NULL DEFAULT 'webhook',
      credentials_json TEXT NOT NULL DEFAULT '{}',
      default_workspace_id TEXT,
      session_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS pairing_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      consumed_at TEXT,
      created_at TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS pair_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      code TEXT NOT NULL,
      external_user_id TEXT NOT NULL,
      external_user_name TEXT,
      chat_id TEXT NOT NULL,
      conversation_type TEXT,
      source_event_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      note TEXT,
      created_at TEXT NOT NULL,
      handled_at TEXT,
      handled_by TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS authorized_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      external_user_id TEXT NOT NULL,
      external_user_name TEXT,
      chat_id TEXT,
      conversation_type TEXT,
      workspace_id TEXT,
      session_override_json TEXT,
      granted_at TEXT NOT NULL,
      revoked_at TEXT,
      source_request_id INTEGER
    )
    """,
]


class ChannelDatabase:
    def __init__(self, path: str | Path | None = None):
        self.path = Path(path).resolve() if path is not None else get_channels_db_path()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        return connection

    def _init_schema(self) -> None:
        with self.connect() as conn:
            for statement in SCHEMA_STATEMENTS:
                conn.execute(statement)

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        conn = self._connect()
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()
