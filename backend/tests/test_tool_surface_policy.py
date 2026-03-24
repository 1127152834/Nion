from types import SimpleNamespace

from nion.config.surface_policy_config import SurfacePolicyConfig, SurfaceRule
from nion.tools.catalog import ToolCatalogEntry
from nion.tools.tools import _apply_surface_policy


def test_channel_surface_drops_bash_from_policy_managed_tools():
    config = SimpleNamespace(
        surface_policy=SurfacePolicyConfig(
            rules={
                "channel": SurfaceRule(
                    allowed_groups=["web"],
                    denied_tools=["bash"],
                )
            }
        )
    )
    catalog = {
        "bash": ToolCatalogEntry(
            name="bash",
            group="bash",
            source="config",
            policy_managed=True,
        ),
        "web_search": ToolCatalogEntry(
            name="web_search",
            group="web",
            source="config",
            policy_managed=True,
        ),
    }
    tools = [
        SimpleNamespace(name="bash"),
        SimpleNamespace(name="web_search"),
        SimpleNamespace(name="ask_clarification"),
    ]

    filtered = _apply_surface_policy(config, "channel", tools, catalog)
    names = [tool.name for tool in filtered]

    assert "bash" not in names
    assert "web_search" in names
    assert "ask_clarification" in names
