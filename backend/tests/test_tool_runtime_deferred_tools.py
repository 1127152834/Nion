from nion.tools.builtins.tool_search import DeferredToolRegistry
from nion.tools.catalog import ToolCatalogEntry
from nion.tools.runtime_models import ToolExecutionTraits


def test_tool_catalog_entry_can_represent_deferred_tool_visibility() -> None:
    entry = ToolCatalogEntry(
        name="mcp__slack__send_message",
        group="mcp",
        source="mcp",
        visibility="deferred",
        execution_traits=ToolExecutionTraits(
            discoverable_only=True,
            supports_deferred_schema=True,
        ),
    )

    assert entry.visibility == "deferred"
    assert entry.execution_traits is not None
    assert entry.execution_traits.discoverable_only is True


def test_deferred_registry_entry_tracks_visibility_and_traits() -> None:
    registry = DeferredToolRegistry()

    class _Tool:
        name = "mcp__slack__send_message"
        description = "Send Slack message"

    registry.register(_Tool())
    entry = registry.entries[0]

    assert entry.visibility == "deferred"
    assert entry.execution_traits is not None
    assert entry.execution_traits.supports_deferred_schema is True
