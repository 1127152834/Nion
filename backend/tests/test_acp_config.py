from __future__ import annotations

from nion.config.acp_config import ACPAgentConfig
from nion.config.app_config import AppConfig
from nion.config.extensions_config import ExtensionsConfig


def test_app_config_accepts_acp_agents():
    payload = {
        "sandbox": {"use": "nion.sandbox.local:LocalSandboxProvider"},
        "acp_agents": {
            "codex": {
                "command": "npx",
                "args": ["-y", "@zed-industries/codex-acp"],
                "description": "Codex ACP adapter",
            }
        },
        "extensions": ExtensionsConfig().model_dump(),
    }

    config = AppConfig.model_validate(payload)

    assert config.acp_agents["codex"].command == "npx"


def test_acp_agent_config_keeps_env_mapping():
    config = ACPAgentConfig(
        command="npx",
        args=["-y", "@zed-industries/codex-acp"],
        description="Codex ACP adapter",
        env={"OPENAI_API_KEY": "$OPENAI_API_KEY"},
    )

    assert config.env == {"OPENAI_API_KEY": "$OPENAI_API_KEY"}
