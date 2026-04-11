from __future__ import annotations

from pathlib import Path
from typing import Any

from nion.memory.embedding.local_model_metadata import (
    resolve_sentence_embedding_dimensions,
    write_local_model_metadata,
)


def _get_sentence_transformer_class() -> type[Any]:
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer


class MemoryEmbeddingDownloadManager:
    def ensure_local_model(
        self,
        *,
        base_dir: Path,
        model_id: str,
        model_key: str,
    ) -> Path:
        model_dir = base_dir / "memory-os" / "indexes" / "vector" / "models" / model_key
        model_dir.mkdir(parents=True, exist_ok=True)
        model_cls = _get_sentence_transformer_class()
        model = model_cls(model_id, cache_folder=str(model_dir))
        write_local_model_metadata(
            model_dir,
            dimensions=resolve_sentence_embedding_dimensions(model),
        )
        return model_dir
