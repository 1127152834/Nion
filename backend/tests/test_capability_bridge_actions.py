from unittest.mock import patch

from nion.capability_bridge_actions import build_capability_bridge_actions, execute_capability_bridge_action


def test_bridge_actions_cover_notebook_memory_and_workspace_archive():
    actions = build_capability_bridge_actions()
    ids = [item["id"] for item in actions]
    assert ids == [
        "bridge:notebook-to-memory",
        "bridge:workspace-to-notebook",
        "bridge:skill-to-agent-runtime",
    ]


def test_execute_capability_bridge_action_rejects_unknown_action():
    result = execute_capability_bridge_action("bridge:unknown", {})

    assert result == {
        "ok": False,
        "error": "Unknown bridge action: bridge:unknown",
    }


def test_notebook_to_memory_bridge_does_not_use_legacy_memory_updater():
    with (
        patch("nion.capability_bridge_actions.NotebookService.read_note") as read_note,
        patch("nion.capability_bridge_actions.create_memory_os_fact") as memory_os_create,
    ):
        read_note.return_value = type(
            "Note",
            (),
            {"note_id": "note_1", "title": "测试笔记", "body": "长期稳定偏好"},
        )()
        memory_os_create.return_value = {
            "version": "2.0",
            "facts": [{"id": "fact_1"}],
        }

        result = execute_capability_bridge_action(
            "bridge:notebook-to-memory",
            {"note_id": "note_1", "instruction": "提炼"},
        )

    memory_os_create.assert_called_once()
    assert result["bridge_action"] == "bridge:notebook-to-memory"
