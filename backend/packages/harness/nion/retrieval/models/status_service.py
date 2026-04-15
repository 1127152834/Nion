from __future__ import annotations

from pathlib import Path
from typing import Any

from nion.retrieval.models.consumer_registry import CONSUMER_REGISTRY
from nion.retrieval.models.settings import RetrievalModelsSettings
from nion.retrieval.models.settings_repository import RetrievalModelsSettingsRepository


def build_retrieval_models_status(
    *,
    base_dir: str | Path,
    settings: RetrievalModelsSettings | None = None,
) -> dict[str, Any]:
    resolved_settings = settings or RetrievalModelsSettingsRepository(base_dir=base_dir).load()
    return {
        "active_profile": _serialize_active_profile(resolved_settings),
        "consumers": [
            {**consumer, "index_state": "unknown", "rebuild_required": False}
            for consumer in CONSUMER_REGISTRY
        ],
    }


def _serialize_active_profile(settings: RetrievalModelsSettings) -> dict[str, Any]:
    active = settings.model_dump(mode="json")["active"]
    embedding = dict(active["embedding"])
    reranker = dict(active["reranker"])

    embedding["api_key_configured"] = bool(str(embedding.pop("api_key", "")).strip())
    reranker["api_key_configured"] = bool(str(reranker.pop("api_key", "")).strip())

    return {
        "embedding": embedding,
        "reranker": reranker,
    }
