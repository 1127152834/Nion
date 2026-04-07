from __future__ import annotations

from typing import Any

from nion.capability_objects import build_capability_objects


def build_system_capability_catalog(
    *,
    cli_tools_enabled: bool,
    skill_count: int,
    mcp_servers: list[dict[str, Any]],
    agent_count: int = 0,
    memory_descriptor: dict[str, Any] | None = None,
    notebook_descriptor: dict[str, Any] | None = None,
    agent_descriptors: list[dict[str, Any]] | None = None,
    skill_descriptors: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    capabilities: list[dict[str, Any]] = []
    categories: list[str] = []

    if cli_tools_enabled:
        categories.append("cli")
        capabilities.append({"category": "cli", "label": "CLI tool management"})

    if skill_count > 0:
        categories.append("skills")
        capabilities.append({"category": "skills", "label": "Skill execution", "count": skill_count})

    for server in mcp_servers:
        categories.append("mcp")
        capabilities.append(
            {
                "category": "mcp",
                "label": server["description"],
                "name": server["name"],
            }
        )

    return {
        "categories": list(dict.fromkeys(categories)),
        "capabilities": capabilities,
        "discoverability": {
            "catalog_tool": "get_capability_catalog",
            "actions_tool": "get_capability_actions",
            "guidance": (
                "When the user asks what capabilities, resources, or built-in system functions are available, "
                "call get_capability_catalog first. When the user needs to know which bridge actions can move or activate "
                "those capabilities, call get_capability_actions next."
            ),
        },
        "objects": build_capability_objects(
            skill_count=skill_count,
            mcp_servers=mcp_servers,
            agent_count=agent_count,
            memory_descriptor=memory_descriptor,
            notebook_descriptor=notebook_descriptor,
            agent_descriptors=agent_descriptors,
            skill_descriptors=skill_descriptors,
        ),
    }
