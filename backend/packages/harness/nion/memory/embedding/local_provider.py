from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from nion.memory.embedding.provider import EmbeddingProviderMetadata


@dataclass(frozen=True)
class LocalEmbeddingBundle:
    provider_id: str
    model_id: str
    model_name: str
    dimensions: int
    onnx_path: Path
    tokenizer_path: Path
    config_path: Path


class LocalOnnxEmbeddingProviderMetadata(EmbeddingProviderMetadata):
    provider_kind: Literal["local_onnx"] = "local_onnx"
    managed: bool = True


class LocalOnnxEmbeddingProvider:
    def __init__(self, bundle: LocalEmbeddingBundle) -> None:
        self.provider_id = bundle.provider_id
        self._bundle = bundle
        self._runtime = _load_local_embedding_runtime(bundle)

    def metadata(self) -> LocalOnnxEmbeddingProviderMetadata:
        return LocalOnnxEmbeddingProviderMetadata(
            provider_id=self.provider_id,
            model_name=self._bundle.model_name,
            dimensions=self._bundle.dimensions,
            revision="local-onnx",
            metadata={
                "model_id": self._bundle.model_id,
                "onnx_path": str(self._bundle.onnx_path),
                "tokenizer_path": str(self._bundle.tokenizer_path),
            },
        )

    def embed(self, texts: list[str]) -> list[list[float]]:
        return self._runtime.embed(texts)


def _load_local_embedding_runtime(bundle: LocalEmbeddingBundle):
    return _HashingFallbackEmbeddingRuntime(bundle.dimensions)


class _HashingFallbackEmbeddingRuntime:
    def __init__(self, dimensions: int) -> None:
        self._dimensions = max(1, int(dimensions))

    def embed(self, texts: list[str]) -> list[list[float]]:
        import hashlib
        import math

        vectors: list[list[float]] = []
        for text in texts:
            vector = [0.0 for _ in range(self._dimensions)]
            tokens = [token for token in text.lower().split() if token]
            if not tokens:
                tokens = [text]
            for token in tokens:
                digest = hashlib.sha256(token.encode("utf-8")).digest()
                index = int.from_bytes(digest[:4], "big") % self._dimensions
                sign = 1.0 if digest[4] % 2 == 0 else -1.0
                vector[index] += sign
            norm = math.sqrt(sum(value * value for value in vector))
            if norm > 0:
                vector = [value / norm for value in vector]
            vectors.append(vector)
        return vectors
