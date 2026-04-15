from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from uuid import uuid4

from nion.knowledge.models import KnowledgeCompileJob
from nion.knowledge.paths import get_knowledge_paths


class KnowledgeCompileJobStore:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._paths = get_knowledge_paths(base_dir=base_dir)
        self._paths.ensure_knowledge_dirs()
        self._db_path = self._paths.knowledge_meta_dir / "compile_jobs.sqlite3"
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS knowledge_compile_jobs (
                    job_id TEXT PRIMARY KEY,
                    source_ids_json TEXT NOT NULL,
                    trigger_mode TEXT NOT NULL,
                    status TEXT NOT NULL,
                    started_at TEXT,
                    finished_at TEXT,
                    outputs_json TEXT NOT NULL,
                    error_summary TEXT
                )
                """
            )

    def _row_to_job(self, row: sqlite3.Row) -> KnowledgeCompileJob:
        return KnowledgeCompileJob(
            job_id=str(row["job_id"]),
            source_ids=list(json.loads(row["source_ids_json"])),
            trigger_mode=str(row["trigger_mode"]),
            status=str(row["status"]),
            started_at=row["started_at"],
            finished_at=row["finished_at"],
            outputs=dict(json.loads(row["outputs_json"])),
            error_summary=row["error_summary"],
        )

    def create_job(self, *, source_ids: list[str], trigger_mode: str) -> KnowledgeCompileJob:
        job_id = f"job_{uuid4().hex}"
        outputs = {
            "created_pages": [],
            "updated_pages": [],
            "contradiction_pages": [],
            "graph_rebuilt": False,
        }
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO knowledge_compile_jobs(
                    job_id, source_ids_json, trigger_mode, status, outputs_json
                ) VALUES (?, ?, ?, ?, ?)
                """,
                (job_id, json.dumps(source_ids), trigger_mode, "pending", json.dumps(outputs)),
            )
            row = conn.execute(
                "SELECT * FROM knowledge_compile_jobs WHERE job_id = ?",
                (job_id,),
            ).fetchone()
        assert row is not None
        return self._row_to_job(row)

    def update_job(
        self,
        job_id: str,
        *,
        status: str,
        outputs: dict[str, object],
        started_at: str | None = None,
        finished_at: str | None = None,
        error_summary: str | None = None,
    ) -> KnowledgeCompileJob:
        with self._connect() as conn:
            conn.execute(
                """
                UPDATE knowledge_compile_jobs
                SET status = ?, outputs_json = ?, started_at = COALESCE(?, started_at),
                    finished_at = COALESCE(?, finished_at), error_summary = ?
                WHERE job_id = ?
                """,
                (
                    status,
                    json.dumps(outputs),
                    started_at,
                    finished_at,
                    error_summary,
                    job_id,
                ),
            )
            row = conn.execute(
                "SELECT * FROM knowledge_compile_jobs WHERE job_id = ?",
                (job_id,),
            ).fetchone()
        if row is None:
            raise FileNotFoundError(f"Knowledge compile job not found: {job_id}")
        return self._row_to_job(row)

    def list_jobs(self) -> list[KnowledgeCompileJob]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM knowledge_compile_jobs ORDER BY rowid DESC"
            ).fetchall()
        return [self._row_to_job(row) for row in rows]
