from __future__ import annotations

import json
from pathlib import Path

from nion.memory.embedding.download_manager import MemoryEmbeddingDownloadManager


def test_download_manager_prepares_model_cache_dir(monkeypatch, tmp_path: Path) -> None:
    calls: dict[str, str] = {}

    class _FakeSentenceTransformer:
        def __init__(self, model_id: str, *, cache_folder: str) -> None:
            calls["model_id"] = model_id
            calls["cache_folder"] = cache_folder

        def get_sentence_embedding_dimension(self) -> int:
            return 384

    monkeypatch.setattr(
        "nion.memory.embedding.download_manager._get_sentence_transformer_class",
        lambda: _FakeSentenceTransformer,
    )

    manager = MemoryEmbeddingDownloadManager()
    model_dir = manager.ensure_local_model(
        base_dir=tmp_path,
        model_id="BAAI/bge-m3",
        model_key="bge-m3",
    )

    assert model_dir == tmp_path / "memory-os" / "indexes" / "vector" / "models" / "bge-m3"
    assert model_dir.exists()
    assert calls == {
        "model_id": "BAAI/bge-m3",
        "cache_folder": str(model_dir),
    }
    metadata_path = model_dir / "provider-metadata.json"
    assert metadata_path.exists()
    assert json.loads(metadata_path.read_text(encoding="utf-8")) == {
        "dimensions": 384,
    }
