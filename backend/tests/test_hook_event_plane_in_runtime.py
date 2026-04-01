from nion.hooks.dispatcher import dispatch_in_runtime_hook
from nion.hooks.event_models import HookEvent, HookInput


def test_dispatch_in_runtime_hook_can_mutate_input() -> None:
    hook_input = HookInput(
        event=HookEvent.PRE_TOOL_USE,
        thread_id="thread-1",
        agent_id="agent-1",
        agent_kind="lead",
        surface="workspace",
        timestamp="2026-04-01T00:00:00Z",
        payload={"tool_name": "bash", "tool_input": {"command": "ls"}},
    )

    result = dispatch_in_runtime_hook(
        hook_input,
        handler=lambda payload: {
            "updated_input": {"command": "pwd"},
        },
    )

    assert result.updated_input == {"command": "pwd"}


def test_dispatch_in_runtime_hook_can_set_permission_and_stop() -> None:
    hook_input = HookInput(
        event=HookEvent.PERMISSION_REQUEST,
        thread_id="thread-1",
        agent_id="agent-1",
        agent_kind="lead",
        surface="workspace",
        timestamp="2026-04-01T00:00:00Z",
        payload={"tool_name": "bash"},
    )

    result = dispatch_in_runtime_hook(
        hook_input,
        handler=lambda payload: {
            "permission_behavior": "deny",
            "continue_execution": False,
            "stop_reason": "manual policy block",
        },
    )

    assert result.permission_behavior == "deny"
    assert result.continue_execution is False
    assert result.stop_reason == "manual policy block"
