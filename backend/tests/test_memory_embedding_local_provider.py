from __future__ import annotations

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

