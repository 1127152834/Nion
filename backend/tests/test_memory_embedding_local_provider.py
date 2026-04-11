from __future__ import annotations

import json
from pathlib import Path

from nion.memory.embedding.local_provider import LocalManagedEmbeddingProvider


def test_local_provider_prepares_model_cache_and_embeds_texts(
    monkeypatch,
    tmp_path: Path,
) -> None:
    calls: dict[str, object] = {}

    class _FakeSentenceTransformer:
        def __init__(self, model_id: str, *, cache_folder: str) -> None:
            calls["model_id"] = model_id
            calls["cache_folder"] = cache_folder

        def get_sentence_embedding_dimension(self) -> int:
            return 3

        def encode(self, texts: list[str], *, normalize_embeddings: bool):
            calls["texts"] = texts
            calls["normalize_embeddings"] = normalize_embeddings
            return [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]

    monkeypatch.setattr(
        "nion.memory.embedding.local_provider._get_sentence_transformer_class",
        lambda: _FakeSentenceTransformer,
    )

    provider = LocalManagedEmbeddingProvider(
        base_dir=tmp_path,
        model_id="BAAI/bge-m3",
        cache_key="bge-m3",
    )

    vectors = provider.embed(["财务 BP", "经营分析"])

    assert vectors == [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]
    assert calls == {
        "model_id": "BAAI/bge-m3",
        "cache_folder": str(
            tmp_path / "memory-os" / "indexes" / "vector" / "models" / "bge-m3"
        ),
        "texts": ["财务 BP", "经营分析"],
        "normalize_embeddings": True,
    }
    assert (tmp_path / "memory-os" / "indexes" / "vector" / "models" / "bge-m3").exists()


def test_local_provider_metadata_uses_loaded_model_dimensions(
    monkeypatch,
    tmp_path: Path,
) -> None:
    class _FakeSentenceTransformer:
        def __init__(self, model_id: str, *, cache_folder: str) -> None:
            self.model_id = model_id
            self.cache_folder = cache_folder

        def get_sentence_embedding_dimension(self) -> int:
            return 384

        def encode(self, texts: list[str], *, normalize_embeddings: bool):
            return [[0.1, 0.2, 0.3, 0.4] for _ in texts]

    monkeypatch.setattr(
        "nion.memory.embedding.local_provider._get_sentence_transformer_class",
        lambda: _FakeSentenceTransformer,
    )

    provider = LocalManagedEmbeddingProvider(
        base_dir=tmp_path,
        model_id="sentence-transformers/all-MiniLM-L6-v2",
        cache_key="all-minilm-l6-v2",
    )

    provider.embed(["预算协同岗位"])

    metadata = provider.metadata()

    assert metadata.dimensions == 384


def test_local_provider_metadata_reads_cached_dimensions_without_loading_model(
    monkeypatch,
    tmp_path: Path,
) -> None:
    model_dir = (
        tmp_path / "memory-os" / "indexes" / "vector" / "models" / "all-minilm-l6-v2"
    )
    model_dir.mkdir(parents=True, exist_ok=True)
    (model_dir / "provider-metadata.json").write_text(
        json.dumps({"dimensions": 384}),
        encoding="utf-8",
    )

    monkeypatch.setattr(
        "nion.memory.embedding.local_provider._get_sentence_transformer_class",
        lambda: (_ for _ in ()).throw(AssertionError("model should not be loaded")),
    )

    provider = LocalManagedEmbeddingProvider(
        base_dir=tmp_path,
        model_id="sentence-transformers/all-MiniLM-L6-v2",
        cache_key="all-minilm-l6-v2",
    )

    metadata = provider.metadata()

    assert metadata.dimensions == 384
