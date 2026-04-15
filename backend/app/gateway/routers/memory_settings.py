from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from nion.config.paths import get_paths
from nion.retrieval.models.status_service import build_retrieval_models_status

router = APIRouter(prefix="/api/memory/settings", tags=["memory"])

_COMPAT_DETAIL = "检索模型配置已迁移到模型管理中的检索模型中心。"
_ACTION_REDIRECT_DETAIL = "记忆设置中的检索配置入口已下线，请前往模型管理中的检索模型中心。"


class MemorySettingsPatchRequest(BaseModel):
    mode: str | None = None
    remote_endpoint: str | None = None
    remote_api_key: str | None = None
    remote_model_name: str | None = None
    remote_dimensions: int | None = None


def read_memory_settings_snapshot() -> dict[str, Any]:
    payload = build_retrieval_models_status(base_dir=get_paths().base_dir)
    active_profile = payload["active_profile"]
    embedding = active_profile["embedding"]
    reranker = active_profile["reranker"]
    return {
        "retrieval_status": {
            "vector_enabled": embedding["mode"] == "remote_managed",
            "reranker_enabled": reranker["mode"] in {"local_managed", "remote_managed"},
            "detail": _COMPAT_DETAIL,
        },
        "index_health": {
            "state": "unknown",
            "detail": "索引健康状态来自 retrieval models consumer projection。",
            "record_count": 0,
            "last_rebuild_at": None,
        },
        "jump_target": {
            "section": "retrievalModels",
        },
    }


def _raise_redirect_conflict() -> None:
    raise HTTPException(status_code=409, detail=_ACTION_REDIRECT_DETAIL)


@router.get("")
async def get_memory_settings() -> dict[str, Any]:
    return read_memory_settings_snapshot()


@router.patch("")
async def patch_memory_settings(_: MemorySettingsPatchRequest) -> dict[str, Any]:
    _raise_redirect_conflict()


@router.post("/download")
async def download_memory_embedding_assets() -> dict[str, Any]:
    _raise_redirect_conflict()


@router.post("/rebuild")
async def rebuild_memory_vector_index() -> dict[str, Any]:
    _raise_redirect_conflict()
