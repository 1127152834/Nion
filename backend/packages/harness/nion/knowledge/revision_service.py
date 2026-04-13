from __future__ import annotations

import sqlite3
from pathlib import Path
from uuid import uuid4

from pydantic import BaseModel

from nion.knowledge.paths import get_knowledge_paths


class KnowledgeRevisionRequest(BaseModel):
    request_id: str
    page_id: str
    request_type: str
    instruction: str
    optional_source_refs: list[str]
    status: str
    created_at: str


class KnowledgeRevisionService:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._paths = get_knowledge_paths(base_dir=base_dir)
        self._paths.ensure_knowledge_dirs()
        self._db_path = self._paths.knowledge_meta_dir / "revision_requests.sqlite3"
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS knowledge_revision_requests (
                    request_id TEXT PRIMARY KEY,
                    page_id TEXT NOT NULL,
                    request_type TEXT NOT NULL,
                    instruction TEXT NOT NULL,
                    optional_source_refs_json TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )

    def _load(self, request_id: str) -> KnowledgeRevisionRequest:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM knowledge_revision_requests WHERE request_id = ?",
                (request_id,),
            ).fetchone()
        if row is None:
            raise FileNotFoundError(f"Knowledge revision request not found: {request_id}")
        return KnowledgeRevisionRequest(
            request_id=str(row["request_id"]),
            page_id=str(row["page_id"]),
            request_type=str(row["request_type"]),
            instruction=str(row["instruction"]),
            optional_source_refs=[],
            status=str(row["status"]),
            created_at=str(row["created_at"]),
        )

    def create_request(
        self,
        *,
        page_id: str,
        request_type: str,
        instruction: str,
        optional_source_refs: list[str],
    ) -> KnowledgeRevisionRequest:
        request_id = f"revision_{uuid4().hex}"
        created_at = "2026-04-13T00:00:00Z"
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO knowledge_revision_requests(
                    request_id, page_id, request_type, instruction, optional_source_refs_json, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (request_id, page_id, request_type, instruction, "[]", "open", created_at),
            )
        return self._load(request_id)

    def mark_previewed(self, request_id: str) -> KnowledgeRevisionRequest:
        with self._connect() as conn:
            conn.execute(
                "UPDATE knowledge_revision_requests SET status = 'previewed' WHERE request_id = ?",
                (request_id,),
            )
        return self._load(request_id)

    def close_request(self, request_id: str) -> KnowledgeRevisionRequest:
        with self._connect() as conn:
            conn.execute(
                "UPDATE knowledge_revision_requests SET status = 'closed' WHERE request_id = ?",
                (request_id,),
            )
        return self._load(request_id)

    def apply_request(self, request_id: str) -> KnowledgeRevisionRequest:
        with self._connect() as conn:
            conn.execute(
                "UPDATE knowledge_revision_requests SET status = 'applied' WHERE request_id = ?",
                (request_id,),
            )
        return self._load(request_id)
