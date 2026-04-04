from __future__ import annotations

from .context_pack import MemoryContextPack, MemoryContextPackItem
from .repository import MemoryOSRepository


class MemoryOSContextAssembler:
    def __init__(self, repository: MemoryOSRepository) -> None:
        self._repository = repository

    def build_prompt_memory_pack(self) -> MemoryContextPack:
        items: list[MemoryContextPackItem] = []
        for domain, title in (
            ("relationship", "互动边界"),
            ("user_model", "用户画像"),
            ("procedure", "服务方法"),
        ):
            for row in self._repository.list_memory_records(domain=domain, status="active"):
                items.append(
                    MemoryContextPackItem(
                        source_kind=domain,
                        title=title,
                        content=str(row["summary"]),
                    )
                )
        return MemoryContextPack(items=items)

    def build_continuity_memory_pack(self) -> MemoryContextPack:
        items: list[MemoryContextPackItem] = []
        for row in self._repository.list_memory_records(domain="procedure", status="active"):
            items.append(
                MemoryContextPackItem(
                    source_kind="procedure",
                    title="相关长期方法",
                    content=str(row["summary"]),
                )
            )
        for row in self._repository.list_memory_records(domain="user_model", status="active"):
            items.append(
                MemoryContextPackItem(
                    source_kind="user_model",
                    title="相关长期画像",
                    content=str(row["summary"]),
                )
            )
        return MemoryContextPack(items=items)
