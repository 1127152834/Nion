from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from nion.config.paths import Paths

from .models import CliToolDescriptionRecord, CliToolStructuredDesc, CustomCliTool


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


class CliToolsRepository:
    def __init__(self, db_path: str | Path | None = None) -> None:
        paths = Paths()
        self._db_path = Path(db_path) if db_path is not None else paths.base_dir / "cli_tools.sqlite3"
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS cli_tools_custom (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    bin_path TEXT NOT NULL UNIQUE,
                    bin_name TEXT NOT NULL,
                    version TEXT,
                    install_method TEXT NOT NULL DEFAULT 'unknown',
                    install_package TEXT NOT NULL DEFAULT '',
                    enabled INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS cli_tool_descriptions (
                    tool_id TEXT PRIMARY KEY,
                    description_zh TEXT NOT NULL,
                    description_en TEXT NOT NULL,
                    structured_json TEXT NOT NULL DEFAULT '',
                    updated_at TEXT NOT NULL
                );
                """
            )

    def list_custom_tools(self, *, enabled_only: bool = True) -> list[CustomCliTool]:
        query = "SELECT * FROM cli_tools_custom"
        if enabled_only:
            query += " WHERE enabled = 1"
        query += " ORDER BY created_at DESC"
        with self._connect() as conn:
            rows = conn.execute(query).fetchall()
        return [self._row_to_custom_tool(row) for row in rows]

    def get_custom_tool(self, tool_id: str) -> CustomCliTool | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM cli_tools_custom WHERE id = ?",
                (tool_id,),
            ).fetchone()
        return self._row_to_custom_tool(row) if row is not None else None

    def upsert_custom_tool(
        self,
        *,
        name: str,
        bin_path: str,
        bin_name: str,
        version: str | None = None,
        install_method: str = "unknown",
        install_package: str = "",
    ) -> CustomCliTool:
        now = _now_iso()
        with self._connect() as conn:
            existing = conn.execute(
                "SELECT id FROM cli_tools_custom WHERE bin_path = ?",
                (bin_path,),
            ).fetchone()
            if existing is not None:
                conn.execute(
                    """
                    UPDATE cli_tools_custom
                    SET name = ?,
                        version = ?,
                        install_method = CASE WHEN ? != 'unknown' THEN ? ELSE install_method END,
                        install_package = CASE WHEN ? != '' THEN ? ELSE install_package END,
                        enabled = 1,
                        updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        name,
                        version,
                        install_method,
                        install_method,
                        install_package,
                        install_package,
                        now,
                        str(existing["id"]),
                    ),
                )
                conn.commit()
                return self.get_custom_tool(str(existing["id"]))  # type: ignore[return-value]

            base_id = f"custom-{bin_name}"
            tool_id = base_id
            counter = 2
            while conn.execute(
                "SELECT 1 FROM cli_tools_custom WHERE id = ?",
                (tool_id,),
            ).fetchone():
                tool_id = f"{base_id}-{counter}"
                counter += 1

            conn.execute(
                """
                INSERT INTO cli_tools_custom (
                    id,
                    name,
                    bin_path,
                    bin_name,
                    version,
                    install_method,
                    install_package,
                    enabled,
                    created_at,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                """,
                (
                    tool_id,
                    name,
                    bin_path,
                    bin_name,
                    version,
                    install_method,
                    install_package,
                    now,
                    now,
                ),
            )
            conn.commit()
        return self.get_custom_tool(tool_id)  # type: ignore[return-value]

    def delete_custom_tool(self, tool_id: str) -> bool:
        with self._connect() as conn:
            result = conn.execute(
                "DELETE FROM cli_tools_custom WHERE id = ?",
                (tool_id,),
            )
            conn.commit()
        return result.rowcount > 0

    def list_descriptions(self) -> dict[str, CliToolDescriptionRecord]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT tool_id, description_zh, description_en, structured_json
                FROM cli_tool_descriptions
                """
            ).fetchall()
        result: dict[str, CliToolDescriptionRecord] = {}
        for row in rows:
            structured = None
            raw_structured = str(row["structured_json"] or "").strip()
            if raw_structured:
                try:
                    structured = CliToolStructuredDesc.model_validate(
                        json.loads(raw_structured)
                    )
                except Exception:
                    structured = None
            result[str(row["tool_id"])] = CliToolDescriptionRecord(
                zh=str(row["description_zh"]),
                en=str(row["description_en"]),
                structured=structured,
            )
        return result

    def upsert_description(
        self,
        *,
        tool_id: str,
        zh: str,
        en: str,
        structured_json: str = "",
    ) -> None:
        now = _now_iso()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO cli_tool_descriptions (
                    tool_id,
                    description_zh,
                    description_en,
                    structured_json,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(tool_id) DO UPDATE SET
                    description_zh = excluded.description_zh,
                    description_en = excluded.description_en,
                    structured_json = excluded.structured_json,
                    updated_at = excluded.updated_at
                """,
                (tool_id, zh, en, structured_json, now),
            )
            conn.commit()

    def bulk_upsert_descriptions(
        self,
        entries: list[tuple[str, str, str]],
    ) -> None:
        if not entries:
            return
        now = _now_iso()
        with self._connect() as conn:
            conn.executemany(
                """
                INSERT INTO cli_tool_descriptions (
                    tool_id,
                    description_zh,
                    description_en,
                    updated_at
                ) VALUES (?, ?, ?, ?)
                ON CONFLICT(tool_id) DO UPDATE SET
                    description_zh = excluded.description_zh,
                    description_en = excluded.description_en,
                    updated_at = excluded.updated_at
                """,
                [(tool_id, zh, en, now) for tool_id, zh, en in entries],
            )
            conn.commit()

    @staticmethod
    def _row_to_custom_tool(row: sqlite3.Row) -> CustomCliTool:
        return CustomCliTool(
            id=str(row["id"]),
            name=str(row["name"]),
            binPath=str(row["bin_path"]),
            binName=str(row["bin_name"]),
            version=str(row["version"]) if row["version"] is not None else None,
            installMethod=str(row["install_method"] or "unknown"),
            installPackage=str(row["install_package"] or ""),
            enabled=bool(row["enabled"]),
            createdAt=str(row["created_at"]),
            updatedAt=str(row["updated_at"]),
        )

