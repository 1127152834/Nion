"""Configuration for A2A-compatible external agents."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class A2AAgentConfig(BaseModel):
    """Configuration for a single A2A remote agent."""

    base_url: str
    description: str = ""
    transport: Literal["auto", "jsonrpc", "http+json"] = "auto"
    streaming: bool = True
    timeout_seconds: float = Field(default=60.0, gt=0)
    poll_interval_seconds: float = Field(default=1.0, ge=0)
    max_poll_attempts: int = Field(default=30, ge=1)
    headers: dict[str, str] = Field(default_factory=dict)


_a2a_agents: dict[str, A2AAgentConfig] = {}


def get_a2a_agents() -> dict[str, A2AAgentConfig]:
    """Return the currently loaded A2A agent configurations."""

    return _a2a_agents


def load_a2a_config_from_dict(config_dict: dict[str, dict] | None) -> None:
    """Load A2A agent configuration from a dictionary payload."""

    global _a2a_agents
    _a2a_agents = {
        name: A2AAgentConfig(**payload)
        for name, payload in (config_dict or {}).items()
        if isinstance(payload, dict)
    }
