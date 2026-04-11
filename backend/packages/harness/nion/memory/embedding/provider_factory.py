from __future__ import annotations

from pathlib import Path

from nion.memory.embedding.local_provider import LocalManagedEmbeddingProvider
from nion.memory.embedding.remote_provider import RemoteManagedEmbeddingProvider
from nion.memory.embedding.settings import EmbeddingSystemSettings


def build_embedding_provider(*, base_dir: Path, settings: EmbeddingSystemSettings):
    if settings.mode == "local_managed":
        return LocalManagedEmbeddingProvider(
            base_dir=base_dir,
            model_id=settings.local_model_id,
            cache_key=settings.local_model_key,
        )
    if settings.mode == "remote_managed":
        return RemoteManagedEmbeddingProvider(
            provider_id="remote-default",
            endpoint=settings.remote_endpoint,
            api_key=settings.remote_api_key,
            model_name=settings.remote_model_name,
            dimensions=settings.remote_dimensions,
        )
    raise ValueError(f"Unsupported embedding mode: {settings.mode}")
