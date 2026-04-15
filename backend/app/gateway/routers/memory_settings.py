from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter
from pydantic import BaseModel

from nion.config.paths import Paths, get_paths
from nion.memory.embedding.download_manager import MemoryEmbeddingDownloadManager
from nion.memory.embedding.index_service import MemoryEmbeddingIndexService
from nion.memory.embedding.provider_factory import build_embedding_provider
from nion.memory.embedding.settings import EmbeddingSystemSettings
from nion.memory.embedding.settings_repository import EmbeddingSettingsRepository
from nion.memory_os.compat import get_memory_os_repository

router = APIRouter(prefix="/api/memory/settings", tags=["memory"])


class MemorySettingsPatchRequest(BaseModel):
    mode: Literal["local_managed", "remote_managed"] | None = None
    local_model_id: str | None = None
    local_model_key: str | None = None
    remote_endpoint: str | None = None
    remote_api_key: str | None = None
    remote_model_name: str | None = None
    remote_dimensions: int | None = None


def _settings_repo(paths: Paths | None = None) -> EmbeddingSettingsRepository:
    resolved_paths = paths or get_paths()
    return EmbeddingSettingsRepository(resolved_paths.base_dir)


def _read_manifest(path: Path) -> dict[str, Any]:
    manifest_file = path / "manifest.json"
    if not manifest_file.exists():
        return {}
    try:
        payload = json.loads(manifest_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def _mode_copy(mode: str) -> dict[str, str]:
    if mode == "remote_managed":
        return {
            "id": "remote_managed",
            "label": "远端模式",
            "description": "连接远端 embedding 服务，适合统一模型和更轻本地负担。",
        }
    return {
        "id": "local_managed",
        "label": "本地模式",
        "description": "使用本机托管模型，适合默认可控和本地构建索引。",
    }


def _download_status(paths: Paths, settings: EmbeddingSystemSettings) -> dict[str, Any]:
    model_dir = paths.memory_os_vector_dir / "models" / settings.local_model_key
    if settings.mode == "remote_managed":
        return {
            "state": "remote",
            "detail": "当前模式使用远端 embedding 服务，不需要本地模型下载。",
            "progress": {
                "percent": 100,
                "downloaded_bytes": 0,
                "total_bytes": 0,
            },
        }
    if settings.download_detail:
        return {
            "state": settings.download_state,
            "detail": settings.download_detail,
            "progress": {
                "percent": 100 if settings.download_state == "ready" else 0,
                "downloaded_bytes": 0,
                "total_bytes": 0,
            },
        }
    if model_dir.exists():
        return {
            "state": "ready",
            "detail": "本地模型已就绪，可以直接重建向量索引。",
            "progress": {
                "percent": 100,
                "downloaded_bytes": 0,
                "total_bytes": 0,
            },
        }
    return {
        "state": "missing",
        "detail": "本地模型尚未准备好，首次构建前需要先下载。",
        "progress": {
            "percent": 0,
            "downloaded_bytes": 0,
            "total_bytes": 0,
        },
    }


def _active_fingerprint(
    provider_metadata,
    manifest: dict[str, Any],
    settings: EmbeddingSystemSettings,
) -> dict[str, Any]:
    fingerprint = manifest.get("provider")
    if isinstance(fingerprint, dict):
        return {
            "provider_key": str(fingerprint.get("provider_key", "")),
            "model_key": str(fingerprint.get("model_key", "")),
            "fingerprint": str(fingerprint.get("fingerprint", settings.active_fingerprint)),
            "dimensions": int(fingerprint.get("dimensions", 0) or 0),
            "distance_metric": str(fingerprint.get("distance_metric", "cosine")),
            "revision": fingerprint.get("revision"),
        }
    provider_fingerprint = provider_metadata.fingerprint
    return {
        "provider_key": provider_fingerprint.provider_key,
        "model_key": provider_fingerprint.model_key,
        "fingerprint": settings.active_fingerprint or provider_fingerprint.fingerprint,
        "dimensions": provider_fingerprint.dimensions,
        "distance_metric": provider_fingerprint.distance_metric,
        "revision": provider_fingerprint.revision,
    }


def _index_health(paths: Paths, settings: EmbeddingSystemSettings, manifest: dict[str, Any]) -> dict[str, Any]:
    if settings.health_detail:
        state = settings.health_state
        detail = settings.health_detail
    elif manifest:
        state = "ready"
        detail = "向量索引已就绪，可以参与长期记忆检索。"
    else:
        state = "empty"
        detail = "还没有构建向量索引。"
    return {
        "state": state,
        "detail": detail,
        "record_count": int(manifest.get("record_count", 0) or 0),
        "last_rebuild_at": manifest.get("rebuilt_at") or settings.last_rebuild_at or None,
    }


def read_memory_settings_snapshot(
    *,
    paths: Paths | None = None,
    settings: EmbeddingSystemSettings | None = None,
) -> dict[str, Any]:
    resolved_paths = paths or get_paths()
    resolved_settings = settings or _settings_repo(resolved_paths).load()
    provider = build_embedding_provider(
        base_dir=resolved_paths.base_dir,
        settings=resolved_settings,
    )
    manifest = _read_manifest(resolved_paths.memory_os_vector_dir)

    return {
        "provider_mode": _mode_copy(resolved_settings.mode),
        "download_status": _download_status(resolved_paths, resolved_settings),
        "active_fingerprint": _active_fingerprint(
            provider.metadata(),
            manifest,
            resolved_settings,
        ),
        "index_health": _index_health(resolved_paths, resolved_settings, manifest),
        "local_config": {
            "model_id": resolved_settings.local_model_id,
            "model_key": resolved_settings.local_model_key,
        },
        "remote_config": {
            "endpoint": resolved_settings.remote_endpoint,
            "api_key_configured": bool(resolved_settings.remote_api_key),
            "model_name": resolved_settings.remote_model_name,
            "dimensions": resolved_settings.remote_dimensions,
        },
    }


@router.get("")
async def get_memory_settings() -> dict[str, Any]:
    return read_memory_settings_snapshot()


@router.patch("")
async def patch_memory_settings(request: MemorySettingsPatchRequest) -> dict[str, Any]:
    repo = _settings_repo()
    settings = repo.update(request.model_dump())
    return read_memory_settings_snapshot(settings=settings)


@router.post("/download")
async def download_memory_embedding_assets() -> dict[str, Any]:
    paths = get_paths()
    repo = _settings_repo(paths)
    settings = repo.load()
    manager = MemoryEmbeddingDownloadManager()
    model_dir = manager.ensure_local_model(
        base_dir=paths.base_dir,
        model_id=settings.local_model_id,
        model_key=settings.local_model_key,
    )
    settings = repo.update(
        {
            "download_state": "ready",
            "download_detail": "本地模型已下载完成，可以开始构建索引。",
        }
    )
    provider = build_embedding_provider(base_dir=paths.base_dir, settings=settings)
    return {
        "action": "download",
        "model_dir": str(model_dir),
        "provider": provider.metadata().model_dump(mode="json"),
    }


@router.post("/rebuild")
async def rebuild_memory_vector_index() -> dict[str, Any]:
    paths = get_paths()
    settings = _settings_repo(paths).load()
    service = MemoryEmbeddingIndexService(
        base_dir=paths.base_dir,
        repository=get_memory_os_repository(),
        settings=settings,
    )
    result = service.rebuild_full_index()
    return {"action": "rebuild", "job": {"state": "completed", **result}}
