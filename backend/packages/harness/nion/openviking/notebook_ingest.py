from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from nion.config.paths import Paths
from nion.notebook.service import NotebookService
from nion.openviking.chunk_store import OpenVikingChunkStore
from nion.openviking.chunker import chunk_notebook_markdown
from nion.openviking.notebook_projection import project_notebook_note
from nion.openviking.resource_store import OpenVikingResourceStore


@dataclass(frozen=True)
class NotebookIngestResult:
    notes_indexed: int


class EmbeddedNotebookIngestService:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._paths = Paths(base_dir=base_dir)
        self._paths.ensure_notebook_dirs()
        self._paths.ensure_openviking_dirs()
        self._notebook = NotebookService(base_dir=base_dir) if base_dir is not None else NotebookService()
        self.resource_store = OpenVikingResourceStore(self._paths.openviking_resources_db_file)
        self.chunk_store = OpenVikingChunkStore(self._paths.openviking_chunks_db_file)

    def reindex_all(self) -> NotebookIngestResult:
        summaries = self._notebook.list_note_summaries()
        indexed = 0
        for summary in summaries:
            self.reindex_note(summary.note_id)
            indexed += 1
        return NotebookIngestResult(notes_indexed=indexed)

    def reindex_note(self, note_id: str) -> None:
        note = self._notebook.read_note(note_id)
        resource = project_notebook_note(
            note_id=note.note_id,
            title=note.title,
            source_relative_path=note.relative_path,
            content_hash=note.content_hash,
            updated_at=note.updated_at,
        )
        self.resource_store.upsert_notebook_note(
            resource_uri=resource.resource_uri,
            note_id=resource.note_id,
            title=resource.title,
            source_relative_path=resource.source_relative_path,
            content_hash=resource.content_hash,
            updated_at=resource.updated_at,
        )
        chunks = [
            {
                "chunk_index": chunk.chunk_index,
                "text": chunk.text,
                "heading_path": chunk.heading_path,
                "char_start": chunk.char_start,
                "char_end": chunk.char_end,
            }
            for chunk in chunk_notebook_markdown(note.body)
        ]
        self.chunk_store.replace_resource_chunks(
            resource_uri=resource.resource_uri,
            note_id=note.note_id,
            title=note.title,
            source_relative_path=note.relative_path,
            updated_at=note.updated_at,
            chunks=chunks,
        )

    def search_notebook(self, query: str, limit: int = 5):
        return self.chunk_store.search(query, limit=limit)
