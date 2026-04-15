from __future__ import annotations

from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.config.paths import reset_paths


def test_memory_settings_router_supports_patch_download_and_rebuild(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    monkeypatch.setattr(
        "app.gateway.routers.memory_settings.MemoryEmbeddingDownloadManager",
        lambda: _StubDownloadManager(),
    )
    monkeypatch.setattr(
        "app.gateway.routers.memory_settings.MemoryEmbeddingIndexService",
        _StubIndexService,
    )

    with TestClient(create_app()) as client:
        patch = client.patch(
            "/api/memory/settings",
            json={
                "mode": "remote_managed",
                "remote_endpoint": "https://api.example.com/v1/embeddings",
                "remote_api_key": "secret",
                "remote_model_name": "text-embedding-3-large",
                "remote_dimensions": 3072,
            },
        )
        download = client.post("/api/memory/settings/download")
        rebuild = client.post("/api/memory/settings/rebuild")
        read_back = client.get("/api/memory/settings")

    assert patch.status_code == 200
    assert patch.json()["provider_mode"]["id"] == "remote_managed"
    assert patch.json()["remote_config"] == {
        "endpoint": "https://api.example.com/v1/embeddings",
        "api_key_configured": True,
        "model_name": "text-embedding-3-large",
        "dimensions": 3072,
    }
    assert download.status_code == 200
    assert download.json()["action"] == "download"
    assert rebuild.status_code == 200
    assert rebuild.json()["job"]["state"] == "completed"
    assert rebuild.json()["job"]["record_count"] == 3
    assert read_back.status_code == 200
    assert read_back.json()["index_health"]["record_count"] == 3
    assert read_back.json()["download_status"]["progress"]["percent"] >= 0


class _StubDownloadManager:
    def ensure_local_model(self, *, base_dir, model_id: str, model_key: str):
        model_dir = base_dir / "memory-os" / "indexes" / "vector" / "models" / model_key
        model_dir.mkdir(parents=True, exist_ok=True)
        return model_dir


class _StubIndexService:
    def __init__(self, *, base_dir, repository, settings) -> None:
        self._base_dir = base_dir

    def rebuild_full_index(self):
        manifest_path = self._base_dir / "memory-os" / "indexes" / "vector" / "manifest.json"
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        manifest = {
            "provider": {
                "provider_key": "remote_managed:remote-default",
                "model_key": "text-embedding-3-large",
                "fingerprint": "fp-remote",
                "dimensions": 3072,
                "distance_metric": "cosine",
                "revision": "2026-04-11",
            },
            "provider_kind": "remote_managed",
            "provider_id": "remote-default",
            "record_count": 3,
            "rebuilt_at": "2026-04-11T00:00:00Z",
        }
        manifest_path.write_text(__import__("json").dumps(manifest), encoding="utf-8")
        return {
            "record_count": 3,
            "manifest": manifest,
        }
