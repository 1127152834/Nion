from __future__ import annotations

from pydantic import BaseModel, Field


class NotebookContextPackItem(BaseModel):
    title: str
    source_relative_path: str
    snippet: str
    heading_path: list[str] = Field(default_factory=list)
    resource_uri: str
    updated_at: str


class NotebookContextPack(BaseModel):
    items: list[NotebookContextPackItem] = Field(default_factory=list)


def build_context_pack_markdown(items: list[NotebookContextPackItem]) -> str:
    parts: list[str] = []
    for item in items:
        heading = " / ".join(item.heading_path) if item.heading_path else "-"
        parts.append(
            "\n".join(
                [
                    f"### {item.title}",
                    f"- Path: `{item.source_relative_path}`",
                    f"- Heading: `{heading}`",
                    f"- URI: `{item.resource_uri}`",
                    f"- Updated: `{item.updated_at}`",
                    item.snippet,
                ]
            )
        )
    return "\n\n".join(parts)
