from nion.config.app_config import AppConfig
from nion.config.daemon_config import DaemonConfig


def test_app_config_exposes_daemon_settings() -> None:
    config = AppConfig.model_validate(
        {
            "models": [],
            "tools": [],
            "tool_groups": [],
            "sandbox": {"use": "nion.sandbox.local:LocalSandboxProvider"},
            "daemon": {"allow_background_running": True},
            "extensions": {"mcpServers": {}, "skills": {}},
        }
    )
    defaulted = AppConfig.model_validate(
        {
            "models": [],
            "tools": [],
            "tool_groups": [],
            "sandbox": {"use": "nion.sandbox.local:LocalSandboxProvider"},
            "daemon": {},
            "extensions": {"mcpServers": {}, "skills": {}},
        }
    )

    assert config.daemon.allow_background_running is True
    assert defaulted.daemon.allow_background_running is False
    assert config.daemon.host == "127.0.0.1"
    assert config.daemon.port == 43115
    assert defaulted.daemon.shutdown_grace_period_seconds == 3


def test_daemon_config_reads_background_running_from_env(monkeypatch) -> None:
    monkeypatch.setenv("NION_DAEMON_ALLOW_BACKGROUND_RUNNING", "1")

    config = DaemonConfig()

    assert config.allow_background_running is True
