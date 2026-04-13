from __future__ import annotations

from pydantic import BaseModel, Field


class RuntimeMemorySections(BaseModel):
    user_identity_profile: str | None = None
    core_identity: str | None = None
    speech_style: str | None = None
    values_and_boundaries: str | None = None
    relationship_stance: str | None = None
    adaptive_overlay: str | None = None
    active_memory_document: str | None = None
    hot_memories: list[str] = Field(default_factory=list)
    relevant_procedures: list[str] = Field(default_factory=list)
    scoped_recall: list[str] = Field(default_factory=list)
    verbatim_evidence: list[str] = Field(default_factory=list)

    @classmethod
    def empty(cls) -> RuntimeMemorySections:
        return cls()


class RuntimeMemoryResult(BaseModel):
    query: str
    thread_id: str
    sections: RuntimeMemorySections = Field(default_factory=RuntimeMemorySections.empty)
    gated: bool = False
    gating_reason: str | None = None

    @classmethod
    def empty(
        cls,
        *,
        query: str,
        thread_id: str,
        gating_reason: str = "memory_read_disabled",
    ) -> RuntimeMemoryResult:
        return cls(
            query=query,
            thread_id=thread_id,
            sections=RuntimeMemorySections.empty(),
            gated=True,
            gating_reason=gating_reason,
        )
