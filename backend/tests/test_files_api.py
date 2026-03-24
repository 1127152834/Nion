import json

from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.config.app_config import reset_app_config
from nion.config.extensions_config import reset_extensions_config
from nion.config.paths import get_paths


def _write_extensions_config(path):
    path.write_text(json.dumps({"mcpServers": {}, "skills": {}}), encoding="utf-8")


def test_thread_files_tree_api_returns_workdir_files(monkeypatch, tmp_path):
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    _write_extensions_config(extensions_path)

    monkeypatch.setenv("NION_CONFIG_DB_PATH", str(db_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    monkeypatch.setenv("NION_HOME", str(tmp_path / ".nion-data"))
    reset_app_config()
    reset_extensions_config()

    try:
        paths = get_paths()
        paths.ensure_thread_dirs("thread-123")
        workdir = paths.sandbox_work_dir("thread-123")
        (workdir / "demo.txt").write_text("hello", encoding="utf-8")

        with TestClient(create_app()) as client:
            meta_response = client.get("/api/threads/thread-123/files/meta")
            assert meta_response.status_code == 200
            assert meta_response.json()["actual_root"].endswith(
                "threads/thread-123/user-data/workdir"
            )

            tree_response = client.get("/api/threads/thread-123/files/tree")
            assert tree_response.status_code == 200
            files = tree_response.json()["files"]
            assert any(item["path"].endswith("/demo.txt") for item in files)
    finally:
        reset_app_config()
        reset_extensions_config()

