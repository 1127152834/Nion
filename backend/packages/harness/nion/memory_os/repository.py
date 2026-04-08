from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from .clock import utcnow_z
from .models import (
    AccessLogEntry,
    CandidateRecord,
    ConsolidationEvent,
    MemoryDecision,
    MemoryNode,
    MemoryRevision,
    SoulEventRecord,
    UserOverrideRecord,
)


class MemoryOSRepository:
    def __init__(self, db_path: str | Path) -> None:
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
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
                    canonical_key TEXT NOT NULL UNIQUE,
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
                    UNIQUE(memory_id, revision_number),
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
            self._ensure_unique_index(
                conn,
                "memory_nodes",
                "idx_memory_nodes_canonical_key_unique",
                "canonical_key",
            )
            self._ensure_unique_index(
                conn,
                "memory_revisions",
                "idx_memory_revisions_memory_id_revision_number_unique",
                "memory_id, revision_number",
            )

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

    @staticmethod
    def _ensure_unique_index(
        conn: sqlite3.Connection,
        table_name: str,
        index_name: str,
        columns_sql: str,
    ) -> None:
        rows = conn.execute(f"PRAGMA index_list({table_name})").fetchall()
        existing_indexes = {str(row["name"]) for row in rows}
        if index_name in existing_indexes:
            return
        conn.execute(
            f"CREATE UNIQUE INDEX IF NOT EXISTS {index_name} ON {table_name} ({columns_sql})"
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

    def save_memory_node(self, payload: MemoryNode | dict[str, object]) -> MemoryNode:
        record = payload if isinstance(payload, MemoryNode) else MemoryNode.model_validate(payload)
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO memory_nodes (
                    memory_id,
                    canonical_key,
                    owner_type,
                    scope,
                    node_type,
                    status,
                    summary,
                    created_at,
                    updated_at,
                    metadata_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(memory_id) DO UPDATE SET
                    owner_type = excluded.owner_type,
                    scope = excluded.scope,
                    node_type = excluded.node_type,
                    status = excluded.status,
                    summary = excluded.summary,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at,
                    metadata_json = excluded.metadata_json
                """,
                (
                    record.memory_id,
                    record.canonical_key,
                    record.owner_type,
                    record.scope,
                    record.node_type,
                    record.status,
                    record.summary,
                    record.created_at,
                    record.updated_at,
                    json.dumps(record.metadata, ensure_ascii=False),
                ),
            )
        return record

    def get_memory_node(self, memory_id: str) -> MemoryNode | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT
                    memory_id,
                    canonical_key,
                    owner_type,
                    scope,
                    node_type,
                    status,
                    summary,
                    created_at,
                    updated_at,
                    metadata_json
                FROM memory_nodes
                WHERE memory_id = ?
                """,
                (memory_id,),
            ).fetchone()
        return self._load_memory_node(row)

    def get_memory_node_by_canonical_key(self, canonical_key: str) -> MemoryNode | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT
                    memory_id,
                    canonical_key,
                    owner_type,
                    scope,
                    node_type,
                    status,
                    summary,
                    created_at,
                    updated_at,
                    metadata_json
                FROM memory_nodes
                WHERE canonical_key = ?
                ORDER BY updated_at DESC, memory_id DESC
                LIMIT 1
                """,
                (canonical_key,),
            ).fetchone()
        return self._load_memory_node(row)

    def save_memory_revision(self, payload: MemoryRevision | dict[str, object]) -> MemoryRevision:
        record = payload if isinstance(payload, MemoryRevision) else MemoryRevision.model_validate(payload)
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO memory_revisions (
                    revision_id,
                    memory_id,
                    revision_number,
                    summary,
                    evidence_ref,
                    created_at,
                    payload_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.revision_id,
                    record.memory_id,
                    record.revision_number,
                    record.summary,
                    record.evidence_ref,
                    record.created_at,
                    json.dumps(record.payload, ensure_ascii=False),
                ),
            )
        return record

    def append_memory_revision(
        self,
        *,
        memory_id: str,
        summary: str,
        evidence_ref: str | None,
        created_at: str,
        payload: dict[str, object] | None = None,
    ) -> MemoryRevision:
        with self._connect() as conn:
            current_revision_number = conn.execute(
                """
                SELECT COALESCE(MAX(revision_number), 0) AS current_revision_number
                FROM memory_revisions
                WHERE memory_id = ?
                """,
                (memory_id,),
            ).fetchone()
            revision_number = 1 if current_revision_number is None else int(current_revision_number["current_revision_number"]) + 1
            revision = MemoryRevision(
                revision_id=f"{memory_id}:rev:{revision_number}",
                memory_id=memory_id,
                revision_number=revision_number,
                summary=summary,
                evidence_ref=evidence_ref,
                created_at=created_at,
                payload=dict(payload or {}),
            )
            conn.execute(
                """
                INSERT INTO memory_revisions (
                    revision_id,
                    memory_id,
                    revision_number,
                    summary,
                    evidence_ref,
                    created_at,
                    payload_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    revision.revision_id,
                    revision.memory_id,
                    revision.revision_number,
                    revision.summary,
                    revision.evidence_ref,
                    revision.created_at,
                    json.dumps(revision.payload, ensure_ascii=False),
                ),
            )
        return revision

    def list_memory_revisions(self, *, memory_id: str) -> list[MemoryRevision]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT
                    revision_id,
                    memory_id,
                    revision_number,
                    summary,
                    evidence_ref,
                    created_at,
                    payload_json
                FROM memory_revisions
                WHERE memory_id = ?
                ORDER BY revision_number DESC, created_at DESC, revision_id DESC
                """,
                (memory_id,),
            ).fetchall()
        records: list[MemoryRevision] = []
        for row in rows:
            payload = dict(row)
            payload["payload"] = json.loads(str(payload.pop("payload_json") or "{}"))
            records.append(MemoryRevision.model_validate(payload))
        return records

    def save_memory_decision(self, payload: MemoryDecision | dict[str, object]) -> MemoryDecision:
        record = payload if isinstance(payload, MemoryDecision) else MemoryDecision.model_validate(payload)
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO memory_decisions (
                    decision_id,
                    memory_id,
                    revision_id,
                    decision_type,
                    rationale,
                    created_at,
                    decided_by,
                    metadata_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(decision_id) DO UPDATE SET
                    memory_id = excluded.memory_id,
                    revision_id = excluded.revision_id,
                    decision_type = excluded.decision_type,
                    rationale = excluded.rationale,
                    created_at = excluded.created_at,
                    decided_by = excluded.decided_by,
                    metadata_json = excluded.metadata_json
                """,
                (
                    record.decision_id,
                    record.memory_id,
                    record.revision_id,
                    record.decision_type,
                    record.rationale,
                    record.created_at,
                    record.decided_by,
                    json.dumps(record.metadata, ensure_ascii=False),
                ),
            )
        return record

    def list_memory_decisions(self, *, memory_id: str) -> list[MemoryDecision]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT
                    decision_id,
                    memory_id,
                    revision_id,
                    decision_type,
                    rationale,
                    created_at,
                    decided_by,
                    metadata_json
                FROM memory_decisions
                WHERE memory_id = ?
                ORDER BY created_at DESC, decision_id DESC
                """,
                (memory_id,),
            ).fetchall()
        records: list[MemoryDecision] = []
        for row in rows:
            payload = dict(row)
            payload["metadata"] = json.loads(str(payload.pop("metadata_json") or "{}"))
            records.append(MemoryDecision.model_validate(payload))
        return records

    def save_user_override(self, payload: UserOverrideRecord | dict[str, object]) -> UserOverrideRecord:
        record = payload if isinstance(payload, UserOverrideRecord) else UserOverrideRecord.model_validate(payload)
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO user_overrides (
                    override_id,
                    memory_id,
                    field_name,
                    value_json,
                    reason,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(override_id) DO UPDATE SET
                    memory_id = excluded.memory_id,
                    field_name = excluded.field_name,
                    value_json = excluded.value_json,
                    reason = excluded.reason,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at
                """,
                (
                    record.override_id,
                    record.memory_id,
                    record.field_name,
                    json.dumps(record.value, ensure_ascii=False),
                    record.reason,
                    record.created_at,
                    record.updated_at,
                ),
            )
        return record

    def list_user_overrides(self, *, memory_id: str) -> list[UserOverrideRecord]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT
                    override_id,
                    memory_id,
                    field_name,
                    value_json,
                    reason,
                    created_at,
                    updated_at
                FROM user_overrides
                WHERE memory_id = ?
                ORDER BY updated_at DESC, override_id DESC
                """,
                (memory_id,),
            ).fetchall()
        records: list[UserOverrideRecord] = []
        for row in rows:
            payload = dict(row)
            payload["value"] = json.loads(str(payload.pop("value_json") or "{}"))
            records.append(UserOverrideRecord.model_validate(payload))
        return records

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

    @staticmethod
    def _load_memory_node(row: sqlite3.Row | None) -> MemoryNode | None:
        if row is None:
            return None
        payload = dict(row)
        payload["metadata"] = json.loads(str(payload.pop("metadata_json") or "{}"))
        return MemoryNode.model_validate(payload)
