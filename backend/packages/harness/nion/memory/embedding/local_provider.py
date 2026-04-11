from __future__ import annotations

from pathlib import Path
from typing import Any

from nion.memory.embedding.local_model_metadata import (
    read_local_model_dimensions,
    resolve_sentence_embedding_dimensions,
    write_local_model_metadata,
)
from nion.memory.embedding.local_managed import LocalManagedEmbeddingProviderMetadata


def _get_sentence_transformer_class() -> type[Any]:
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer


class LocalManagedEmbeddingProvider:
    provider_id = "local-default"
    _KNOWN_DIMENSIONS = {
        "BAAI/bge-m3": 1024,
        "bge-m3": 1024,
    }

    def __init__(self, *, base_dir: Path, model_id: str, cache_key: str) -> None:
        self._base_dir = Path(base_dir)
        self._model_id = model_id
        self._cache_key = cache_key
        self._model_dir = (
            self._base_dir / "memory-os" / "indexes" / "vector" / "models" / cache_key
        )
        self._model: Any | None = None
        self._dimensions: int | None = None

    def metadata(self) -> LocalManagedEmbeddingProviderMetadata:
        return LocalManagedEmbeddingProviderMetadata(
            provider_id=self.provider_id,
            model_name=self._cache_key,
            dimensions=self._resolved_dimensions(),
            revision="2026-04-11",
            metadata={"model_id": self._model_id, "bundle": "downloaded"},
        )

    def _ensure_model(self) -> Any:
        if self._model is None:
            self._model_dir.mkdir(parents=True, exist_ok=True)
            model_cls = _get_sentence_transformer_class()
            self._model = model_cls(
                self._model_id,
                cache_folder=str(self._model_dir),
            )
            self._dimensions = resolve_sentence_embedding_dimensions(self._model)
            write_local_model_metadata(self._model_dir, dimensions=self._dimensions)
        return self._model

    def _resolved_dimensions(self) -> int:
        if self._dimensions is not None:
            return self._dimensions
        cached_dimensions = read_local_model_dimensions(self._model_dir)
        if cached_dimensions is not None:
            self._dimensions = cached_dimensions
            return cached_dimensions
        return self._KNOWN_DIMENSIONS.get(self._model_id, 1024)

    def embed(self, texts: list[str]) -> list[list[float]]:
        vectors = self._ensure_model().encode(texts, normalize_embeddings=True)
        return [list(map(float, row)) for row in vectors]
