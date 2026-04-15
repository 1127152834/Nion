from __future__ import annotations

from pathlib import Path
from typing import Any

from nion.retrieval.models.consumer_registry import CONSUMER_REGISTRY
from nion.retrieval.models.local_catalog import LOCAL_MODEL_SPECS, RECOMMENDED_PROFILES
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
        "local_models": _serialize_local_models(),
        "recommended_profiles": list(RECOMMENDED_PROFILES),
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
    embedding["display_name"] = _local_display_name(embedding.get("model_id"))
    reranker["display_name"] = _local_display_name(reranker.get("model_id"))

    return {
        "embedding": embedding,
        "reranker": reranker,
    }


def _serialize_local_models() -> dict[str, list[dict[str, Any]]]:
    payload: dict[str, list[dict[str, Any]]] = {
        "embedding": [],
        "rerank": [],
    }
    for spec in LOCAL_MODEL_SPECS:
        payload[spec.family].append(
            {
                "model_id": spec.model_id,
                "family": spec.family,
                "display_name": spec.display_name,
                "locale": spec.locale,
                "installed": False,
                "downloading": False,
            }
        )
    return payload


def _local_display_name(model_id: object) -> str | None:
    if not isinstance(model_id, str) or not model_id:
        return None
    for spec in LOCAL_MODEL_SPECS:
        if spec.model_id == model_id:
            return spec.display_name
    return None
