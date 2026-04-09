from __future__ import annotations

from typing import Literal

from .provider import EmbeddingProviderMetadata


class RemoteManagedEmbeddingProviderMetadata(EmbeddingProviderMetadata):
    provider_kind: Literal["remote_managed"] = "remote_managed"
    managed: bool = True
    endpoint: str

    def fingerprint_metadata(self) -> dict[str, object]:
        payload = dict(self.metadata)
        payload["endpoint"] = self.endpoint
        return payload
