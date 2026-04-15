from __future__ import annotations

from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.config.paths import reset_paths


def test_memory_settings_router_returns_projection_only(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        response = client.get("/api/memory/settings")

    assert response.status_code == 200
    assert response.json() == {
        "retrieval_status": {
            "vector_enabled": True,
            "reranker_enabled": True,
            "detail": "检索模型配置已迁移到模型管理中的检索模型中心。",
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


def test_memory_settings_router_rejects_patch_and_redirects_to_retrieval_models_center(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        response = client.patch(
            "/api/memory/settings",
            json={"remote_model_name": "text-embedding-3-large"},
        )

    assert response.status_code == 409
    assert "检索模型中心" in response.json()["detail"]


def test_memory_settings_router_rejects_download_and_rebuild_actions(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        download = client.post("/api/memory/settings/download")
        rebuild = client.post("/api/memory/settings/rebuild")

    assert download.status_code == 409
    assert "检索模型中心" in download.json()["detail"]
    assert rebuild.status_code == 409
    assert "检索模型中心" in rebuild.json()["detail"]
