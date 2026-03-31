from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from nion.config.paths import Paths
from nion.self_maintenance.models import (
    ReflectiveEntry,
    ReflectiveLog,
    ReflectiveRunState,
)


class SelfMaintenanceStore:
    def __init__(self, *, base_dir: str | Path | None = None) -> None:
        self._paths = Paths(base_dir=base_dir)
        self._paths.ensure_self_maintenance_dirs()
        self._db_path = self._paths.telemetry_db_file
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS self_maintenance_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    trigger TEXT NOT NULL,
                    status TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    started_at TEXT NOT NULL DEFAULT '',
                    completed_at TEXT,
                    memory_update_proposals_json TEXT NOT NULL DEFAULT '[]',
                    prune_proposals_json TEXT NOT NULL DEFAULT '[]',
                    action_proposals_json TEXT NOT NULL DEFAULT '[]',
                    self_upgrade_proposals_json TEXT NOT NULL DEFAULT '[]',
                    sources_json TEXT NOT NULL DEFAULT '[]',
                    entry_path TEXT
                )
                """
            )

    def load_state(self) -> ReflectiveRunState:
        if not self._paths.self_maintenance_state_file.exists():
            return ReflectiveRunState()
        return ReflectiveRunState.model_validate_json(
            self._paths.self_maintenance_state_file.read_text(encoding="utf-8")
        )

    def save_state(self, state: ReflectiveRunState) -> None:
        self._paths.self_maintenance_state_file.write_text(
            state.model_dump_json(indent=2),
            encoding="utf-8",
        )

    def write_entry(self, entry: ReflectiveEntry) -> Path:
        dated_dir = self._entry_dir(entry.started_at)
        dated_dir.mkdir(parents=True, exist_ok=True)
        path = dated_dir / f"{entry.run_id}.md"
        path.write_text(self._render_entry(entry), encoding="utf-8")
        return path

    def append_log(
        self,
        *,
        trigger: str,
        status: str,
        summary: str,
        started_at: str = "",
        completed_at: str | None = None,
        memory_update_proposals: list[str] | None = None,
        prune_proposals: list[str] | None = None,
        action_proposals: list[str] | None = None,
        self_upgrade_proposals: list[str] | None = None,
        sources: list[str] | None = None,
        entry_path: str | None = None,
    ) -> ReflectiveLog:
        log = ReflectiveLog(
            trigger=trigger,
            status=status,
            summary=summary,
            started_at=started_at,
            completed_at=completed_at,
            memory_update_proposals=memory_update_proposals or [],
            prune_proposals=prune_proposals or [],
            action_proposals=action_proposals or [],
            self_upgrade_proposals=self_upgrade_proposals or [],
            sources=sources or [],
            entry_path=entry_path,
        )
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO self_maintenance_logs (
                    trigger,
                    status,
                    summary,
                    started_at,
                    completed_at,
                    memory_update_proposals_json,
                    prune_proposals_json,
                    action_proposals_json,
                    self_upgrade_proposals_json,
                    sources_json,
                    entry_path
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    log.trigger,
                    log.status,
                    log.summary,
                    log.started_at,
                    log.completed_at,
                    json.dumps(log.memory_update_proposals, ensure_ascii=False),
                    json.dumps(log.prune_proposals, ensure_ascii=False),
                    json.dumps(log.action_proposals, ensure_ascii=False),
                    json.dumps(log.self_upgrade_proposals, ensure_ascii=False),
                    json.dumps(log.sources, ensure_ascii=False),
                    log.entry_path,
                ),
            )
        return log

    def list_logs(self, *, limit: int, offset: int) -> list[ReflectiveLog]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT
                    trigger,
                    status,
                    summary,
                    started_at,
                    completed_at,
                    memory_update_proposals_json,
                    prune_proposals_json,
                    action_proposals_json,
                    self_upgrade_proposals_json,
                    sources_json,
                    entry_path
                FROM self_maintenance_logs
                ORDER BY id DESC
                LIMIT ? OFFSET ?
                """,
                (limit, offset),
            ).fetchall()
        return [
            ReflectiveLog(
                trigger=row["trigger"],
                status=row["status"],
                summary=row["summary"],
                started_at=row["started_at"],
                completed_at=row["completed_at"],
                memory_update_proposals=json.loads(
                    row["memory_update_proposals_json"]
                ),
                prune_proposals=json.loads(row["prune_proposals_json"]),
                action_proposals=json.loads(row["action_proposals_json"]),
                self_upgrade_proposals=json.loads(
                    row["self_upgrade_proposals_json"]
                ),
                sources=json.loads(row["sources_json"]),
                entry_path=row["entry_path"],
            )
            for row in rows
        ]

    def delete_logs(self) -> None:
        with self._connect() as connection:
            connection.execute("DELETE FROM self_maintenance_logs")

    def _entry_dir(self, started_at: str) -> Path:
        date = (started_at or "1970-01-01")[:10]
        year, month, _day = date.split("-")
        return self._paths.self_maintenance_journal_dir / year / month

    def _render_entry(self, entry: ReflectiveEntry) -> str:
        return "\n".join(
            [
                f"# Reflective Maintenance: {entry.ended_at[:10]}",
                "",
                "## Summary",
                entry.summary,
                "",
                "## What I Did",
                *[f"- {item}" for item in entry.what_i_did],
                "",
                "## What I Learned",
                *[f"- {item}" for item in entry.what_i_learned],
                "",
                "## Stale Items",
                *[f"- {item}" for item in entry.stale_items],
                "",
                "## Proposed Memory Updates",
                *[f"- {item}" for item in entry.memory_update_proposals],
                "",
                "## Proposed Pruning",
                *[f"- {item}" for item in entry.prune_proposals],
                "",
                "## Proposed Actions",
                *[f"- {item}" for item in entry.action_proposals],
                "",
                "## Proposed Self-Upgrades",
                *[f"- {item}" for item in entry.self_upgrade_proposals],
                "",
                "## Sources",
                *[f"- {item}" for item in entry.sources],
                "",
            ]
        )
