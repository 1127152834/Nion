from __future__ import annotations

import json
import sqlite3
from dataclasses import asdict, replace
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from nion.config.paths import Paths, get_paths

from .models import (
    BridgeCandidateRecord,
    CandidateActionEvent,
    NotebookReferenceLink,
    ProjectReferenceLink,
)


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


class ObjectBridgeRepository:
    def __init__(self, base_dir: str | Path | None = None):
        self._paths = Paths(base_dir=base_dir) if base_dir is not None else get_paths()
        self._db_path = self._paths.base_dir / "object_bridges.sqlite3"
        self._ensure_schema()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _ensure_schema(self) -> None:
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS bridge_candidates (
                    id TEXT PRIMARY KEY,
                    status TEXT NOT NULL,
                    candidate_type TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS candidate_action_events (
                    id TEXT PRIMARY KEY,
                    candidate_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS project_reference_links (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS notebook_reference_links (
                    id TEXT PRIMARY KEY,
                    note_id TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_bridge_candidates_status
                    ON bridge_candidates(status);
                CREATE INDEX IF NOT EXISTS idx_bridge_candidates_candidate_type
                    ON bridge_candidates(candidate_type);
                CREATE INDEX IF NOT EXISTS idx_candidate_action_events_candidate_id
                    ON candidate_action_events(candidate_id, created_at, id);
                CREATE INDEX IF NOT EXISTS idx_project_reference_links_project_id
                    ON project_reference_links(project_id);
                CREATE INDEX IF NOT EXISTS idx_notebook_reference_links_note_id
                    ON notebook_reference_links(note_id);
                """
            )
            self._ensure_bridge_candidate_column(
                connection,
                column_name="candidate_type",
                column_type="TEXT NOT NULL DEFAULT ''",
            )

    def _ensure_bridge_candidate_column(
        self,
        connection: sqlite3.Connection,
        *,
        column_name: str,
        column_type: str,
    ) -> None:
        columns = {
            str(row["name"])
            for row in connection.execute("PRAGMA table_info(bridge_candidates)").fetchall()
        }
        if column_name in columns:
            return
        connection.execute(
            f"ALTER TABLE bridge_candidates ADD COLUMN {column_name} {column_type}"
        )

    def save_candidate(self, candidate: BridgeCandidateRecord) -> BridgeCandidateRecord:
        with self._connect() as connection:
            self._write_candidate(connection, candidate)
        return candidate

    def get_candidate(self, candidate_id: str) -> BridgeCandidateRecord | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload FROM bridge_candidates WHERE id = ?",
                (candidate_id,),
            ).fetchone()
        if row is None:
            return None
        return BridgeCandidateRecord(**json.loads(str(row["payload"])))

    def list_candidates(
        self,
        *,
        status: str | None = None,
        candidate_type: str | None = None,
    ) -> list[BridgeCandidateRecord]:
        clauses: list[str] = []
        params: list[str] = []
        if status is not None:
            clauses.append("status = ?")
            params.append(status)
        if candidate_type is not None:
            clauses.append("candidate_type = ?")
            params.append(candidate_type)
        where_clause = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        with self._connect() as connection:
            rows = connection.execute(
                f"SELECT payload FROM bridge_candidates {where_clause} ORDER BY id ASC",
                params,
            ).fetchall()
        return [BridgeCandidateRecord(**json.loads(str(row["payload"]))) for row in rows]

    def update_candidate_status(self, candidate_id: str, status: str) -> BridgeCandidateRecord:
        candidate = self.get_candidate(candidate_id)
        if candidate is None:
            raise KeyError(candidate_id)
        updated = replace(
            candidate,
            status=status,  # type: ignore[arg-type]
            updated_at=_now_iso(),
        )
        return self.save_candidate(updated)

    def mark_candidate_ready(
        self,
        candidate_id: str,
        *,
        actor_type: str,
        reviewed_at: str | None = None,
    ) -> BridgeCandidateRecord:
        review_time = reviewed_at or _now_iso()
        return self._update_candidate(
            candidate_id,
            action="ready",
            actor_type=actor_type,
            candidate_updates={
                "status": "ready",
                "reviewed_at": review_time,
                "reviewed_by": actor_type,
                "terminal_reason": None,
                "last_error": None,
                "updated_at": review_time,
            },
            event_payload={"reviewed_at": review_time},
        )

    def dismiss_candidate(
        self,
        candidate_id: str,
        *,
        actor_type: str,
        terminal_reason: str,
    ) -> BridgeCandidateRecord:
        return self._update_candidate(
            candidate_id,
            action="dismissed",
            actor_type=actor_type,
            candidate_updates={
                "status": "dismissed",
                "terminal_reason": terminal_reason,
                "reviewed_by": actor_type,
                "updated_at": _now_iso(),
            },
            event_payload={"terminal_reason": terminal_reason},
        )

    def expire_candidate(
        self,
        candidate_id: str,
        *,
        actor_type: str,
        terminal_reason: str,
    ) -> BridgeCandidateRecord:
        return self._update_candidate(
            candidate_id,
            action="expired",
            actor_type=actor_type,
            candidate_updates={
                "status": "expired",
                "terminal_reason": terminal_reason,
                "updated_at": _now_iso(),
            },
            event_payload={"terminal_reason": terminal_reason},
        )

    def defer_candidate(
        self,
        candidate_id: str,
        *,
        deferred_until: str,
        deferred_reason: str,
        actor_type: str,
    ) -> BridgeCandidateRecord:
        return self._update_candidate(
            candidate_id,
            action="deferred",
            actor_type=actor_type,
            candidate_updates={
                "deferred_until": deferred_until,
                "deferred_reason": deferred_reason,
                "reviewed_by": actor_type,
                "updated_at": _now_iso(),
            },
            event_payload={
                "deferred_until": deferred_until,
                "deferred_reason": deferred_reason,
            },
        )

    def record_candidate_error(
        self,
        candidate_id: str,
        *,
        error_code: str,
        message: str,
        actor_type: str,
        failed_at: str | None = None,
    ) -> BridgeCandidateRecord:
        error_payload = {
            "error_code": error_code,
            "message": message,
            "failed_at": failed_at or _now_iso(),
        }
        return self._update_candidate(
            candidate_id,
            action="error_recorded",
            actor_type=actor_type,
            candidate_updates={
                "last_error": error_payload,
                "updated_at": error_payload["failed_at"],
            },
            event_payload=error_payload,
        )

    def list_candidate_events(self, candidate_id: str) -> list[CandidateActionEvent]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT payload
                FROM candidate_action_events
                WHERE candidate_id = ?
                ORDER BY created_at ASC, id ASC
                """,
                (candidate_id,),
            ).fetchall()
        return [CandidateActionEvent(**json.loads(str(row["payload"]))) for row in rows]

    def _update_candidate(
        self,
        candidate_id: str,
        *,
        action: str,
        actor_type: str,
        candidate_updates: dict[str, Any],
        event_payload: dict[str, Any] | None = None,
    ) -> BridgeCandidateRecord:
        candidate = self.get_candidate(candidate_id)
        if candidate is None:
            raise KeyError(candidate_id)
        updated = replace(candidate, **candidate_updates)
        event = CandidateActionEvent(
            id=f"evt_{uuid4().hex}",
            candidate_id=candidate_id,
            action=action,
            actor_type=actor_type,  # type: ignore[arg-type]
            created_at=updated.updated_at or _now_iso(),
            payload=event_payload or {},
        )
        with self._connect() as connection:
            self._write_candidate(connection, updated)
            self._write_candidate_event(connection, event)
        return updated

    def _write_candidate(
        self,
        connection: sqlite3.Connection,
        candidate: BridgeCandidateRecord,
    ) -> None:
        connection.execute(
            """
            INSERT OR REPLACE INTO bridge_candidates (id, status, candidate_type, payload)
            VALUES (?, ?, ?, ?)
            """,
            (
                candidate.id,
                candidate.status,
                candidate.candidate_type,
                json.dumps(asdict(candidate), ensure_ascii=False),
            ),
        )

    def _write_candidate_event(
        self,
        connection: sqlite3.Connection,
        event: CandidateActionEvent,
    ) -> None:
        connection.execute(
            """
            INSERT INTO candidate_action_events (id, candidate_id, action, created_at, payload)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                event.id,
                event.candidate_id,
                event.action,
                event.created_at,
                json.dumps(asdict(event), ensure_ascii=False),
            ),
        )

    def save_project_reference(self, link: ProjectReferenceLink) -> ProjectReferenceLink:
        with self._connect() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO project_reference_links (id, project_id, payload) VALUES (?, ?, ?)",
                (link.id, link.project_id, json.dumps(asdict(link), ensure_ascii=False)),
            )
        return link

    def list_project_references(self, project_id: str) -> list[ProjectReferenceLink]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT payload FROM project_reference_links WHERE project_id = ? ORDER BY id ASC",
                (project_id,),
            ).fetchall()
        return [ProjectReferenceLink(**json.loads(str(row["payload"]))) for row in rows]

    def save_notebook_reference(self, link: NotebookReferenceLink) -> NotebookReferenceLink:
        with self._connect() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO notebook_reference_links (id, note_id, payload) VALUES (?, ?, ?)",
                (link.id, link.note_id, json.dumps(asdict(link), ensure_ascii=False)),
            )
        return link

    def list_notebook_references(self, note_id: str) -> list[NotebookReferenceLink]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT payload FROM notebook_reference_links WHERE note_id = ? ORDER BY id ASC",
                (note_id,),
            ).fetchall()
        return [NotebookReferenceLink(**json.loads(str(row["payload"]))) for row in rows]
