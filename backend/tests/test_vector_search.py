from __future__ import annotations

from nion.memory.embedding.settings import EmbeddingSystemSettings
from nion.memory.search_fusion.vector_search import search_vector_memory


def test_search_vector_memory_returns_hits_when_provider_and_store_succeed(
    tmp_path,
    monkeypatch,
) -> None:
    class FakeProvider:
        def embed(self, texts: list[str]) -> list[list[float]]:
            assert texts == ["偏好"]
            return [[0.1, 0.2]]

    class FakeHit:
        def __init__(self, record_id: str, score: float) -> None:
            self.record_id = record_id
            self.score = score

    class FakeStore:
        def __init__(self, path) -> None:
            self.path = path

        def search(self, query) -> list[FakeHit]:
            return [FakeHit("mem:1", 0.88)]

    monkeypatch.setattr(
        "nion.memory.search_fusion.vector_search.EmbeddingSettingsRepository.load",
        lambda self: EmbeddingSystemSettings(mode="remote_managed"),
    )
    monkeypatch.setattr(
        "nion.memory.search_fusion.vector_search.build_embedding_provider",
        lambda *, base_dir, settings: FakeProvider(),
    )
    monkeypatch.setattr(
        "nion.memory.search_fusion.vector_search.DuckDBVectorStore",
        FakeStore,
    )

    hits = search_vector_memory(
        base_dir=tmp_path,
        query="偏好",
        filters={"domain": "user_model"},
        limit=1,
    )

    assert len(hits) == 1
    assert hits[0].candidate_id == "mem:1"
    assert hits[0].route == "vector"


def test_search_vector_memory_returns_empty_when_remote_settings_are_unavailable(
    tmp_path,
    monkeypatch,
) -> None:
    class FakeProvider:
        def embed(self, texts: list[str]) -> list[list[float]]:
            raise AssertionError("provider should not be reached before local model is ready")

    monkeypatch.setattr(
        "nion.memory.search_fusion.vector_search.EmbeddingSettingsRepository.load",
        lambda self: EmbeddingSystemSettings(mode="remote_managed"),
    )
    monkeypatch.setattr(
        "nion.memory.search_fusion.vector_search.build_embedding_provider",
        lambda *, base_dir, settings: FakeProvider(),
    )

    hits = search_vector_memory(
        base_dir=tmp_path,
        query="偏好",
        filters={"domain": "user_model"},
        limit=1,
    )

    assert hits == []
