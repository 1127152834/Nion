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

    # Apply timeout override from the Config Center (lazy import to avoid circular deps)
    from nion.config.subagents_config import get_subagents_app_config

    app_config = get_subagents_app_config()
    effective_timeout = app_config.get_timeout_for(name)
    if effective_timeout != config.timeout_seconds:
        logger.debug(f"Subagent '{name}': timeout overridden by Config Center ({config.timeout_seconds}s -> {effective_timeout}s)")
        config = replace(config, timeout_seconds=effective_timeout)

    return config


def list_subagents() -> list[SubagentConfig]:
    """List all available subagent configurations (with Config Center overrides applied).

    Returns:
        List of all registered SubagentConfig instances.
    """
    return [get_subagent_config(name) for name in BUILTIN_SUBAGENTS]


def get_subagent_names() -> list[str]:
    """Get all available subagent names.

    Returns:
        List of subagent names.
    """
    return list(BUILTIN_SUBAGENTS.keys())


def get_available_subagent_names() -> list[str]:
    """Get subagent names that should be exposed to the active runtime."""

    names = list(BUILTIN_SUBAGENTS.keys())
    try:
        host_bash_allowed = is_host_bash_allowed()
    except Exception:
        logger.debug("Could not determine host bash availability; exposing all built-in subagents")
        return names

    if not host_bash_allowed:
        names = [name for name in names if name != "bash"]
    return names
