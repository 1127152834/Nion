from nion.hooks.dispatcher import dispatch_out_of_runtime_hook
from nion.hooks.event_models import HookEvent, HookInput


def test_dispatch_out_of_runtime_hook_returns_side_effects_without_runtime_control() -> None:
    hook_input = HookInput(
        event=HookEvent.SESSION_END,
        thread_id="thread-1",
        agent_id=None,
        agent_kind=None,
        surface="workspace",
        timestamp="2026-04-01T00:00:00Z",
        payload={"reason": "clear"},
    )

    result = dispatch_out_of_runtime_hook(
        hook_input,
        handler=lambda payload: {
            "side_effects": {"logged": True},
            "additional_context": "ignored for model flow",
        },
    )

    assert result.mode == "out_of_runtime"
    assert result.side_effects == {"logged": True}
    assert result.continue_execution is True
