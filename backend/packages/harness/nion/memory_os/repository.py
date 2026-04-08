from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from .clock import utcnow_z
from .models import AccessLogEntry, CandidateRecord, ConsolidationEvent, SoulEventRecord


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
                    artifact_uri TEXT,
                    provenance_json TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS memory_nodes (
                    memory_id TEXT PRIMARY KEY,
                    canonical_key TEXT NOT NULL,
                    owner_type TEXT NOT NULL,
                    scope TEXT NOT NULL,
                    node_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    metadata_json TEXT NOT NULL DEFAULT '{}'
                );

                CREATE TABLE IF NOT EXISTS memory_revisions (
                    revision_id TEXT PRIMARY KEY,
                    memory_id TEXT NOT NULL,
                    revision_number INTEGER NOT NULL,
                    summary TEXT NOT NULL,
                    evidence_ref TEXT,
                    created_at TEXT NOT NULL,
                    payload_json TEXT NOT NULL DEFAULT '{}',
                    FOREIGN KEY(memory_id) REFERENCES memory_nodes(memory_id)
                );

                CREATE TABLE IF NOT EXISTS memory_decisions (
                    decision_id TEXT PRIMARY KEY,
                    memory_id TEXT NOT NULL,
                    revision_id TEXT,
                    decision_type TEXT NOT NULL,
                    rationale TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    decided_by TEXT,
                    metadata_json TEXT NOT NULL DEFAULT '{}',
                    FOREIGN KEY(memory_id) REFERENCES memory_nodes(memory_id),
                    FOREIGN KEY(revision_id) REFERENCES memory_revisions(revision_id)
                );

                CREATE TABLE IF NOT EXISTS memory_links (
                    link_id TEXT PRIMARY KEY,
                    source_memory_id TEXT NOT NULL,
                    target_memory_id TEXT NOT NULL,
                    relation TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    metadata_json TEXT NOT NULL DEFAULT '{}',
                    FOREIGN KEY(source_memory_id) REFERENCES memory_nodes(memory_id),
                    FOREIGN KEY(target_memory_id) REFERENCES memory_nodes(memory_id)
                );

                CREATE TABLE IF NOT EXISTS user_overrides (
                    override_id TEXT PRIMARY KEY,
                    memory_id TEXT NOT NULL,
                    field_name TEXT NOT NULL,
                    value_json TEXT NOT NULL DEFAULT '{}',
                    reason TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY(memory_id) REFERENCES memory_nodes(memory_id)
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

                CREATE TABLE IF NOT EXISTS soul_events (
                    event_id TEXT PRIMARY KEY,
                    event_type TEXT NOT NULL,
                    memory_id TEXT NOT NULL,
                    related_memory_id TEXT,
                    summary TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    actor TEXT,
                    source TEXT,
                    metadata_json TEXT NOT NULL DEFAULT '{}'
                );
                """
            )
            self._ensure_column(conn, "soul_events", "related_memory_id", "TEXT")
            self._ensure_column(conn, "soul_events", "actor", "TEXT")
            self._ensure_column(conn, "soul_events", "source", "TEXT")
            self._ensure_column(conn, "soul_events", "metadata_json", "TEXT NOT NULL DEFAULT '{}'")
            self._ensure_column(conn, "memory_records", "artifact_uri", "TEXT")
            self._ensure_column(conn, "memory_records", "provenance_json", "TEXT NOT NULL DEFAULT '{}'")

    @staticmethod
    def _ensure_column(
        conn: sqlite3.Connection,
        table_name: str,
        column_name: str,
        column_definition: str,
    ) -> None:
        rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
        existing_columns = {str(row["name"]) for row in rows}
        if column_name in existing_columns:
            return
        conn.execute(
            f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}"
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
                    artifact_uri,
                    provenance_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    artifact_uri = excluded.artifact_uri,
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
                    payload.get("artifact_uri"),
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
                artifact_uri,
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

    def update_memory_status(
        self,
        memory_id: str,
        status: str,
        *,
        updated_at: str | None = None,
    ) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                UPDATE memory_records
                SET status = ?, updated_at = ?
                WHERE memory_id = ?
                """,
                (status, updated_at or utcnow_z(), memory_id),
            )

    def save_candidate_record(self, candidate: CandidateRecord) -> CandidateRecord:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO candidate_records (
                    candidate_id,
                    proposed_domain,
                    proposed_subtype,
                    owner_type,
                    scope,
                    memory_type,
                    summary,
                    confidence,
                    status,
                    created_at,
                    expires_at,
                    producer
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(candidate_id) DO UPDATE SET
                    proposed_domain = excluded.proposed_domain,
                    proposed_subtype = excluded.proposed_subtype,
                    owner_type = excluded.owner_type,
                    scope = excluded.scope,
                    memory_type = excluded.memory_type,
                    summary = excluded.summary,
                    confidence = excluded.confidence,
                    status = excluded.status,
                    created_at = excluded.created_at,
                    expires_at = excluded.expires_at,
                    producer = excluded.producer
                """,
                (
                    candidate.candidate_id,
                    candidate.proposed_domain,
                    candidate.proposed_subtype,
                    candidate.owner_type,
                    candidate.scope,
                    candidate.memory_type,
                    candidate.summary,
                    candidate.confidence,
                    candidate.status,
                    candidate.created_at,
                    candidate.expires_at,
                    candidate.producer,
                ),
            )
        return candidate

    def list_candidate_records(self) -> list[CandidateRecord]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT
                    candidate_id,
                    proposed_domain,
                    proposed_subtype,
                    owner_type,
                    scope,
                    memory_type,
                    summary,
                    confidence,
                    status,
                    created_at,
                    expires_at,
                    producer
                FROM candidate_records
                ORDER BY created_at ASC, candidate_id ASC
                """
            ).fetchall()
        return [CandidateRecord.model_validate(dict(row)) for row in rows]

    def delete_candidate_record(self, candidate_id: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "DELETE FROM candidate_records WHERE candidate_id = ?",
                (candidate_id,),
            )

    def save_consolidation_event(self, event: ConsolidationEvent) -> ConsolidationEvent:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO consolidation_events (
                    event_id,
                    input_candidate_ids_json,
                    affected_memory_ids_json,
                    action,
                    notes,
                    created_at,
                    executor
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(event_id) DO UPDATE SET
                    input_candidate_ids_json = excluded.input_candidate_ids_json,
                    affected_memory_ids_json = excluded.affected_memory_ids_json,
                    action = excluded.action,
                    notes = excluded.notes,
                    created_at = excluded.created_at,
                    executor = excluded.executor
                """,
                (
                    event.event_id,
                    json.dumps(event.input_candidate_ids, ensure_ascii=False),
                    json.dumps(event.affected_memory_ids, ensure_ascii=False),
                    event.action,
                    event.notes,
                    event.created_at,
                    event.executor,
                ),
            )
        return event

    def save_soul_event(self, event: SoulEventRecord | dict[str, object]) -> SoulEventRecord:
        record = event if isinstance(event, SoulEventRecord) else SoulEventRecord.model_validate(event)
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO soul_events (
                    event_id,
                    event_type,
                    memory_id,
                    related_memory_id,
                    summary,
                    created_at,
                    actor,
                    source,
                    metadata_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(event_id) DO UPDATE SET
                    event_type = excluded.event_type,
                    memory_id = excluded.memory_id,
                    related_memory_id = excluded.related_memory_id,
                    summary = excluded.summary,
                    created_at = excluded.created_at,
                    actor = excluded.actor,
                    source = excluded.source,
                    metadata_json = excluded.metadata_json
                """,
                (
                    record.event_id,
                    record.event_type,
                    record.memory_id,
                    record.related_memory_id,
                    record.summary,
                    record.created_at,
                    record.actor,
                    record.source,
                    json.dumps(record.metadata, ensure_ascii=False),
                ),
            )
        return record

    def list_soul_events(self) -> list[SoulEventRecord]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT
                    event_id,
                    event_type,
                    memory_id,
                    related_memory_id,
                    summary,
                    created_at,
                    actor,
                    source,
                    metadata_json
                FROM soul_events
                ORDER BY created_at DESC, event_id DESC
                """
            ).fetchall()
        records: list[SoulEventRecord] = []
        for row in rows:
            payload = dict(row)
            payload["metadata"] = json.loads(str(payload.pop("metadata_json") or "{}"))
            records.append(SoulEventRecord.model_validate(payload))
        return records
