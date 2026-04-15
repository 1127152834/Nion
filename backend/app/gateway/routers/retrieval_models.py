from __future__ import annotations

from fastapi import APIRouter

from nion.config.paths import get_paths
from nion.retrieval.models.status_service import build_retrieval_models_status

router = APIRouter(prefix="/api/retrieval-models", tags=["memory"])


@router.get("/status")
async def get_retrieval_models_status() -> dict[str, object]:
    payload = build_retrieval_models_status(base_dir=get_paths().base_dir)
    payload["capability"] = {
        "local_prepare_enabled": False,
        "remote_config_enabled": True,
        "test_enabled": False,
        "rebuild_enabled": False,
        "status_only": True,
    }
    return payload
