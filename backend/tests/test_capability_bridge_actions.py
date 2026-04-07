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
