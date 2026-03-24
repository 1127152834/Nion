from dataclasses import dataclass


@dataclass(slots=True)
class ToolCatalogEntry:
    name: str
    group: str
    source: str
    policy_managed: bool = True


def build_configured_tool_catalog(config) -> dict[str, ToolCatalogEntry]:
    return {
        tool.name: ToolCatalogEntry(name=tool.name, group=tool.group, source="config")
        for tool in config.tools
    }
