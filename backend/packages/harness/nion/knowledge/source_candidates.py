from __future__ import annotations

import hashlib
import json
import sqlite3
from pathlib import Path

from nion.knowledge.models import KnowledgeSourceCandidate
from nion.knowledge.paths import get_knowledge_paths
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
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    last_compiled_at TEXT,
                    compile_error TEXT
                )
                """
            )

    def _row_to_candidate(self, row: sqlite3.Row) -> KnowledgeSourceCandidate:
        return KnowledgeSourceCandidate(
            source_id=str(row["source_id"]),
            source_kind=str(row["source_kind"]),
            notebook_ref=dict(json.loads(str(row["notebook_ref_json"]))),
            title=str(row["title"]),
            summary=str(row["summary"]),
            content_hash=str(row["content_hash"]),
            status=str(row["status"]),
            created_at=str(row["created_at"]),
            updated_at=str(row["updated_at"]),
            last_compiled_at=row["last_compiled_at"],
            compile_error=row["compile_error"],
        )

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
        with self._connect() as conn:
            existing = conn.execute(
                "SELECT * FROM knowledge_source_candidates WHERE source_id = ?",
                (source_id,),
            ).fetchone()
            if existing is None:
                status = "queued"
                last_compiled_at = None
                compile_error = None
            else:
                previous = self._row_to_candidate(existing)
                status = previous.status
                if previous.status == "compiled" and previous.content_hash != content_hash:
                    status = "stale"
                last_compiled_at = previous.last_compiled_at
                compile_error = previous.compile_error

            conn.execute(
                """
                INSERT INTO knowledge_source_candidates(
                    source_id, source_kind, notebook_ref_json, title, summary,
                    content_hash, status, created_at, updated_at, last_compiled_at, compile_error
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(source_id) DO UPDATE SET
                    source_kind = excluded.source_kind,
                    notebook_ref_json = excluded.notebook_ref_json,
                    title = excluded.title,
                    summary = excluded.summary,
                    content_hash = excluded.content_hash,
                    status = excluded.status,
                    updated_at = excluded.updated_at,
                    last_compiled_at = excluded.last_compiled_at,
                    compile_error = excluded.compile_error
                """,
                (
                    source_id,
                    source_kind,
                    json.dumps(notebook_ref, ensure_ascii=False),
                    title,
                    summary,
                    content_hash,
                    status,
                    created_at,
                    updated_at,
                    last_compiled_at,
                    compile_error,
                ),
            )
            row = conn.execute(
                "SELECT * FROM knowledge_source_candidates WHERE source_id = ?",
                (source_id,),
            ).fetchone()
        assert row is not None
        return self._row_to_candidate(row)

    def refresh_from_notebook(self, notebook: NotebookService) -> list[KnowledgeSourceCandidate]:
        for summary in notebook.list_note_summaries():
            note = notebook.read_note(summary.note_id)
            self._upsert_candidate(
                source_id=f"source:notebook_note:{note.note_id}",
                source_kind="notebook_note",
                notebook_ref={
                    "note_id": note.note_id,
                    "relative_path": note.relative_path,
                },
                title=note.title,
                summary=summary.summary,
                content_hash=note.content_hash,
                created_at=note.created_at,
                updated_at=note.updated_at,
            )

        for asset in notebook.list_assets():
            self._upsert_candidate(
                source_id=f"source:notebook_asset:{asset.asset_id}",
                source_kind="notebook_asset",
                notebook_ref={
                    "asset_id": asset.asset_id,
                    "relative_path": asset.relative_path,
                },
                title=asset.title,
                summary=asset.relative_path,
                content_hash=_hash_file(asset.absolute_path),
                created_at=asset.created_at,
                updated_at=asset.updated_at,
            )

        return self.list_candidates()

    def list_candidates(self) -> list[KnowledgeSourceCandidate]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT * FROM knowledge_source_candidates
                ORDER BY updated_at DESC, created_at DESC
                """
            ).fetchall()
        return [self._row_to_candidate(row) for row in rows]

    def mark_compiled(self, source_id: str, *, compiled_at: str) -> KnowledgeSourceCandidate:
        return self.set_status(
            source_id,
            status="compiled",
            last_compiled_at=compiled_at,
            compile_error=None,
        )

    def set_status(
        self,
        source_id: str,
        *,
        status: str,
        last_compiled_at: str | None = None,
        compile_error: str | None = None,
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
                SET status = ?, last_compiled_at = COALESCE(?, last_compiled_at),
                    compile_error = ?
                WHERE source_id = ?
                """,
                (status, last_compiled_at, compile_error, source_id),
            )
            row = conn.execute(
                "SELECT * FROM knowledge_source_candidates WHERE source_id = ?",
                (source_id,),
            ).fetchone()
        assert row is not None
        return self._row_to_candidate(row)
