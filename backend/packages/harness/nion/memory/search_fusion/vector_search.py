from __future__ import annotations

import logging
from pathlib import Path

import httpx

from nion.memory.embedding.duckdb_store import DuckDBVectorStore
from nion.memory.embedding.provider_factory import build_embedding_provider
from nion.memory.embedding.settings_repository import EmbeddingSettingsRepository
from nion.memory.embedding.vector_store import VectorStoreQuery
from nion.memory.search_fusion.models import SearchRouteHit

logger = logging.getLogger(__name__)
VECTOR_SEARCH_TIMEOUT_SECONDS = 2.0


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
    except httpx.HTTPError as exc:
        logger.warning("Vector search skipped because embedding provider request failed: %s", exc)
        return []
    except TimeoutError as exc:
        logger.warning("Vector search skipped because embedding lookup timed out: %s", exc)
        return []
    except Exception as exc:
        logger.warning("Vector search skipped because embedding lookup failed: %s", exc)
        return []
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
