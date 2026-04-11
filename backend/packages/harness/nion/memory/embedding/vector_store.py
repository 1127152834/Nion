from __future__ import annotations

from typing import Any, Protocol, runtime_checkable

from pydantic import BaseModel, Field

from .models import VectorIndexSnapshot


class VectorStoreQuery(BaseModel):
    vector: list[float]
    limit: int = 10
    filters: dict[str, Any] = Field(default_factory=dict)


class VectorStoreRecord(BaseModel):
    record_id: str
    vector: list[float]
    payload: dict[str, Any] = Field(default_factory=dict)


class VectorStoreSearchHit(BaseModel):
    record_id: str
    score: float
    payload: dict[str, Any] = Field(default_factory=dict)


class VectorStoreIndexMetadata(BaseModel):
    provider: VectorIndexSnapshot
    record_count: int = 0
    metadata: dict[str, Any] = Field(default_factory=dict)


class VectorStoreRebuildPlan(BaseModel):
    requires_rebuild: bool
    reason: str
    authoritative_snapshot: VectorIndexSnapshot
    store_snapshot: VectorIndexSnapshot | None = None


def build_rebuild_plan(
    *,
    current: VectorIndexSnapshot | None,
    target: VectorStoreIndexMetadata,
) -> VectorStoreRebuildPlan:
    if current is None:
        return VectorStoreRebuildPlan(
            requires_rebuild=True,
            reason="missing_store_snapshot",
            authoritative_snapshot=target.provider,
            store_snapshot=None,
        )
    if current.fingerprint.fingerprint == target.provider.fingerprint.fingerprint:
        return VectorStoreRebuildPlan(
            requires_rebuild=False,
            reason="fingerprint_match",
            authoritative_snapshot=target.provider,
            store_snapshot=current,
        )
    return VectorStoreRebuildPlan(
        requires_rebuild=True,
        reason="fingerprint_changed",
        authoritative_snapshot=target.provider,
        store_snapshot=current,
    )


@runtime_checkable
class VectorStore(Protocol):
    def get_index_metadata(self) -> VectorStoreIndexMetadata | None:
        ...

    def upsert(self, records: list[VectorStoreRecord]) -> None:
        ...

    def delete(self, record_ids: list[str]) -> None:
        ...

    def search(self, query: VectorStoreQuery) -> list[VectorStoreSearchHit]:
        ...

    def rebuild(
        self,
        *,
        target: VectorStoreIndexMetadata,
        records: list[VectorStoreRecord],
    ) -> None:
        ...
