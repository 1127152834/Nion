from __future__ import annotations

from pathlib import Path

from nion.memory.embedding.duckdb_store import DuckDBVectorStore
from nion.memory.embedding.provider_factory import build_embedding_provider
from nion.memory.embedding.settings_repository import EmbeddingSettingsRepository
from nion.memory.embedding.vector_store import VectorStoreQuery
from nion.memory.search_fusion.models import SearchRouteHit


def search_vector_memory(
    *,
    base_dir: Path,
    query: str,
    filters: dict[str, object],
    limit: int,
) -> list[SearchRouteHit]:
    resolved_base_dir = Path(base_dir)
    settings = EmbeddingSettingsRepository(resolved_base_dir).load()
    try:
        provider = build_embedding_provider(base_dir=resolved_base_dir, settings=settings)
        query_vector = provider.embed([query])[0]
        store = DuckDBVectorStore(
            resolved_base_dir / "memory-os" / "indexes" / "vector" / "index.duckdb"
        )
        hits = store.search(
            VectorStoreQuery(
                vector=query_vector,
                limit=limit,
                filters=filters,
            )
        )
    except ModuleNotFoundError:
        return []
    return [
        SearchRouteHit(
            candidate_id=hit.record_id,
            route="vector",
            score=max(0.0, min(1.0, hit.score)),
        )
        for hit in hits
    ]
