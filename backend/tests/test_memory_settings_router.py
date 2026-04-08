from __future__ import annotations

import json

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.gateway.routers import memory_settings
from nion.config.paths import get_paths, reset_paths
from nion.memory.embedding.local_managed import LocalManagedEmbeddingProviderMetadata


def test_memory_settings_router_returns_embedding_snapshot(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    paths = get_paths()
    paths.memory_os_vector_dir.mkdir(parents=True, exist_ok=True)
    (paths.memory_os_vector_dir / "manifest.json").write_text(
        json.dumps({"downloaded": True, "artifact_count": 3}),
        encoding="utf-8",
    )

    provider = LocalManagedEmbeddingProviderMetadata(
        provider_id="local-default",
        model_name="bge-m3",
        dimensions=1024,
        revision="2026-04-09",
        metadata={"bundle": "desktop"},
    )

    payload = memory_settings.read_memory_settings_snapshot(
        paths=paths,
        provider=provider,
    )

    assert payload["provider_mode"] == {
        "id": "local_managed",
        "label": "本机推荐",
        "description": "优先使用桌面托管 embedding，兼顾离线可用性与默认体验。",
    }
    assert payload["download_status"] == {
        "state": "ready",
        "detail": "检测到本地 embedding 资产，可直接用于索引与检索。",
    }
    assert payload["active_fingerprint"] == {
        "provider_key": "local_managed:local-default",
        "model_key": "bge-m3",
        "fingerprint": provider.fingerprint.fingerprint,
        "dimensions": 1024,
        "distance_metric": "cosine",
        "revision": "2026-04-09",
    }
    assert payload["index_health"] == {
        "state": "ready",
        "detail": "向量索引目录已就绪，可复用当前 embedding 快照。",
        "vector_path": str(paths.memory_os_vector_dir),
        "artifact_count": 3,
    }


def test_memory_settings_router_is_read_only(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    app = FastAPI()
    app.include_router(memory_settings.router)

    with TestClient(app) as client:
        response = client.post("/api/memory/settings", json={})

    assert response.status_code == 405


def test_memory_settings_router_exposes_get_endpoint() -> None:
    app = FastAPI()
    app.include_router(memory_settings.router)

    routes = {route.path for route in app.routes}

    assert "/api/memory/settings" in routes
