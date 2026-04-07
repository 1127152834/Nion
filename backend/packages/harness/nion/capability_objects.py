from __future__ import annotations

from typing import Any


def _availability(*, count: int | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"status": "available"}
    if count is not None:
        payload["count"] = count
    return payload


def _discoverability() -> dict[str, str]:
    return {
        "tool": "get_capability_catalog",
        "actions_tool": "get_capability_actions",
    }


def _action(action_id: str, label: str) -> dict[str, str]:
    return {"id": action_id, "label": label}


def _usage(kind: str) -> dict[str, str]:
    if kind == "memory":
        return {
            "use_when": "Use when the task needs stable long-term memory, recalled facts, or persistent user context.",
            "avoid_when": "Avoid treating memory as a scratchpad for transient working notes or one-off drafts.",
            "boundary": "Memory stores durable long-term facts; it is not the same as Notebook documents or temporary session context.",
        }
    if kind == "notebook":
        return {
            "use_when": "Use when the task is about the user's notes, notebook assets, or note-scoped assistant workflows.",
            "avoid_when": "Avoid assuming notebook content is already memory or auto-promoting notebook content into long-term memory.",
            "boundary": "Notebook is not memory. Notebook content only becomes memory through an explicit bridge action.",
        }
    if kind == "skill":
        return {
            "use_when": "Use when the user explicitly requested a skill or the task clearly matches a workflow package.",
            "avoid_when": "Avoid treating a skill as passive reference text or skipping activation when the workflow should run.",
            "boundary": "A skill is a workflow package, not a static resource blob.",
        }
    if kind == "mcp":
        return {
            "use_when": "Use when an enabled external capability surface clearly matches the task or the user explicitly selected it.",
            "avoid_when": "Avoid assuming MCP is the default first choice for unrelated work.",
            "boundary": "MCP is an external capability lane, not the default first choice when notebook, memory, skills, or CLI already fit.",
        }
    if kind == "agent":
        return {
            "use_when": "Use when the task is about configured agent personas, built-in assistants, or agent runtime routing.",
            "avoid_when": "Avoid confusing agent personas with skills or tool bundles.",
            "boundary": "Agents define runtime personas and entrypoints; they are distinct from skills, MCP servers, and memory.",
        }
    return {"use_when": "", "avoid_when": "", "boundary": ""}


def build_capability_objects(
    *,
    skill_count: int,
    mcp_servers: list[dict[str, Any]],
    agent_count: int,
    memory_descriptor: dict[str, Any] | None = None,
    notebook_descriptor: dict[str, Any] | None = None,
    agent_descriptors: list[dict[str, Any]] | None = None,
    skill_descriptors: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    objects: list[dict[str, Any]] = [
        {
            "id": "capability:memory",
            "kind": "memory",
            "ownership": "agent",
            "label": "Memory",
            "description": "Persistent agent memory and recalled user context",
            "surface": "runtime",
            "summary": "Persistent long-term agent memory, recalled context, and saved facts.",
            "availability": _availability(),
            "discoverability": _discoverability(),
            "actions": [],
            "details": memory_descriptor or {},
            "usage": _usage("memory"),
        },
        {
            "id": "capability:notebook",
            "kind": "notebook",
            "ownership": "user",
            "label": "Notebook",
            "description": "User-owned knowledge and work material library",
            "surface": "runtime",
            "summary": "User-owned notes, assets, and working material that remain distinct from memory.",
            "availability": _availability(),
            "discoverability": _discoverability(),
            "actions": [
                _action("bridge:notebook-to-memory", "Extract notebook content into memory"),
                _action("bridge:workspace-to-notebook", "Archive workspace artifact into notebook"),
            ],
            "details": notebook_descriptor or {},
            "usage": _usage("notebook"),
        },
    ]

    if agent_count > 0:
        objects.append(
            {
                "id": "capability:agent",
                "kind": "agent",
                "ownership": "system",
                "label": "Agent",
                "description": "Configured built-in and custom agent personas",
                "surface": "runtime",
                "count": agent_count,
                "summary": "Configured built-in and custom agent personas available in the runtime.",
                "availability": _availability(count=agent_count),
                "discoverability": _discoverability(),
                "actions": [],
                "details": agent_descriptors or [],
                "usage": _usage("agent"),
            }
        )

    if skill_count > 0:
        objects.append(
            {
                "id": "capability:skill",
                "kind": "skill",
                "ownership": "system",
                "label": "Skill",
                "description": "Executable workflow packages available to the agent",
                "surface": "runtime",
                "count": skill_count,
                "summary": "Executable workflow packages the agent can activate for specialized work.",
                "availability": _availability(count=skill_count),
                "discoverability": _discoverability(),
                "actions": [
                    _action("bridge:skill-to-agent-runtime", "Activate one skill into the current agent runtime"),
                ],
                "details": skill_descriptors or [],
                "usage": _usage("skill"),
            }
        )

    if mcp_servers:
        objects.append(
            {
                "id": "capability:mcp",
                "kind": "mcp",
                "ownership": "system",
                "label": "MCP",
                "description": "Connected external capability providers exposed through MCP",
                "surface": "runtime",
                "count": len(mcp_servers),
                "summary": "Connected MCP servers currently exposed through runtime tools.",
                "availability": _availability(count=len(mcp_servers)),
                "discoverability": _discoverability(),
                "actions": [],
                "details": mcp_servers,
                "usage": _usage("mcp"),
            }
        )

    return objects
