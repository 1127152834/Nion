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
    runtime = _try_create_onnxruntime_embedding_runtime(bundle)
    if runtime is not None:
        return runtime
    return _HashingFallbackEmbeddingRuntime(bundle.dimensions)


def _try_create_onnxruntime_embedding_runtime(bundle: LocalEmbeddingBundle):
    try:
        import numpy as np
        import onnxruntime as ort
        from transformers import AutoTokenizer
    except Exception:
        return None

    try:
        tokenizer = AutoTokenizer.from_pretrained(
            str(bundle.tokenizer_path.parent),
            local_files_only=True,
        )
        session = ort.InferenceSession(
            str(bundle.onnx_path),
            providers=["CPUExecutionProvider"],
        )
    except Exception:
        return None

    return _OnnxRuntimeEmbeddingRuntime(
        tokenizer=tokenizer,
        session=session,
        dimensions=bundle.dimensions,
        np_module=np,
    )


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


class _OnnxRuntimeEmbeddingRuntime:
    def __init__(self, *, tokenizer, session, dimensions: int, np_module) -> None:
        self._tokenizer = tokenizer
        self._session = session
        self._dimensions = dimensions
        self._np = np_module

    def embed(self, texts: list[str]) -> list[list[float]]:
        encoded = self._tokenizer(
            texts,
            padding=True,
            truncation=True,
            return_tensors="np",
        )
        inputs = {
            key: value.astype(self._np.int64)
            for key, value in encoded.items()
            if key in {item.name for item in self._session.get_inputs()}
        }
        outputs = self._session.run(None, inputs)
        if not outputs:
            raise ValueError("Local ONNX embedding runtime returned no outputs")
        hidden = outputs[0]
        mask = inputs.get("attention_mask")
        if mask is None:
            pooled = hidden.mean(axis=1)
        else:
            mask_expanded = mask[..., None]
            summed = (hidden * mask_expanded).sum(axis=1)
            counts = mask_expanded.sum(axis=1).clip(min=1)
            pooled = summed / counts
        norms = self._np.linalg.norm(pooled, axis=1, keepdims=True)
        norms = self._np.clip(norms, 1e-12, None)
        normalized = pooled / norms
        vectors = normalized.tolist()
        return [
            [float(value) for value in row[: self._dimensions]]
            for row in vectors
        ]
