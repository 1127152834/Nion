from __future__ import annotations

import hashlib
import json
import sqlite3
from pathlib import Path

from nion.knowledge.models import (
    KnowledgeSourceCandidate,
    KnowledgeSourceReconciliationResult,
)
from nion.knowledge.paths import get_knowledge_paths
from nion.memory_os.clock import utcnow_z
from nion.notebook.service import NotebookService


def _hash_file(path: str) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()[:16]


class KnowledgeSourceCandidateStore:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._paths = get_knowledge_paths(base_dir=base_dir)
        self._paths.ensure_knowledge_dirs()
        self._db_path = self._paths.knowledge_meta_dir / "source_candidates.sqlite3"
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS knowledge_source_candidates (
                    source_id TEXT PRIMARY KEY,
                    source_kind TEXT NOT NULL,
                    notebook_ref_json TEXT NOT NULL,
                    title TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    content_hash TEXT NOT NULL,
                    status TEXT NOT NULL,
                    enqueued_at TEXT,
                    last_job_id TEXT,
                    last_compiled_at TEXT,
                    missing_detected_at TEXT,
                    compile_error TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            columns = {
                str(row["name"])
                for row in conn.execute("PRAGMA table_info(knowledge_source_candidates)").fetchall()
            }
            for ddl in (
                ("enqueued_at", "ALTER TABLE knowledge_source_candidates ADD COLUMN enqueued_at TEXT"),
                ("last_job_id", "ALTER TABLE knowledge_source_candidates ADD COLUMN last_job_id TEXT"),
                (
                    "missing_detected_at",
                    "ALTER TABLE knowledge_source_candidates ADD COLUMN missing_detected_at TEXT",
                ),
            ):
                if ddl[0] not in columns:
                    conn.execute(ddl[1])

    def _row_to_candidate(self, row: sqlite3.Row) -> KnowledgeSourceCandidate:
        return KnowledgeSourceCandidate(
            source_id=str(row["source_id"]),
            source_kind=str(row["source_kind"]),
            notebook_ref=dict(json.loads(str(row["notebook_ref_json"]))),
            title=str(row["title"]),
            summary=str(row["summary"]),
            content_hash=str(row["content_hash"]),
            status=str(row["status"]),
            enqueued_at=row["enqueued_at"],
            last_job_id=row["last_job_id"],
            last_compiled_at=row["last_compiled_at"],
            missing_detected_at=row["missing_detected_at"],
            compile_error=row["compile_error"],
            created_at=str(row["created_at"]),
            updated_at=str(row["updated_at"]),
        )

    def _inventory_from_notebook(self, notebook: NotebookService) -> dict[str, dict[str, object]]:
        inventory: dict[str, dict[str, object]] = {}
        for summary in notebook.list_note_summaries():
            note = notebook.read_note(summary.note_id)
            inventory[f"source:notebook_note:{note.note_id}"] = {
                "source_kind": "notebook_note",
                "notebook_ref": {
                    "note_id": note.note_id,
                    "relative_path": note.relative_path,
                },
                "title": note.title,
                "summary": summary.summary,
                "content_hash": note.content_hash,
                "created_at": note.created_at,
                "updated_at": note.updated_at,
            }

        for asset in notebook.list_assets():
            inventory[f"source:notebook_asset:{asset.asset_id}"] = {
                "source_kind": "notebook_asset",
                "notebook_ref": {
                    "asset_id": asset.asset_id,
                    "relative_path": asset.relative_path,
                },
                "title": asset.title,
                "summary": asset.relative_path,
                "content_hash": _hash_file(asset.absolute_path),
                "created_at": asset.created_at,
                "updated_at": asset.updated_at,
            }
        return inventory

    def _upsert_candidate(
        self,
        *,
        source_id: str,
        source_kind: str,
        notebook_ref: dict[str, str],
        title: str,
        summary: str,
        content_hash: str,
        created_at: str,
        updated_at: str,
    ) -> KnowledgeSourceCandidate:
        now = utcnow_z()
        with self._connect() as conn:
            existing = conn.execute(
                "SELECT * FROM knowledge_source_candidates WHERE source_id = ?",
                (source_id,),
            ).fetchone()
            if existing is None:
                payload = {
                    "status": "queued",
                    "enqueued_at": None,
                    "last_job_id": None,
                    "last_compiled_at": None,
                    "missing_detected_at": None,
                    "compile_error": None,
                    "created_at": created_at,
                    "updated_at": updated_at,
                }
            else:
                previous = self._row_to_candidate(existing)
                status = previous.status
                missing_detected_at = previous.missing_detected_at
                if previous.status == "compiled" and previous.content_hash != content_hash:
                    status = "stale"
                elif previous.status == "source_missing":
                    if previous.content_hash != content_hash:
                        status = "stale"
                    elif previous.last_compiled_at is not None:
                        status = "compiled"
                    else:
                        status = "queued"
                    missing_detected_at = None

                payload = {
                    "status": status,
                    "enqueued_at": previous.enqueued_at,
                    "last_job_id": previous.last_job_id,
                    "last_compiled_at": previous.last_compiled_at,
                    "missing_detected_at": missing_detected_at,
                    "compile_error": previous.compile_error,
                    "created_at": previous.created_at,
                    "updated_at": updated_at or now,
                }

            conn.execute(
                """
                INSERT INTO knowledge_source_candidates(
                    source_id, source_kind, notebook_ref_json, title, summary,
                    content_hash, status, enqueued_at, last_job_id,
                    last_compiled_at, missing_detected_at, compile_error,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(source_id) DO UPDATE SET
                    source_kind = excluded.source_kind,
                    notebook_ref_json = excluded.notebook_ref_json,
                    title = excluded.title,
                    summary = excluded.summary,
                    content_hash = excluded.content_hash,
                    status = excluded.status,
                    enqueued_at = excluded.enqueued_at,
                    last_job_id = excluded.last_job_id,
                    last_compiled_at = excluded.last_compiled_at,
                    missing_detected_at = excluded.missing_detected_at,
                    compile_error = excluded.compile_error,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at
                """,
                (
                    source_id,
                    source_kind,
                    json.dumps(notebook_ref, ensure_ascii=False),
                    title,
                    summary,
                    content_hash,
                    payload["status"],
                    payload["enqueued_at"],
                    payload["last_job_id"],
                    payload["last_compiled_at"],
                    payload["missing_detected_at"],
                    payload["compile_error"],
                    payload["created_at"],
                    payload["updated_at"],
                ),
            )
            row = conn.execute(
                "SELECT * FROM knowledge_source_candidates WHERE source_id = ?",
                (source_id,),
            ).fetchone()
        assert row is not None
        return self._row_to_candidate(row)

    def refresh_from_notebook(self, notebook: NotebookService) -> list[KnowledgeSourceCandidate]:
        inventory = self._inventory_from_notebook(notebook)
        for source_id, payload in inventory.items():
            self._upsert_candidate(
                source_id=source_id,
                source_kind=str(payload["source_kind"]),
                notebook_ref=dict(payload["notebook_ref"]),
                title=str(payload["title"]),
                summary=str(payload["summary"]),
                content_hash=str(payload["content_hash"]),
                created_at=str(payload["created_at"]),
                updated_at=str(payload["updated_at"]),
            )
        return self.list_candidates()

    def reconcile_with_notebook(
        self,
        notebook: NotebookService,
        *,
        activity_store: object | None = None,
    ) -> KnowledgeSourceReconciliationResult:
        inventory = self._inventory_from_notebook(notebook)
        previous_candidates = {
            candidate.source_id: candidate
            for candidate in self.list_candidates()
        }
        self.refresh_from_notebook(notebook)
        checked_source_ids = sorted(inventory.keys())
        source_missing_ids: list[str] = []
        restored_source_ids: list[str] = []
        detected_at = utcnow_z()

        with self._connect() as conn:
            rows = conn.execute("SELECT * FROM knowledge_source_candidates").fetchall()
            for row in rows:
                candidate = self._row_to_candidate(row)
                inventory_item = inventory.get(candidate.source_id)
                if inventory_item is None:
                    if candidate.status != "source_missing":
                        conn.execute(
                            """
                            UPDATE knowledge_source_candidates
                            SET status = ?, missing_detected_at = ?, updated_at = ?
                            WHERE source_id = ?
                            """,
                            ("source_missing", detected_at, detected_at, candidate.source_id),
                        )
                        source_missing_ids.append(candidate.source_id)
                        if activity_store is not None:
                            activity_store.record_event(
                                event_type="source_missing_detected",
                                source_id=candidate.source_id,
                                detail=f"Source missing detected for {candidate.source_id}",
                                created_at=detected_at,
                            )
                    continue

                previous_missing = (
                    previous_candidates.get(candidate.source_id) is not None
                    and previous_candidates[candidate.source_id].status == "source_missing"
                )
                next_status = candidate.status
                next_missing_detected_at = candidate.missing_detected_at
                inventory_hash = str(inventory_item["content_hash"])
                if previous_missing:
                    restored_source_ids.append(candidate.source_id)
                    next_missing_detected_at = None
                    previous_candidate = previous_candidates[candidate.source_id]
                    if previous_candidate.last_compiled_at is None:
                        next_status = "queued"
                    elif previous_candidate.content_hash != inventory_hash:
                        next_status = "stale"
                    else:
                        next_status = "compiled"

                elif candidate.status == "compiled" and candidate.content_hash != inventory_hash:
                    next_status = "stale"

                if (
                    previous_missing
                    or next_status != candidate.status
                    or candidate.content_hash != inventory_hash
                    or candidate.updated_at != str(inventory_item["updated_at"])
                ):
                    conn.execute(
                        """
                        UPDATE knowledge_source_candidates
                        SET source_kind = ?, notebook_ref_json = ?, title = ?, summary = ?,
                            content_hash = ?, status = ?, missing_detected_at = ?, updated_at = ?
                        WHERE source_id = ?
                        """,
                        (
                            str(inventory_item["source_kind"]),
                            json.dumps(dict(inventory_item["notebook_ref"]), ensure_ascii=False),
                            str(inventory_item["title"]),
                            str(inventory_item["summary"]),
                            inventory_hash,
                            next_status,
                            next_missing_detected_at,
                            str(inventory_item["updated_at"]),
                            candidate.source_id,
                        ),
                    )

        return KnowledgeSourceReconciliationResult(
            checked_source_ids=checked_source_ids,
            source_missing_ids=source_missing_ids,
            restored_source_ids=restored_source_ids,
            archived_page_ids=[],
            reactivated_page_ids=[],
            detected_at=detected_at,
        )

    def list_candidates(self) -> list[KnowledgeSourceCandidate]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT * FROM knowledge_source_candidates
                ORDER BY updated_at DESC, created_at DESC
                """
            ).fetchall()
        return [self._row_to_candidate(row) for row in rows]

    def get_candidate(self, source_id: str) -> KnowledgeSourceCandidate:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM knowledge_source_candidates WHERE source_id = ?",
                (source_id,),
            ).fetchone()
        if row is None:
            raise FileNotFoundError(f"Knowledge source candidate not found: {source_id}")
        return self._row_to_candidate(row)

    def mark_compiled(self, source_id: str, *, compiled_at: str) -> KnowledgeSourceCandidate:
        return self.set_status(
            source_id,
            status="compiled",
            last_compiled_at=compiled_at,
            compile_error=None,
        )

    def record_enqueue(
        self,
        source_id: str,
        *,
        enqueued_at: str,
        job_id: str | None = None,
    ) -> KnowledgeSourceCandidate:
        with self._connect() as conn:
            current = conn.execute(
                "SELECT * FROM knowledge_source_candidates WHERE source_id = ?",
                (source_id,),
            ).fetchone()
            if current is None:
                raise FileNotFoundError(f"Knowledge source candidate not found: {source_id}")
            conn.execute(
                """
                UPDATE knowledge_source_candidates
                SET enqueued_at = ?, last_job_id = COALESCE(?, last_job_id),
                    updated_at = ?, status = CASE
                        WHEN status = 'compiled' THEN status
                        WHEN status = 'source_missing' THEN status
                        ELSE 'queued'
                    END,
                    compile_error = NULL
                WHERE source_id = ?
                """,
                (enqueued_at, job_id, enqueued_at, source_id),
            )
        return self.get_candidate(source_id)

    def set_status(
        self,
        source_id: str,
        *,
        status: str,
        last_compiled_at: str | None = None,
        compile_error: str | None = None,
        last_job_id: str | None = None,
    ) -> KnowledgeSourceCandidate:
        updated_at = utcnow_z()
        with self._connect() as conn:
            current = conn.execute(
                "SELECT * FROM knowledge_source_candidates WHERE source_id = ?",
                (source_id,),
            ).fetchone()
            if current is None:
                raise FileNotFoundError(f"Knowledge source candidate not found: {source_id}")
            conn.execute(
                """
                UPDATE knowledge_source_candidates
                SET status = ?,
                    last_compiled_at = COALESCE(?, last_compiled_at),
                    last_job_id = COALESCE(?, last_job_id),
                    compile_error = ?,
                    missing_detected_at = CASE
                        WHEN ? = 'source_missing' THEN COALESCE(missing_detected_at, ?)
                        ELSE NULL
                    END,
                    updated_at = ?
                WHERE source_id = ?
                """,
                (
                    status,
                    last_compiled_at,
                    last_job_id,
                    compile_error,
                    status,
                    updated_at,
                    updated_at,
                    source_id,
                ),
            )
        return self.get_candidate(source_id)
