from __future__ import annotations

from typing import Literal

from .provider import EmbeddingProviderMetadata


class LocalManagedEmbeddingProviderMetadata(EmbeddingProviderMetadata):
    provider_kind: Literal["local_managed"] = "local_managed"
    managed: bool = True
