from __future__ import annotations

import json

from nion.config.app_config import get_app_config, reset_app_config
from nion.config.config_repository import ConfigRepository
from nion.config.extensions_config import reset_extensions_config


def _write_extensions_config(path) -> None:
    path.write_text(json.dumps({"mcpServers": {}, "skills": {}}), encoding="utf-8")


def _configure_store(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    _write_extensions_config(extensions_path)
    monkeypatch.delenv("NION_CONFIG_PATH", raising=False)
    monkeypatch.setenv("NION_CONFIG_DB_PATH", str(db_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    reset_app_config()
    reset_extensions_config()


def test_search_settings_state_maps_supported_providers(monkeypatch, tmp_path):
    _configure_store(monkeypatch, tmp_path)

    try:
        repository = ConfigRepository()
        config, version, _ = repository.read()
        config["tool_groups"] = [{"name": "web"}]
        config["tools"] = [
            {
                "name": "web_search",
                "group": "web",
                "use": "nion.community.tavily.tools:web_search_tool",
                "api_key": "tvly_test",
                "max_results": 7,
            },
            {
                "name": "web_fetch",
                "group": "web",
                "use": "nion.community.jina_ai.tools:web_fetch_tool",
                "timeout": 15,
            },
            {
                "name": "image_search",
                "group": "web",
                "use": "nion.community.image_search.tools:image_search_tool",
                "max_results": 8,
            },
        ]
        repository.write_with_warnings(config_dict=config, expected_version=version)

        loaded = get_app_config()
        web_search = loaded.get_search_tool_state("web_search")
        web_fetch = loaded.get_search_tool_state("web_fetch")
        image_search = loaded.get_search_tool_state("image_search")

        assert web_search["enabled"] is True
        assert web_search["supported"] is True
        assert web_search["provider_id"] == "tavily"
        assert web_search["config"] == {"api_key": "tvly_test", "max_results": 7}
        assert len(web_search["available_providers"]) == 2

        assert web_fetch["enabled"] is True
        assert web_fetch["supported"] is True
        assert web_fetch["provider_id"] == "jina_ai"
        assert web_fetch["config"] == {"timeout": 15}
        assert len(web_fetch["available_providers"]) == 3

        assert image_search["enabled"] is True
        assert image_search["supported"] is True
        assert image_search["provider_id"] == "duckduckgo"
        assert image_search["config"] == {"max_results": 8}
        assert len(image_search["available_providers"]) == 1
    finally:
        reset_app_config()
        reset_extensions_config()


def test_search_settings_state_marks_unknown_provider_as_unsupported(monkeypatch, tmp_path):
    _configure_store(monkeypatch, tmp_path)

    try:
        repository = ConfigRepository()
        config, version, _ = repository.read()
        config["tool_groups"] = [{"name": "web"}]
        config["tools"] = [
            {
                "name": "web_search",
                "group": "web",
                "use": "nion.community.infoquest.tools:web_search_tool",
                "search_time_range": 30,
            },
        ]
        repository.write_with_warnings(config_dict=config, expected_version=version)

        loaded = get_app_config()
        web_search = loaded.get_search_tool_state("web_search")

        assert web_search["enabled"] is True
        assert web_search["supported"] is False
        assert web_search["provider_id"] is None
        assert web_search["use"] == "nion.community.infoquest.tools:web_search_tool"
        assert web_search["config"] == {"search_time_range": 30}
        assert [item["id"] for item in web_search["available_providers"]] == [
            "tavily",
            "firecrawl",
        ]
    finally:
        reset_app_config()
        reset_extensions_config()
