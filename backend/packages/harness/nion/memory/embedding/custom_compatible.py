from __future__ import annotations

from typing import Literal

from .provider import EmbeddingProviderMetadata


class CustomCompatibleEmbeddingProviderMetadata(EmbeddingProviderMetadata):
    provider_kind: Literal["custom_compatible"] = "custom_compatible"
    managed: bool = False
    protocol: str
    base_url: str

    def fingerprint_metadata(self) -> dict[str, object]:
        payload = dict(self.metadata)
        payload["protocol"] = self.protocol
        payload["base_url"] = self.base_url
        return payload
