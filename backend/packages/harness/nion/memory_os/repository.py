from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from .models import AccessLogEntry


class MemoryOSRepository:
    def __init__(self, db_path: str | Path) -> None:
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS memory_records (
                    memory_id TEXT PRIMARY KEY,
                    domain TEXT NOT NULL,
                    subtype TEXT NOT NULL,
                    owner_type TEXT NOT NULL,
                    scope TEXT NOT NULL,
                    memory_type TEXT NOT NULL,
                    subject_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    provenance_json TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS candidate_records (
                    candidate_id TEXT PRIMARY KEY,
                    proposed_domain TEXT NOT NULL,
                    proposed_subtype TEXT NOT NULL,
                    owner_type TEXT NOT NULL,
                    scope TEXT NOT NULL,
                    memory_type TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    producer TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS memory_artifacts (
                    artifact_id TEXT PRIMARY KEY,
                    artifact_uri TEXT NOT NULL,
                    domain TEXT NOT NULL,
                    artifact_kind TEXT NOT NULL,
                    owner_type TEXT NOT NULL,
                    scope TEXT NOT NULL,
                    title TEXT,
                    format TEXT NOT NULL,
                    relative_path TEXT,
                    linked_memory_ids_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    checksum TEXT
                );

                CREATE TABLE IF NOT EXISTS evidence_links (
                    link_id TEXT PRIMARY KEY,
                    source_ref TEXT NOT NULL,
                    target_kind TEXT NOT NULL,
                    target_id TEXT NOT NULL,
                    relation TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS access_logs (
                    access_id TEXT PRIMARY KEY,
                    actor_type TEXT NOT NULL,
                    actor_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    target_kind TEXT NOT NULL,
                    target_id TEXT NOT NULL,
                    thread_id TEXT,
                    session_id TEXT,
                    reason TEXT,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS consolidation_events (
                    event_id TEXT PRIMARY KEY,
                    input_candidate_ids_json TEXT NOT NULL,
                    affected_memory_ids_json TEXT NOT NULL,
                    action TEXT NOT NULL,
                    notes TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    executor TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS automation_projections (
                    job_id TEXT PRIMARY KEY,
                    payload_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                """
            )

    def healthcheck(self) -> dict[str, object]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
            ).fetchall()
        return {"ok": True, "tables": [row["name"] for row in rows]}

    def save_access_log(self, entry: AccessLogEntry) -> AccessLogEntry:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO access_logs (
                    access_id,
                    actor_type,
                    actor_id,
                    action,
                    target_kind,
                    target_id,
                    thread_id,
                    session_id,
                    reason,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(access_id) DO UPDATE SET
                    actor_type = excluded.actor_type,
                    actor_id = excluded.actor_id,
                    action = excluded.action,
                    target_kind = excluded.target_kind,
                    target_id = excluded.target_id,
                    thread_id = excluded.thread_id,
                    session_id = excluded.session_id,
                    reason = excluded.reason,
                    created_at = excluded.created_at
                """,
                (
                    entry.access_id,
                    entry.actor_type,
                    entry.actor_id,
                    entry.action,
                    entry.target_kind,
                    entry.target_id,
                    entry.thread_id,
                    entry.session_id,
                    entry.reason,
                    entry.created_at,
                ),
            )
        return entry

    def list_access_logs(self) -> list[AccessLogEntry]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM access_logs ORDER BY created_at ASC, access_id ASC"
            ).fetchall()
        return [AccessLogEntry.model_validate(dict(row)) for row in rows]

    def save_memory_record(self, payload: dict[str, object]) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO memory_records (
                    memory_id,
                    domain,
                    subtype,
                    owner_type,
                    scope,
                    memory_type,
                    subject_id,
                    status,
                    summary,
                    confidence,
                    created_at,
                    updated_at,
                    provenance_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(memory_id) DO UPDATE SET
                    domain = excluded.domain,
                    subtype = excluded.subtype,
                    owner_type = excluded.owner_type,
                    scope = excluded.scope,
                    memory_type = excluded.memory_type,
                    subject_id = excluded.subject_id,
                    status = excluded.status,
                    summary = excluded.summary,
                    confidence = excluded.confidence,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at,
                    provenance_json = excluded.provenance_json
                """,
                (
                    payload["memory_id"],
                    payload["domain"],
                    payload["subtype"],
                    payload["owner_type"],
                    payload["scope"],
                    payload["memory_type"],
                    payload["subject_id"],
                    payload["status"],
                    payload["summary"],
                    payload["confidence"],
                    payload["created_at"],
                    payload["updated_at"],
                    json.dumps(payload["provenance"], ensure_ascii=False),
                ),
            )

    def list_memory_records(
        self,
        *,
        domain: str | None = None,
        status: str | None = None,
    ) -> list[dict[str, object]]:
        query = """
            SELECT
                memory_id,
                domain,
                subtype,
                owner_type,
                scope,
                memory_type,
                subject_id,
                status,
                summary,
                confidence,
                created_at,
                updated_at,
                provenance_json
            FROM memory_records
        """
        where: list[str] = []
        params: list[object] = []
        if domain is not None:
            where.append("domain = ?")
            params.append(domain)
        if status is not None:
            where.append("status = ?")
            params.append(status)
        if where:
            query += " WHERE " + " AND ".join(where)
        query += " ORDER BY updated_at DESC, memory_id DESC"

        with self._connect() as conn:
            rows = conn.execute(query, tuple(params)).fetchall()

        results: list[dict[str, object]] = []
        for row in rows:
            payload = dict(row)
            payload["provenance"] = json.loads(str(payload.pop("provenance_json")))
            results.append(payload)
        return results
