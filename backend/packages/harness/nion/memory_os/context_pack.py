from __future__ import annotations

from pydantic import BaseModel, Field


class MemoryContextPackItem(BaseModel):
    source_kind: str
    title: str | None = None
    content: str


class MemoryContextPack(BaseModel):
    items: list[MemoryContextPackItem] = Field(default_factory=list)

    def to_prompt_block(self) -> str:
        if not self.items:
            return ""
        body = "\n\n".join(
            f"## {item.title}\n{item.content}" if item.title else item.content
            for item in self.items
        )
        return f"<memory_os_context>\n{body}\n</memory_os_context>"
