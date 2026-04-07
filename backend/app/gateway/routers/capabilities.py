from __future__ import annotations

from fastapi import APIRouter

from nion.config.agents_config import list_agent_catalog
from nion.config.extensions_config import ExtensionsConfig
from nion.notebook.service import NotebookService
from nion.skills.loader import load_skills
from nion.system_capability_catalog import build_system_capability_catalog
from nion.memory_os.compat import get_memory_os_config

router = APIRouter(prefix="/api/capabilities", tags=["capabilities"])


@router.get("/catalog")
async def get_capability_catalog() -> dict:
    try:
        extensions_config = ExtensionsConfig.from_file()
        mcp_servers = [
            {
                "name": name,
                "description": server.description.strip(),
                "type": server.type,
                "enabled": server.enabled,
            }
            for name, server in extensions_config.get_enabled_mcp_servers().items()
            if isinstance(server.description, str) and server.description.strip()
        ]
    except Exception:
        mcp_servers = []

    skills = load_skills(enabled_only=True)
    agents = list_agent_catalog()
    notebook = NotebookService()
    note_summaries = notebook.list_note_summaries()
    inbox_items = notebook.list_inbox_items()

    return build_system_capability_catalog(
        cli_tools_enabled=True,
        skill_count=len(skills),
        mcp_servers=mcp_servers,
        agent_count=len(agents),
        memory_descriptor={
            "runtime_backend": "memory_os",
            **get_memory_os_config(),
        },
        notebook_descriptor={
            "root_directory": str(notebook._paths.notebook_root_dir),
            "note_count": len(note_summaries),
            "inbox_count": len(inbox_items),
            "assistant_available": True,
        },
        agent_descriptors=[
            {
                "id": agent.id,
                "name": agent.name,
                "kind": agent.kind,
                "entrypoint": agent.entrypoint,
                "tool_policy": agent.tool_policy,
                "visibility": agent.visibility,
            }
            for agent in agents
        ],
        skill_descriptors=[
            {
                "name": skill.name,
                "category": skill.category,
                "user_invocable": getattr(skill, "user_invocable", False),
                "hooks": getattr(skill, "hooks", []) or [],
                "model": getattr(skill, "model", None),
                "effort": getattr(skill, "effort", None),
            }
            for skill in skills
        ],
    )
