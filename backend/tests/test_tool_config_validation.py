from __future__ import annotations

import json

import pytest

from nion.config.app_config import get_app_config, reset_app_config
from nion.config.config_repository import ConfigRepository, ConfigValidationError
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


def test_config_repository_round_trips_tool_groups_and_tools(monkeypatch, tmp_path):
    _configure_store(monkeypatch, tmp_path)

    try:
        repository = ConfigRepository()
        config, version, _ = repository.read()
        config["tool_groups"] = [
            {"name": "web"},
            {"name": "file:read"},
            {"name": "bash"},
        ]
        config["tools"] = [
            {
                "name": "web_search",
                "group": "web",
                "use": "nion.community.tavily.tools:web_search_tool",
                "max_results": 5,
            },
            {
                "name": "bash",
                "group": "bash",
                "use": "nion.sandbox.tools:bash_tool",
            },
        ]

        new_version, warnings = repository.write_with_warnings(
            config_dict=config,
            expected_version=version,
        )

        persisted, persisted_version, _ = repository.read()
        loaded = get_app_config()

        assert warnings == []
        assert new_version == "2"
        assert persisted_version == "2"
        assert persisted["tool_groups"][0]["name"] == "web"
        assert persisted["tools"][0]["max_results"] == 5
        assert loaded.tool_groups[0].name == "web"
        assert loaded.tools[0].name == "web_search"
        assert loaded.tools[0].model_dump(exclude_none=True)["max_results"] == 5
    finally:
        reset_app_config()
        reset_extensions_config()


@pytest.mark.parametrize(
    ("field_name", "field_value", "expected_path"),
    [
        ("tool_groups", [{"name": ""}], ["tool_groups", "0", "name"]),
        (
            "tools",
            [{"name": "", "group": "web", "use": "nion.community.tavily.tools:web_search_tool"}],
            ["tools", "0", "name"],
        ),
        (
            "tools",
            [{"name": "web_search", "group": "", "use": "nion.community.tavily.tools:web_search_tool"}],
            ["tools", "0", "group"],
        ),
        (
            "tools",
            [{"name": "web_search", "group": "web", "use": ""}],
            ["tools", "0", "use"],
        ),
    ],
)
def test_config_repository_rejects_invalid_tool_shapes(
    monkeypatch,
    tmp_path,
    field_name: str,
    field_value,
    expected_path: list[str],
):
    _configure_store(monkeypatch, tmp_path)

    try:
        repository = ConfigRepository()
        config, version, _ = repository.read()
        config[field_name] = field_value

        with pytest.raises(ConfigValidationError) as exc_info:
            repository.write_with_warnings(config_dict=config, expected_version=version)

        assert exc_info.value.errors
        assert exc_info.value.errors[0]["path"] == expected_path
    finally:
        reset_app_config()
        reset_extensions_config()
