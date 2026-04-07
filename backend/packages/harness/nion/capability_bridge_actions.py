from __future__ import annotations

from nion.memory_os.compat import create_memory_os_fact
from nion.notebook.history import NotebookHistoryService
from nion.notebook.service import NotebookService

DEFAULT_NOTEBOOK_MEMORY_INSTRUCTION = "从这篇笔记中提炼适合长期保留的稳定记忆内容。"


def build_capability_bridge_actions() -> list[dict]:
    return [
        {
            "id": "bridge:notebook-to-memory",
            "source_kind": "notebook",
            "target_kind": "memory",
            "trigger_mode": "explicit",
            "provenance": {
                "source_kind": "notebook",
                "records_excerpt": True,
            },
        },
        {
            "id": "bridge:workspace-to-notebook",
            "source_kind": "workspace_artifact",
            "target_kind": "notebook",
            "trigger_mode": "explicit",
            "provenance": {
                "source_kind": "workspace_artifact",
                "copies_asset": True,
            },
        },
        {
            "id": "bridge:skill-to-agent-runtime",
            "source_kind": "skill",
            "target_kind": "agent_runtime",
            "trigger_mode": "explicit",
            "provenance": {
                "source_kind": "skill",
                "records_activation": True,
            },
        },
    ]


def _extract_memory_from_notebook_note(*, note_id: str, instruction: str) -> dict:
    note = NotebookService().read_note(note_id)
    memory = create_memory_os_fact(
        content=f"{instruction}\n\n标题: {note.title}\n内容: {note.body}",
        category="context",
        confidence=0.5,
        source=f"notebook:{note.note_id}",
        provenance={
            "source_kind": "notebook",
            "note_id": note.note_id,
            "instruction": instruction,
        },
    )
    memory_entry = memory["facts"][-1] if isinstance(memory.get("facts"), list) and memory["facts"] else memory
    return {
        "ok": True,
        "bridge_action": "bridge:notebook-to-memory",
        "note_id": note.note_id,
        "note_title": note.title,
        "instruction": instruction,
        "memory": memory_entry,
    }


def _archive_workspace_artifact_to_notebook(**payload) -> dict:
    asset = NotebookHistoryService().archive_asset(
        source_path=payload["artifact_path"],
        directory=payload.get("directory", ""),
        actor_type="user",
    )
    return {
        "ok": True,
        "bridge_action": "bridge:workspace-to-notebook",
        "asset": asset if isinstance(asset, dict) else asset.model_dump(),
    }


def _activate_skill_runtime(**payload) -> dict:
    from nion.tools.builtins.skill_tool import use_skill_tool

    return use_skill_tool.func(
        skill_name=payload["skill_name"],
        tool_call_id="bridge-skill-activation",
    )


def execute_capability_bridge_action(action_id: str, payload: dict) -> dict:
    if action_id == "bridge:notebook-to-memory":
        return _extract_memory_from_notebook_note(
            note_id=payload["note_id"],
            instruction=payload.get("instruction") or DEFAULT_NOTEBOOK_MEMORY_INSTRUCTION,
        )
    if action_id == "bridge:workspace-to-notebook":
        return _archive_workspace_artifact_to_notebook(**payload)
    if action_id == "bridge:skill-to-agent-runtime":
        return _activate_skill_runtime(**payload)
    return {
        "ok": False,
        "error": f"Unknown bridge action: {action_id}",
    }
