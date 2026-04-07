from __future__ import annotations

import json
from typing import Annotated

from langchain.tools import InjectedToolCallId, tool
from langchain_core.messages import ToolMessage
from langgraph.types import Command

from nion.skills.loader import load_skills


@tool("use_skill", parse_docstring=True)
def use_skill_tool(
    skill_name: str,
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command:
    """Activate one skill as the current workflow package for this turn.

    Args:
        skill_name: Skill identifier from the available skills list.
    """
    skill = next((item for item in load_skills(enabled_only=True) if item.name == skill_name), None)
    if skill is None:
        return Command(
            update={
                "messages": [
                    ToolMessage(
                        content=json.dumps(
                            {
                                "ok": False,
                                "error": f"Skill '{skill_name}' not found",
                            },
                            ensure_ascii=False,
                            indent=2,
                        ),
                        tool_call_id=tool_call_id,
                        name="use_skill",
                    )
                ]
            }
        )

    payload = {
        "ok": True,
        "skill": {
            "name": skill.name,
            "description": skill.description,
            "category": skill.category,
            "path": skill.get_container_file_path(),
        },
        "activation": {
            "instruction": "Use this skill as the active workflow for the current task. Follow the skill content before using other tools.",
            "content": skill.skill_md,
        },
    }

    return Command(
        update={
            "messages": [
                ToolMessage(
                    content=json.dumps(payload, ensure_ascii=False, indent=2),
                    tool_call_id=tool_call_id,
                    name="use_skill",
                )
            ],
        }
    )
