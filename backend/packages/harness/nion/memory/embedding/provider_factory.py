from __future__ import annotations

from pathlib import Path

from nion.memory.embedding.local_provider import (
    LocalEmbeddingBundle,
    LocalOnnxEmbeddingProvider,
)
from nion.memory.embedding.remote_provider import RemoteManagedEmbeddingProvider
from nion.memory.embedding.settings import EmbeddingSystemSettings


def build_embedding_provider(*, base_dir: Path, settings: EmbeddingSystemSettings):
    if settings.mode == "local_onnx":
        return LocalOnnxEmbeddingProvider(
            LocalEmbeddingBundle(
                provider_id=settings.local_model_id or "local-default",
                model_id=settings.local_model_id,
                model_name=settings.local_model_name or settings.local_model_id,
                dimensions=settings.local_dimensions,
                onnx_path=Path(settings.local_onnx_path),
                tokenizer_path=Path(settings.local_tokenizer_path),
                config_path=Path(settings.local_config_path),
            )
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
