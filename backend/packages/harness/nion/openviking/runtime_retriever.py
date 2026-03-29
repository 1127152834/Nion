from __future__ import annotations

from pathlib import Path

from nion.config.paths import Paths
from nion.openviking.chunk_store import OpenVikingChunkStore
from nion.openviking.context_pack import NotebookContextPack, NotebookContextPackItem


class RuntimeNotebookRetriever:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._paths = Paths(base_dir=base_dir)
        self._paths.ensure_openviking_dirs()
        self._chunk_store = OpenVikingChunkStore(self._paths.openviking_chunks_db_file)

    def search(self, query: str, limit: int = 5) -> NotebookContextPack:
        hits = self._chunk_store.search(query, limit=limit)
        return NotebookContextPack(
            items=[
                NotebookContextPackItem(
                    title=hit.title,
                    source_relative_path=hit.source_relative_path,
                    snippet=hit.snippet,
                    heading_path=hit.heading_path,
                    resource_uri=hit.resource_uri,
                    updated_at=hit.updated_at,
                )
                for hit in hits
            ]
        )
