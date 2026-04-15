from __future__ import annotations

from pathlib import Path
from typing import Any

from nion.retrieval.models.consumer_registry import CONSUMER_REGISTRY
from nion.retrieval.models.settings_repository import RetrievalModelsSettingsRepository


def build_retrieval_models_status(*, base_dir: str | Path) -> dict[str, Any]:
    settings = RetrievalModelsSettingsRepository(base_dir=base_dir).load()
    return {
        "active_profile": settings.model_dump(mode="json")["active"],
        "consumers": [
            {**consumer, "index_state": "unknown", "rebuild_required": False}
            for consumer in CONSUMER_REGISTRY
        ],
    }
