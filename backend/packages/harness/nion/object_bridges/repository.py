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
    BridgeCandidateStatus,
    CandidateActionEvent,
    NotebookReferenceLink,
    ProjectReferenceLink,
)


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


_VALID_STATUS_TRANSITIONS: dict[BridgeCandidateStatus, set[BridgeCandidateStatus]] = {
    "draft": {"ready", "expired"},
    "ready": {"applied", "dismissed", "expired"},
    "applied": set(),
    "dismissed": set(),
    "expired": set(),
}


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
            self._ensure_bridge_candidates_table(connection)
            self._ensure_candidate_action_events_table(connection)
            self._ensure_bridge_candidate_column(
                connection,
                column_name="candidate_type",
                column_type="TEXT NOT NULL DEFAULT ''",
            )
            self._backfill_bridge_candidate_types(connection)
            connection.executescript(
                """
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
                CREATE INDEX IF NOT EXISTS idx_project_reference_links_project_id
                    ON project_reference_links(project_id);
                CREATE INDEX IF NOT EXISTS idx_notebook_reference_links_note_id
                    ON notebook_reference_links(note_id);
                """
            )

    def _ensure_bridge_candidates_table(self, connection: sqlite3.Connection) -> None:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS bridge_candidates (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                candidate_type TEXT NOT NULL,
                payload TEXT NOT NULL
            )
            """
        )

    def _ensure_candidate_action_events_table(self, connection: sqlite3.Connection) -> None:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS candidate_action_events (
                id TEXT PRIMARY KEY,
                candidate_id TEXT NOT NULL,
                action TEXT NOT NULL,
                created_at TEXT NOT NULL,
                payload TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_candidate_action_events_candidate_id
            ON candidate_action_events(candidate_id, created_at, id)
            """
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
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_bridge_candidates_candidate_type
            ON bridge_candidates(candidate_type)
            """
        )

    def _backfill_bridge_candidate_types(self, connection: sqlite3.Connection) -> None:
        rows = connection.execute(
            """
            SELECT id, payload
            FROM bridge_candidates
            WHERE candidate_type = ''
            """
        ).fetchall()
        for row in rows:
            payload = json.loads(str(row["payload"]))
            candidate_type = payload.get("candidate_type")
            if not candidate_type:
                continue
            connection.execute(
                "UPDATE bridge_candidates SET candidate_type = ? WHERE id = ?",
                (candidate_type, row["id"]),
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

    def update_candidate_status(
        self,
        candidate_id: str,
        status: BridgeCandidateStatus,
    ) -> BridgeCandidateRecord:
        return self.transition_candidate(
            candidate_id,
            to_status=status,
            actor_type="system",
            action=status,
            event_payload={"requested_via": "update_candidate_status"},
        )

    def transition_candidate(
        self,
        candidate_id: str,
        *,
        to_status: BridgeCandidateStatus,
        actor_type: str,
        action: str,
        field_updates: dict[str, Any] | None = None,
        event_payload: dict[str, Any] | None = None,
        updated_at: str | None = None,
    ) -> BridgeCandidateRecord:
        return self._transition_candidate(
            candidate_id,
            to_status=to_status,
            actor_type=actor_type,
            action=action,
            field_updates=field_updates,
            event_payload=event_payload,
            updated_at=updated_at,
        )

    def mark_candidate_ready(
        self,
        candidate_id: str,
        *,
        actor_type: str,
        reviewed_at: str | None = None,
    ) -> BridgeCandidateRecord:
        candidate = self.get_candidate(candidate_id)
        if candidate is None:
            raise KeyError(candidate_id)
        review_time = reviewed_at or _now_iso()
        if candidate.status == "ready":
            return self._update_candidate(
                candidate_id,
                action="ready",
                actor_type=actor_type,
                field_updates={
                    "deferred_until": None,
                    "deferred_reason": None,
                    "terminal_reason": None,
                    "reviewed_at": review_time,
                    "reviewed_by": actor_type,
                },
                event_payload={
                    "from_status": "ready",
                    "to_status": "ready",
                    "reviewed_at": review_time,
                },
                updated_at=review_time,
            )
        return self._transition_candidate(
            candidate_id,
            to_status="ready",
            actor_type=actor_type,
            action="ready",
            field_updates={
                "reviewed_at": review_time,
                "reviewed_by": actor_type,
            },
            event_payload={"reviewed_at": review_time},
            updated_at=review_time,
        )

    def dismiss_candidate(
        self,
        candidate_id: str,
        *,
        actor_type: str,
        terminal_reason: str,
    ) -> BridgeCandidateRecord:
        candidate = self.get_candidate(candidate_id)
        if candidate is None:
            raise KeyError(candidate_id)
        review_time = candidate.reviewed_at or _now_iso()
        return self._transition_candidate(
            candidate_id,
            to_status="dismissed",
            actor_type=actor_type,
            action="dismissed",
            field_updates={
                "terminal_reason": terminal_reason,
                "reviewed_at": candidate.reviewed_at or review_time,
                "reviewed_by": candidate.reviewed_by or actor_type,
            },
            event_payload={
                "terminal_reason": terminal_reason,
                "reviewed_at": review_time,
            },
            updated_at=review_time if candidate.reviewed_at is None else None,
        )

    def expire_candidate(
        self,
        candidate_id: str,
        *,
        actor_type: str,
        terminal_reason: str,
    ) -> BridgeCandidateRecord:
        return self._transition_candidate(
            candidate_id,
            to_status="expired",
            actor_type=actor_type,
            action="expired",
            field_updates={
                "terminal_reason": terminal_reason,
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
            field_updates={
                "deferred_until": deferred_until,
                "deferred_reason": deferred_reason,
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
            field_updates={
                "last_error": error_payload,
            },
            event_payload=error_payload,
            updated_at=error_payload["failed_at"],
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
        field_updates: dict[str, Any],
        event_payload: dict[str, Any] | None = None,
        updated_at: str | None = None,
    ) -> BridgeCandidateRecord:
        candidate = self.get_candidate(candidate_id)
        if candidate is None:
            raise KeyError(candidate_id)
        effective_updated_at = updated_at or _now_iso()
        updated = replace(
            candidate,
            **field_updates,
            updated_at=effective_updated_at,
        )
        event = CandidateActionEvent(
            id=f"evt_{uuid4().hex}",
            candidate_id=candidate_id,
            action=action,
            actor_type=actor_type,  # type: ignore[arg-type]
            created_at=effective_updated_at,
            payload=event_payload or {},
        )
        with self._connect() as connection:
            self._write_candidate(connection, updated)
            self._write_candidate_event(connection, event)
        return updated

    def _transition_candidate(
        self,
        candidate_id: str,
        *,
        to_status: BridgeCandidateStatus,
        actor_type: str,
        action: str,
        field_updates: dict[str, Any] | None = None,
        event_payload: dict[str, Any] | None = None,
        updated_at: str | None = None,
    ) -> BridgeCandidateRecord:
        candidate = self.get_candidate(candidate_id)
        if candidate is None:
            raise KeyError(candidate_id)
        if to_status not in _VALID_STATUS_TRANSITIONS[candidate.status]:
            raise ValueError(
                f"invalid candidate transition: {candidate.status} -> {to_status}"
            )
        effective_updated_at = updated_at or _now_iso()
        updates = self._status_field_updates(candidate.status, to_status)
        if field_updates:
            updates.update(field_updates)
        payload = {"from_status": candidate.status, "to_status": to_status}
        if event_payload:
            payload.update(event_payload)
        return self._update_candidate(
            candidate_id,
            action=action,
            actor_type=actor_type,
            field_updates={"status": to_status, **updates},
            event_payload=payload,
            updated_at=effective_updated_at,
        )

    def _status_field_updates(
        self,
        from_status: BridgeCandidateStatus,
        to_status: BridgeCandidateStatus,
    ) -> dict[str, Any]:
        updates: dict[str, Any] = {}
        if to_status == "ready":
            updates.update(
                {
                    "deferred_until": None,
                    "deferred_reason": None,
                    "terminal_reason": None,
                }
            )
        if to_status in {"dismissed", "expired", "applied"}:
            updates.update(
                {
                    "deferred_until": None,
                    "deferred_reason": None,
                }
            )
        if from_status != "ready" and to_status != "ready":
            updates.update(
                {
                    "reviewed_at": None,
                    "reviewed_by": None,
                }
            )
        return updates

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
