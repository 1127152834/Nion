from nion.tools.catalog import ToolCatalogEntry
from nion.tools.runtime_models import (
    ToolExecutionStage,
    ToolExecutionTraits,
    ToolRuntimeResult,
)


def test_tool_execution_traits_has_runtime_flags() -> None:
    traits = ToolExecutionTraits(
        read_only=True,
        destructive=False,
        approval_required=True,
        discoverable_only=False,
        supports_deferred_schema=True,
    )

    assert traits.read_only is True
    assert traits.approval_required is True
    assert traits.supports_deferred_schema is True


def test_tool_execution_stage_enumerates_pipeline() -> None:
    assert ToolExecutionStage.LOOKUP == "lookup"
    assert ToolExecutionStage.PERMISSION_DECISION == "permission_decision"
    assert ToolExecutionStage.RESULT_NORMALIZATION == "result_normalization"


def test_tool_runtime_result_captures_status_and_stage() -> None:
    result = ToolRuntimeResult(
        stage=ToolExecutionStage.EXECUTE,
        status="success",
        tool_name="read_file",
        tool_call_id="call-1",
        message="ok",
    )

    assert result.stage == ToolExecutionStage.EXECUTE
    assert result.status == "success"
    assert result.tool_name == "read_file"


def test_tool_catalog_entry_supports_visibility_and_traits() -> None:
    entry = ToolCatalogEntry(
        name="tool_search",
        group="runtime",
        source="builtin",
        visibility="deferred",
        execution_traits=ToolExecutionTraits(
            discoverable_only=True,
            supports_deferred_schema=True,
        ),
    )

    assert entry.visibility == "deferred"
    assert entry.execution_traits is not None
    assert entry.execution_traits.discoverable_only is True
