from __future__ import annotations

import json

from langchain.tools import tool

from nion.cli_tools import CliToolsService


def _service() -> CliToolsService:
    return CliToolsService()


@tool("codepilot_cli_tools_list", parse_docstring=True)
def cli_tools_list_tool(format: str = "text") -> str:
    """List all CLI tools available on this system.

    Args:
        format: Output format. Use "json" for structured output or "text" for human-readable output.
    """
    payload = _service().list_tools(format=format)
    if isinstance(payload, str):
        return payload
    return json.dumps(payload, indent=2, ensure_ascii=False)


@tool("codepilot_cli_tools_install", parse_docstring=True)
def cli_tools_install_tool(command: str, name: str | None = None) -> str:
    """Install a CLI tool by executing a package-manager command.

    Args:
        command: Full install command, for example "brew install ffmpeg".
        name: Optional display name override for the registered tool.
    """
    return _service().install_command(command=command, name=name)


@tool("codepilot_cli_tools_add", parse_docstring=True)
def cli_tools_add_tool(
    bin_path: str | None = None,
    name: str | None = None,
    tool_id: str | None = None,
    description_zh: str | None = None,
    description_en: str | None = None,
) -> str:
    """Register an already-installed CLI tool or save a description.

    Args:
        bin_path: Absolute path to the executable when registering a tool.
        name: Optional display name when registering a tool.
        tool_id: Existing tool id when only saving a description.
        description_zh: Optional Chinese description.
        description_en: Optional English description.
    """
    return _service().add_tool(
        bin_path=bin_path,
        name=name,
        tool_id=tool_id,
        description_zh=description_zh,
        description_en=description_en,
    )


@tool("codepilot_cli_tools_remove", parse_docstring=True)
def cli_tools_remove_tool(identifier: str) -> str:
    """Remove a custom CLI tool from the library.

    Args:
        identifier: Tool id, display name, binary name, or install package identifier.
    """
    return _service().remove_tool(identifier)


@tool("codepilot_cli_tools_check_updates", parse_docstring=True)
def cli_tools_check_updates_tool() -> str:
    """Check whether registered CLI tools have package-manager updates available."""
    return _service().check_updates()


@tool("codepilot_cli_tools_update", parse_docstring=True)
def cli_tools_update_tool(identifier: str) -> str:
    """Update a registered CLI tool using its stored install metadata.

    Args:
        identifier: Tool id, display name, binary name, or install package identifier.
    """
    return _service().update_tool(identifier)
