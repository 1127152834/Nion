from nion.hooks.event_models import (
    HookEvent,
    HookExecutionMode,
    HookInput,
    HookResult,
)


def test_hook_event_enum_contains_runtime_backbone_events() -> None:
    assert HookEvent.SESSION_START == "session_start"
    assert HookEvent.PRE_TOOL_USE == "pre_tool_use"
    assert HookEvent.POST_TOOL_USE_FAILURE == "post_tool_use_failure"


def test_hook_execution_mode_has_in_and_out_runtime() -> None:
    assert HookExecutionMode.IN_RUNTIME == "in_runtime"
    assert HookExecutionMode.OUT_OF_RUNTIME == "out_of_runtime"


def test_hook_input_carries_payload_and_runtime_identity() -> None:
    hook_input = HookInput(
        event=HookEvent.USER_PROMPT_SUBMIT,
        thread_id="thread-1",
        agent_id="agent-1",
        agent_kind="lead",
        surface="workspace",
        timestamp="2026-04-01T00:00:00Z",
        payload={"prompt": "hello"},
    )

    assert hook_input.event == HookEvent.USER_PROMPT_SUBMIT
    assert hook_input.payload["prompt"] == "hello"


def test_hook_result_supports_permission_and_continuation_controls() -> None:
    result = HookResult(
        event=HookEvent.PRE_TOOL_USE,
        mode=HookExecutionMode.IN_RUNTIME,
        continue_execution=False,
        stop_reason="blocked by hook",
        updated_input={"command": "ls"},
        permission_behavior="deny",
        additional_context="Use safer tool",
    )

    assert result.continue_execution is False
    assert result.permission_behavior == "deny"
    assert result.updated_input == {"command": "ls"}
