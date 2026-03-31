from dataclasses import dataclass

from nion.tools.activity_profiles import ToolActivityProfile, get_tool_activity_profile


@dataclass(slots=True)
class ToolCatalogEntry:
    name: str
    group: str
    source: str
    policy_managed: bool = True
    activity_profile: ToolActivityProfile | None = None


def build_configured_tool_catalog(config) -> dict[str, ToolCatalogEntry]:
    return {
        tool.name: ToolCatalogEntry(
            name=tool.name,
            group=tool.group,
            source="app-config",
            activity_profile=get_tool_activity_profile(tool.name),
        )
        for tool in config.tools
    }
