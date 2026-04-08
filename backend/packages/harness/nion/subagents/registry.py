"""Subagent registry for managing available subagents."""

import logging
from dataclasses import replace

from nion.sandbox.security import is_host_bash_allowed
from nion.subagents.builtins import BUILTIN_SUBAGENTS
from nion.subagents.config import SubagentConfig

logger = logging.getLogger(__name__)


def get_subagent_config(name: str) -> SubagentConfig | None:
    """Get a subagent configuration by name, with Config Center overrides applied.

    Args:
        name: The name of the subagent.

    Returns:
        SubagentConfig if found (with any Config Center overrides applied), None otherwise.
    """
    config = BUILTIN_SUBAGENTS.get(name)
    if config is None:
        return None
    if name == "bash" and not is_host_bash_allowed():
        return None

    from nion.config.subagents_config import get_subagents_app_config

    app_config = get_subagents_app_config()
    effective_timeout = app_config.get_timeout_for(name)
    if effective_timeout != config.timeout_seconds:
        logger.debug(f"Subagent '{name}': timeout overridden by Config Center ({config.timeout_seconds}s -> {effective_timeout}s)")
        config = replace(config, timeout_seconds=effective_timeout)

    return config


def list_subagents() -> list[SubagentConfig]:
    """List all available subagent configurations (with Config Center overrides applied)."""
    return [config for name in BUILTIN_SUBAGENTS if (config := get_subagent_config(name)) is not None]


def get_subagent_names() -> list[str]:
    """Get all available subagent names."""
    return [config.name for config in list_subagents()]


def get_available_subagent_names() -> list[str]:
    """Compatibility wrapper for callers that only need visible names."""
    return get_subagent_names()
