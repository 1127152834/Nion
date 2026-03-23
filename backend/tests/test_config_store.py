from __future__ import annotations

import pytest

from nion.config.config_store import (
    ConfigStoreNotInitializedError,
    SQLiteConfigStore,
    VersionConflictError,
)


def test_sqlite_config_store_bootstraps_minimal_default_config(tmp_path):
    db_path = tmp_path / "config.db"
    store = SQLiteConfigStore(db_path)

    with pytest.raises(ConfigStoreNotInitializedError):
        store.read_version()

    config, version, source_path = store.read()

    assert version == "1"
    assert source_path == db_path.resolve()
    assert config["models"] == []
    assert config["tools"] == []
    assert config["tool_groups"] == []
    assert config["sandbox"]["use"] == "nion.sandbox.local:LocalSandboxProvider"
    assert config["checkpointer"]["type"] == "sqlite"


def test_sqlite_config_store_write_increments_version_and_detects_conflict(tmp_path):
    store = SQLiteConfigStore(tmp_path / "config.db")
    config, version, _ = store.read()

    config["models"] = [
        {
            "name": "test-model",
            "use": "langchain_openai:ChatOpenAI",
            "model": "gpt-test",
        }
    ]

    next_version = store.write(config, expected_version=version)
    saved_config, saved_version, _ = store.read()

    assert next_version == "2"
    assert saved_version == "2"
    assert saved_config["models"][0]["name"] == "test-model"

    with pytest.raises(VersionConflictError) as exc_info:
        store.write(config, expected_version="1")

    assert exc_info.value.current_version == "2"

