import json

from nion.config.app_config import reset_app_config
from nion.config.extensions_config import reset_extensions_config
from nion.tools.builtins.control_plane_tools import (
    get_recent_logs_tool,
    get_runtime_status_tool,
    run_doctor_tool,
    update_config_tool,
)


def test_runtime_status_tool_returns_control_plane_summary(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None
    reset_app_config()
    result = get_runtime_status_tool.invoke({})
    payload = json.loads(result)
    assert payload["status"] == "healthy"
    assert "Daemon control plane available" in payload["summary"]


def test_recent_logs_tool_returns_json(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None
    result = get_recent_logs_tool.invoke({"limit": 5})
    payload = json.loads(result)
    assert isinstance(payload, list)


def test_run_doctor_tool_returns_summary(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None
    reset_app_config()
    result = run_doctor_tool.invoke({})
    payload = json.loads(result)
    assert payload["status"] == "healthy"


def test_update_config_tool_updates_daemon_section(monkeypatch, tmp_path):
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    extensions_path.write_text('{"mcpServers": {}, "skills": {}}', encoding="utf-8")
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    monkeypatch.setenv("NION_CONFIG_DB_PATH", str(db_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    import nion.config.paths as paths_module

    paths_module._paths = None
    reset_app_config()
    reset_extensions_config()

    result = update_config_tool.invoke({"daemon_config": {"allow_background_running": True}})
    payload = json.loads(result)

    assert payload["ok"] is True
