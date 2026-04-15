from __future__ import annotations

import logging
from pathlib import Path

import httpx

from nion.memory.embedding.duckdb_store import DuckDBVectorStore
from nion.memory.embedding.provider_factory import build_embedding_provider
from nion.memory.embedding.settings import EmbeddingSystemSettings
from nion.memory.embedding.vector_store import VectorStoreQuery
from nion.memory.search_fusion.models import SearchRouteHit
from nion.retrieval.models.local_catalog import LOCAL_MODEL_SPECS
from nion.retrieval.models.settings_repository import RetrievalModelsSettingsRepository

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
    retrieval_settings = RetrievalModelsSettingsRepository(resolved_base_dir).load()
    settings = _runtime_settings_from_retrieval_profile(resolved_base_dir, retrieval_settings)

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


def _runtime_settings_from_retrieval_profile(base_dir: Path, retrieval_settings) -> EmbeddingSystemSettings:
    embedding = retrieval_settings.active.embedding
    if embedding.provider == "openai_compatible":
        return EmbeddingSystemSettings(
            mode="remote_managed",
            remote_endpoint=embedding.endpoint,
            remote_api_key=embedding.api_key,
            remote_model_name=embedding.model_name,
            remote_dimensions=embedding.dimensions,
        )

    spec = next(
        (item for item in LOCAL_MODEL_SPECS if item.model_id == embedding.model_id and item.family == "embedding"),
        None,
    )
    if spec is None:
        raise ValueError(f"Unknown local embedding model: {embedding.model_id}")
    model_root = base_dir / "models" / "retrieval" / "modelscope" / spec.source_model_id.replace("/", "__")
    onnx_path = model_root / spec.source_file.replace("/", "__")
    tokenizer_path = model_root / "tokenizer.json"
    config_path = model_root / "config.json"
    missing = [str(path) for path in (onnx_path, tokenizer_path, config_path) if not path.exists()]
    if missing:
        raise ValueError(
            "Local embedding assets are incomplete; vector search falls back until tokenizer/config are restored."
        )
    return EmbeddingSystemSettings(
        mode="local_onnx",
        local_model_id=spec.model_id,
        local_model_name=spec.source_model_id,
        local_dimensions=spec.dimension or 0,
        local_onnx_path=str(onnx_path),
        local_tokenizer_path=str(tokenizer_path),
        local_config_path=str(config_path),
    )
