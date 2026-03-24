from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

SearchCapability = Literal["web_search", "web_fetch", "image_search"]


class ToolGroupConfig(BaseModel):
    """Config section for a tool group"""

    name: str = Field(
        ...,
        min_length=1,
        description="Unique name for the tool group",
    )
    model_config = ConfigDict(extra="allow")


class ToolConfig(BaseModel):
    """Config section for a tool"""

    name: str = Field(..., min_length=1, description="Unique name for the tool")
    group: str = Field(..., min_length=1, description="Group name for the tool")
    use: str = Field(
        ...,
        min_length=1,
        description="Variable name of the tool provider(e.g. nion.sandbox.tools:bash_tool)",
    )
    model_config = ConfigDict(extra="allow")


class SearchProviderDefinition(BaseModel):
    id: str
    capability: SearchCapability
    title: str
    description: str
    use: str
    docs_url: str | None = None
    config_fields: tuple[str, ...] = ()


SEARCH_PROVIDER_DEFINITIONS: tuple[SearchProviderDefinition, ...] = (
    SearchProviderDefinition(
        id="tavily",
        capability="web_search",
        title="Tavily",
        description="Agent-oriented web search with configurable max results.",
        use="nion.community.tavily.tools:web_search_tool",
        docs_url="https://tavily.com/",
        config_fields=("api_key", "max_results"),
    ),
    SearchProviderDefinition(
        id="firecrawl",
        capability="web_search",
        title="Firecrawl",
        description="Search via Firecrawl web search API.",
        use="nion.community.firecrawl.tools:web_search_tool",
        docs_url="https://www.firecrawl.dev/",
        config_fields=("api_key", "max_results"),
    ),
    SearchProviderDefinition(
        id="jina_ai",
        capability="web_fetch",
        title="Jina Reader",
        description="Fetch and simplify web pages through Jina Reader.",
        use="nion.community.jina_ai.tools:web_fetch_tool",
        docs_url="https://jina.ai/reader/",
        config_fields=("timeout",),
    ),
    SearchProviderDefinition(
        id="tavily",
        capability="web_fetch",
        title="Tavily Extract",
        description="Fetch page content through Tavily extract.",
        use="nion.community.tavily.tools:web_fetch_tool",
        docs_url="https://tavily.com/",
        config_fields=("api_key",),
    ),
    SearchProviderDefinition(
        id="firecrawl",
        capability="web_fetch",
        title="Firecrawl Scrape",
        description="Fetch and scrape page content through Firecrawl.",
        use="nion.community.firecrawl.tools:web_fetch_tool",
        docs_url="https://www.firecrawl.dev/",
        config_fields=("api_key",),
    ),
    SearchProviderDefinition(
        id="duckduckgo",
        capability="image_search",
        title="DuckDuckGo Images",
        description="Search reference images through DuckDuckGo.",
        use="nion.community.image_search.tools:image_search_tool",
        docs_url="https://duckduckgo.com/",
        config_fields=("max_results",),
    ),
)


def list_search_provider_definitions(
    capability: SearchCapability | None = None,
) -> list[SearchProviderDefinition]:
    if capability is None:
        return list(SEARCH_PROVIDER_DEFINITIONS)
    return [
        definition
        for definition in SEARCH_PROVIDER_DEFINITIONS
        if definition.capability == capability
    ]


def resolve_search_provider_definition(
    capability: SearchCapability,
    use_path: str | None,
) -> SearchProviderDefinition | None:
    normalized_use = (use_path or "").strip()
    if not normalized_use:
        return None
    for definition in SEARCH_PROVIDER_DEFINITIONS:
        if definition.capability == capability and definition.use == normalized_use:
            return definition
    return None
