from __future__ import annotations

import hashlib
import json
from typing import Any

from pydantic import BaseModel, Field, model_validator


class EmbeddingModelFingerprint(BaseModel):
    provider_key: str
    model_key: str
    dimensions: int
    distance_metric: str = "cosine"
    revision: str | None = None
    display_name: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_metadata_is_json_serializable(self) -> "EmbeddingModelFingerprint":
        self._normalize(self.metadata)
        return self

    def identity_payload(self) -> dict[str, Any]:
        return {
            "provider_key": self.provider_key,
            "model_key": self.model_key,
            "dimensions": self.dimensions,
            "distance_metric": self.distance_metric,
            "revision": self.revision,
            "metadata": self._normalize(self.metadata),
        }

    @property
    def fingerprint(self) -> str:
        payload = json.dumps(
            self.identity_payload(),
            ensure_ascii=True,
            separators=(",", ":"),
            sort_keys=True,
        )
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    @classmethod
    def _normalize(cls, value: Any) -> Any:
        if isinstance(value, dict):
            return {key: cls._normalize(value[key]) for key in sorted(value)}
        if isinstance(value, list):
            return [cls._normalize(item) for item in value]
        if isinstance(value, tuple):
            return [cls._normalize(item) for item in value]
        if value is None or isinstance(value, (str, int, float, bool)):
            return value
        raise TypeError(
            "Embedding fingerprint metadata must be JSON-serializable"
        )


class VectorIndexSnapshot(BaseModel):
    provider_id: str
    provider_kind: str
    fingerprint: EmbeddingModelFingerprint
    metadata: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_provider_identity(self) -> "VectorIndexSnapshot":
        expected_provider_key = f"{self.provider_kind}:{self.provider_id}"
        if self.fingerprint.provider_key != expected_provider_key:
            raise ValueError(
                "fingerprint.provider_key must match provider_kind/provider_id"
            )
        return self
