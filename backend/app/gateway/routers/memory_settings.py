from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter

from nion.config.paths import Paths, get_paths
from nion.memory.embedding.local_managed import LocalManagedEmbeddingProviderMetadata
from nion.memory.embedding.provider import EmbeddingProviderMetadata

router = APIRouter(prefix="/api/memory/settings", tags=["memory"])


def _default_provider() -> EmbeddingProviderMetadata:
    return LocalManagedEmbeddingProviderMetadata(
        provider_id="local-default",
        model_name="bge-m3",
        dimensions=1024,
        revision="2026-04-09",
        metadata={"bundle": "desktop"},
    )


def _read_manifest(path: Path) -> dict[str, Any]:
    manifest_file = path / "manifest.json"
    if not manifest_file.exists():
        return {}

    try:
        payload = json.loads(manifest_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}

    return payload if isinstance(payload, dict) else {}


def _mode_copy(provider: EmbeddingProviderMetadata) -> dict[str, str]:
    if provider.provider_kind == "remote_managed":
        return {
            "id": provider.provider_kind,
            "label": "云端增强",
            "description": "连接托管 embedding 服务，换取更高上限与更轻本地负担。",
        }
    if provider.provider_kind == "custom_compatible":
        return {
            "id": provider.provider_kind,
            "label": "高级自定义",
            "description": "接入自定义兼容端点，按团队要求维护模型与协议。",
        }
    return {
        "id": provider.provider_kind,
        "label": "本机推荐",
        "description": "优先使用桌面托管 embedding，兼顾离线可用性与默认体验。",
    }


def _download_status(path: Path, provider: EmbeddingProviderMetadata) -> dict[str, str]:
    if provider.provider_kind == "remote_managed":
        return {
            "state": "remote",
            "detail": "当前模式依赖远端 embedding 服务，不要求本地下载资产。",
        }
    if provider.provider_kind == "custom_compatible":
        return {
            "state": "custom",
            "detail": "当前模式由自定义服务托管，下载状态由外部端点自行负责。",
        }
    if (path / "manifest.json").exists():
        return {
            "state": "ready",
            "detail": "检测到本地 embedding 资产，可直接用于索引与检索。",
        }
    return {
        "state": "missing",
        "detail": "尚未检测到本地 embedding 资产，首次构建索引前需要准备模型文件。",
    }


def _index_health(path: Path, manifest: dict[str, Any]) -> dict[str, Any]:
    ready = path.exists() and any(path.iterdir())
    artifact_count = manifest.get("artifact_count")
    if not isinstance(artifact_count, int):
        artifact_count = 0

    return {
        "state": "ready" if ready else "empty",
        "detail": (
            "向量索引目录已就绪，可复用当前 embedding 快照。"
            if ready
            else "向量索引目录尚未建立或仍为空，后续构建后会显示健康状态。"
        ),
        "vector_path": str(path),
        "artifact_count": artifact_count,
    }


def read_memory_settings_snapshot(
    *,
    paths: Paths | None = None,
    provider: EmbeddingProviderMetadata | None = None,
) -> dict[str, Any]:
    resolved_paths = paths or get_paths()
    resolved_provider = provider or _default_provider()
    manifest = _read_manifest(resolved_paths.memory_os_vector_dir)
    fingerprint = resolved_provider.fingerprint

    return {
        "provider_mode": _mode_copy(resolved_provider),
        "download_status": _download_status(
            resolved_paths.memory_os_vector_dir,
            resolved_provider,
        ),
        "active_fingerprint": {
            "provider_key": fingerprint.provider_key,
            "model_key": fingerprint.model_key,
            "fingerprint": fingerprint.fingerprint,
            "dimensions": fingerprint.dimensions,
            "distance_metric": fingerprint.distance_metric,
            "revision": fingerprint.revision,
        },
        "index_health": _index_health(resolved_paths.memory_os_vector_dir, manifest),
    }


@router.get("")
async def get_memory_settings() -> dict[str, Any]:
    return read_memory_settings_snapshot()
