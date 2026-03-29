"""Configuration for ACP-compatible external agents."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ACPAgentConfig(BaseModel):
    """Configuration for a single ACP adapter."""

    command: str
    args: list[str] = Field(default_factory=list)
    description: str = ""
    model: str | None = None
    auto_approve_permissions: bool = False
    env: dict[str, str] = Field(default_factory=dict)


_acp_agents: dict[str, ACPAgentConfig] = {}


def get_acp_agents() -> dict[str, ACPAgentConfig]:
    """Return the currently loaded ACP agent configurations."""

    return _acp_agents


def load_acp_config_from_dict(config_dict: dict[str, dict] | None) -> None:
    """Load ACP agent configuration from a dictionary payload."""

    global _acp_agents
    _acp_agents = {
      name: ACPAgentConfig(**payload)
      for name, payload in (config_dict or {}).items()
      if isinstance(payload, dict)
    }
