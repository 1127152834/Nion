from __future__ import annotations

import json

from nion.config.app_config import get_app_config, get_app_config_runtime_status, reset_app_config
from nion.config.config_store import create_config_store
from nion.config.extensions_config import reset_extensions_config


def test_get_app_config_bootstraps_from_store_without_yaml(monkeypatch, tmp_path):
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    extensions_path.write_text(json.dumps({"mcpServers": {}, "skills": {}}), encoding="utf-8")

    monkeypatch.delenv("NION_CONFIG_PATH", raising=False)
    monkeypatch.setenv("NION_CONFIG_DB_PATH", str(db_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    reset_app_config()
    reset_extensions_config()

    try:
        config = get_app_config()
        store = create_config_store()
        version, source_path = store.read_version()
        runtime_status = get_app_config_runtime_status(process_name="gateway")

        assert config.models == []
        assert config.sandbox.use == "nion.sandbox.local:LocalSandboxProvider"
        assert version == "1"
        assert source_path == db_path.resolve()
        assert runtime_status["store_version"] == "1"
        assert runtime_status["loaded_version"] == "1"
        assert runtime_status["source_kind"] == "sqlite"
        assert runtime_status["is_in_sync"] is True
    finally:
        reset_app_config()
        reset_extensions_config()

