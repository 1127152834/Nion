from nion.tool_runtime_contract.models import (
    ToolExecutionContext,
    ToolExecutionStage,
    ToolRuntimeResult,
)
from nion.tool_runtime_contract.diagnostics import project_tool_runtime_diagnostics


def test_tool_execution_context_captures_runtime_governance_inputs() -> None:
    context = ToolExecutionContext(
        thread_id="thread-1",
        surface="workspace",
        agent_name="lead_agent",
        execution_mode="host",
        selected_extensions={
            "skills": ["data-analysis"],
            "mcp_tools": ["slack.search"],
            "cli_tools": ["docker"],
        },
        session_guidance={"mode": "pro"},
    )

    assert context.thread_id == "thread-1"
    assert context.surface == "workspace"
    assert context.agent_name == "lead_agent"
    assert context.execution_mode == "host"
    assert context.selected_extensions["skills"] == ["data-analysis"]
    assert context.session_guidance["mode"] == "pro"


def test_tool_runtime_result_reuses_existing_runtime_result_model() -> None:
    approval_required = ToolRuntimeResult(
        status="approval_required",
        stage=ToolExecutionStage.PERMISSION_DECISION,
        tool_name="bash",
        tool_call_id="call-1",
        message="approval required",
    )
    denied = ToolRuntimeResult(
        status="denied",
        stage=ToolExecutionStage.PERMISSION_DECISION,
        tool_name="bash",
        tool_call_id="call-2",
        message="blocked",
    )
    failed = ToolRuntimeResult(
        status="failed",
        stage=ToolExecutionStage.POST_TOOL_USE_FAILURE_HOOK,
        tool_name="web_search",
        tool_call_id="call-3",
        payload={"reason": "network down"},
    )

    assert approval_required.status == "approval_required"
    assert approval_required.stage == ToolExecutionStage.PERMISSION_DECISION
    assert approval_required.message == "approval required"
    assert denied.status == "denied"
    assert denied.stage == ToolExecutionStage.PERMISSION_DECISION
    assert denied.message == "blocked"
    assert failed.status == "failed"
    assert failed.stage == ToolExecutionStage.POST_TOOL_USE_FAILURE_HOOK
    assert failed.payload == {"reason": "network down"}


def test_tool_execution_stage_reuses_existing_runtime_stage_vocabulary() -> None:
    assert ToolExecutionStage.LOOKUP == "lookup"
    assert ToolExecutionStage.SCHEMA_PARSE == "schema_parse"
    assert ToolExecutionStage.VALIDATE_INPUT == "validate_input"
    assert ToolExecutionStage.PRE_TOOL_USE_HOOK == "pre_tool_use_hook"
    assert ToolExecutionStage.PERMISSION_DECISION == "permission_decision"
    assert ToolExecutionStage.EXECUTE == "execute"
    assert ToolExecutionStage.POST_TOOL_USE_HOOK == "post_tool_use_hook"
    assert ToolExecutionStage.POST_TOOL_USE_FAILURE_HOOK == "post_tool_use_failure_hook"
    assert ToolExecutionStage.RESULT_NORMALIZATION == "result_normalization"
    assert ToolExecutionStage.ACTIVITY_PROJECTION == "activity_projection"


def test_tool_runtime_diagnostics_projection_is_pure_summary() -> None:
    context = ToolExecutionContext(
        thread_id="thread-1",
        surface="workspace",
        agent_name="lead_agent",
        execution_mode="sandbox",
        selected_extensions={"skills": ["data-analysis"]},
        session_guidance={"mode": "pro"},
    )
    result = ToolRuntimeResult(
        status="success",
        stage=ToolExecutionStage.EXECUTE,
        tool_name="bash",
        tool_call_id="call-1",
        message="ok",
        payload={"ok": True},
    )

    diagnostics = project_tool_runtime_diagnostics(context, result)

    assert diagnostics["thread_id"] == "thread-1"
    assert diagnostics["surface"] == "workspace"
    assert diagnostics["agent_name"] == "lead_agent"
    assert diagnostics["execution_mode"] == "sandbox"
    assert diagnostics["selected_extension_groups"] == ["skills"]
    assert diagnostics["selected_extension_count"] == 1
    assert diagnostics["session_guidance_keys"] == ["mode"]
    assert diagnostics["status"] == "success"
    assert diagnostics["stage"] == ToolExecutionStage.EXECUTE.value
    assert diagnostics["has_message"] is True
    assert diagnostics["has_payload"] is True
    assert "payload" not in diagnostics
    assert "message" not in diagnostics
    assert "selected_extensions" not in diagnostics
    assert "session_guidance" not in diagnostics


def test_tool_runtime_diagnostics_projection_preserves_runtime_status_branches() -> None:
    context = ToolExecutionContext(
        thread_id="thread-1",
        surface="workspace",
        agent_name="lead_agent",
        execution_mode="sandbox",
        selected_extensions={"skills": ["data-analysis"], "cli_tools": ["docker"]},
        session_guidance={"mode": "pro", "locale": "zh-CN"},
    )
    results = [
        ToolRuntimeResult(
            status="approval_required",
            stage=ToolExecutionStage.PERMISSION_DECISION,
            tool_name="bash",
            tool_call_id="call-1",
            message="approval required",
        ),
        ToolRuntimeResult(
            status="denied",
            stage=ToolExecutionStage.PERMISSION_DECISION,
            tool_name="bash",
            tool_call_id="call-2",
            message="blocked",
        ),
        ToolRuntimeResult(
            status="failed",
            stage=ToolExecutionStage.POST_TOOL_USE_FAILURE_HOOK,
            tool_name="web_search",
            tool_call_id="call-3",
            payload={"reason": "network down"},
        ),
    ]

    projections = [project_tool_runtime_diagnostics(context, result) for result in results]

    assert [(item["status"], item["stage"]) for item in projections] == [
        ("approval_required", ToolExecutionStage.PERMISSION_DECISION.value),
        ("denied", ToolExecutionStage.PERMISSION_DECISION.value),
        ("failed", ToolExecutionStage.POST_TOOL_USE_FAILURE_HOOK.value),
    ]
    for diagnostics in projections:
        assert diagnostics["selected_extension_groups"] == ["cli_tools", "skills"]
        assert diagnostics["selected_extension_count"] == 2
        assert diagnostics["session_guidance_keys"] == ["locale", "mode"]
        assert "payload" not in diagnostics
        assert "message" not in diagnostics
        assert "selected_extensions" not in diagnostics
        assert "session_guidance" not in diagnostics
