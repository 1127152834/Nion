from __future__ import annotations

from pathlib import Path

from nion.memory.search_fusion.vector_search import search_vector_memory
from nion.memory_os.repository import MemoryOSRepository


class StructuredMemorySearchService:
    def __init__(self, *, base_dir: Path, repository: MemoryOSRepository) -> None:
        self._base_dir = Path(base_dir)
        self._repository = repository

    def search(self, *, query: str, domain: str, limit: int) -> list[str]:
        records = self._repository.list_memory_records(domain=domain, status="active")
        by_id = {
            str(row["memory_id"]): str(row["summary"]).strip()
            for row in records
            if str(row.get("summary", "")).strip()
        }
        vector_hits = search_vector_memory(
            base_dir=self._base_dir,
            query=query,
            filters={"domain": domain},
            limit=limit,
        )
        if vector_hits:
            return [
                by_id[hit.candidate_id]
                for hit in vector_hits
                if hit.candidate_id in by_id
            ][:limit]

        normalized_query = query.strip().lower()
        tokens = [token for token in normalized_query.split() if token]
        matches: list[str] = []
        for summary in by_id.values():
            haystack = summary.lower()
            if normalized_query and normalized_query in haystack:
                matches.append(summary)
                continue
            if any(token in haystack for token in tokens if len(token) >= 2):
                matches.append(summary)
        return matches[:limit]


def search_structured_memory(
    *,
    base_dir: Path,
    repository: MemoryOSRepository,
    query: str,
    domain: str,
    limit: int,
) -> list[str]:
    return StructuredMemorySearchService(
        base_dir=base_dir,
        repository=repository,
    ).search(query=query, domain=domain, limit=limit)
