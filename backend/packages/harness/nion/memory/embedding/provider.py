from __future__ import annotations

from typing import Any, Literal, Protocol, runtime_checkable

from pydantic import BaseModel, Field

from .models import EmbeddingModelFingerprint, VectorIndexSnapshot

EmbeddingProviderKind = Literal[
    "remote_managed",
    "custom_compatible",
]


class EmbeddingProviderMetadata(BaseModel):
    provider_id: str
    provider_kind: EmbeddingProviderKind
    managed: bool
    model_name: str
    dimensions: int
    distance_metric: str = "cosine"
    revision: str | None = None
    display_name: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    def fingerprint_metadata(self) -> dict[str, Any]:
        return dict(self.metadata)

    @property
    def fingerprint(self) -> EmbeddingModelFingerprint:
        return EmbeddingModelFingerprint(
            provider_key=f"{self.provider_kind}:{self.provider_id}",
            model_key=self.model_name,
            dimensions=self.dimensions,
            distance_metric=self.distance_metric,
            revision=self.revision,
            display_name=self.display_name,
            metadata=self.fingerprint_metadata(),
        )

    def to_index_snapshot(self) -> VectorIndexSnapshot:
        return VectorIndexSnapshot(
            provider_id=self.provider_id,
            provider_kind=self.provider_kind,
            fingerprint=self.fingerprint,
            metadata=self.fingerprint_metadata(),
        )


@runtime_checkable
class EmbeddingProvider(Protocol):
    provider_id: str

    def metadata(self) -> EmbeddingProviderMetadata:
        ...

    def embed(self, texts: list[str]) -> list[list[float]]:
        ...
