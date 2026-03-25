from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.config.app_config import reset_app_config
from nion.config.config_repository import ConfigRepository
from nion.config.config_store import resolve_config_db_path
from nion.config.extensions_config import reset_extensions_config
from nion.model_management import LegacyModelConfigImporter, ModelManagementRepository


def _write_extensions_config(path) -> None:
    path.write_text(json.dumps({"mcpServers": {}, "skills": {}}), encoding="utf-8")


def _configure_store(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    _write_extensions_config(extensions_path)
    monkeypatch.delenv("NION_CONFIG_PATH", raising=False)
    monkeypatch.setenv("NION_CONFIG_DB_PATH", str(db_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    monkeypatch.setenv("NION_MODEL_MANAGEMENT_SECRET", "test-secret")
    reset_app_config()
    reset_extensions_config()


def _legacy_provider_payload() -> dict:
    return {
        "id": "openai-main",
        "name": "OpenAI Main",
        "protocol": "openai-compatible",
        "use": "langchain_openai:ChatOpenAI",
        "api_key": "sk-legacy-123",
        "api_base": "https://api.openai.com/v1",
    }


def _legacy_model_payload(name: str, model: str) -> dict:
    return {
        "name": name,
        "display_name": model.upper(),
        "description": f"{model} legacy config-backed model",
        "provider_id": "openai-main",
        "use": "langchain_openai:ChatOpenAI",
        "model": model,
        "api_key": "sk-legacy-123",
        "api_base": "https://api.openai.com/v1",
        "supports_thinking": True,
        "supports_reasoning_effort": True,
        "supports_vision": True,
    }


def test_legacy_models_are_imported_once(monkeypatch, tmp_path):
    _configure_store(monkeypatch, tmp_path)

    try:
        repository = ConfigRepository()
        config, version, _ = repository.read()
        config["model_providers"] = [_legacy_provider_payload()]
        config["models"] = [
            _legacy_model_payload("legacy-default", "gpt-4.1"),
            _legacy_model_payload("legacy-backup", "gpt-4.1-mini"),
        ]
        repository.write(config, version)

        importer = LegacyModelConfigImporter(
            repo=ModelManagementRepository(resolve_config_db_path()),
        )
        result = importer.import_if_needed()
        repeated = importer.import_if_needed()

        repo = ModelManagementRepository(resolve_config_db_path())
        providers = repo.list_provider_instances()
        models = repo.list_all_provider_models()
        binding = repo.get_binding("chat.default")

        assert result.imported_providers == 1
        assert result.imported_models == 2
        assert repeated.imported_providers == 0
        assert repeated.imported_models == 0
        assert len(providers) == 1
        assert len(models) == 2
        assert providers[0].display_name == "OpenAI Main"
        assert providers[0].api_key_encrypted
        assert providers[0].api_key_encrypted != "sk-legacy-123"
        assert binding is not None
        assert binding.provider_model_id == models[0].id
    finally:
        reset_app_config()
        reset_extensions_config()


def test_models_route_imports_legacy_models_before_listing(monkeypatch, tmp_path):
    _configure_store(monkeypatch, tmp_path)

    try:
        repository = ConfigRepository()
        config, version, _ = repository.read()
        config["model_providers"] = [_legacy_provider_payload()]
        config["models"] = [_legacy_model_payload("legacy-default", "gpt-4.1")]
        repository.write(config, version)

        with TestClient(create_app()) as client:
            response = client.get("/api/models")

        repo = ModelManagementRepository(resolve_config_db_path())

        assert response.status_code == 200
        assert response.json()["models"][0]["model"] == "gpt-4.1"
        assert len(repo.list_provider_instances()) == 1
        assert len(repo.list_all_provider_models()) == 1
        assert repo.get_binding("chat.default") is not None
    finally:
        reset_app_config()
        reset_extensions_config()
