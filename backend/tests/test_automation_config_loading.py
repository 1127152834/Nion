from pathlib import Path
from unittest.mock import patch

import yaml

from nion.config.app_config import AppConfig, reset_app_config
from nion.config.automation_config import get_automation_config


def test_app_config_loads_automation_section(tmp_path: Path) -> None:
    config_path = tmp_path / "config.yaml"
    config_path.write_text(
        yaml.safe_dump(
            {
                "config_version": 4,
                "models": [],
                "sandbox": {"use": "nion.sandbox.local:LocalSandboxProvider"},
                "automation": {
                    "enabled": True,
                    "storage_path": "custom-automation.db",
                    "scheduler_enabled": False,
                    "default_toolset_profile": "ops",
                },
            }
        ),
        encoding="utf-8",
    )
    extensions_path = tmp_path / "extensions_config.json"
    extensions_path.write_text('{"mcpServers": {}, "skills": {}}', encoding="utf-8")

    reset_app_config()
    with patch("nion.config.extensions_config.ExtensionsConfig.resolve_config_path", return_value=extensions_path):
        app_config = AppConfig.from_file(str(config_path))

    assert app_config.automation.enabled is True
    assert app_config.automation.storage_path == "custom-automation.db"
    assert app_config.automation.scheduler_enabled is False
    assert get_automation_config().default_toolset_profile == "ops"
