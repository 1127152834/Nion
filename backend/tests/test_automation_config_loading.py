from __future__ import annotations

import json

from nion.config.app_config import get_app_config, reset_app_config
from nion.config.automation_config import get_automation_config
from nion.config.config_repository import ConfigRepository
from nion.config.extensions_config import reset_extensions_config


def test_app_config_loads_automation_section_from_store(tmp_path) -> None:
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    extensions_path.write_text(json.dumps({"mcpServers": {}, "skills": {}}), encoding="utf-8")

    reset_app_config()
    reset_extensions_config()

    try:
        import os

        os.environ["NION_CONFIG_DB_PATH"] = str(db_path)
        os.environ["NION_EXTENSIONS_CONFIG_PATH"] = str(extensions_path)

        repository = ConfigRepository()
        config, version, _ = repository.read()
        config["automation"] = {
            "enabled": True,
            "storage_path": "custom-automation.db",
            "scheduler_enabled": False,
            "default_toolset_profile": "ops",
        }
        repository.write(config, version)

        app_config = get_app_config()

        assert app_config.automation.enabled is True
        assert app_config.automation.storage_path == "custom-automation.db"
        assert app_config.automation.scheduler_enabled is False
        assert get_automation_config().default_toolset_profile == "ops"
    finally:
        reset_app_config()
        reset_extensions_config()
