from __future__ import annotations

import pytest

from nion.retrieval.models.settings import RetrievalModelsSettings
from nion.retrieval.models.settings_repository import (
    RetrievalModelsSettingsLoadError,
    RetrievalModelsSettingsRepository,
)


def test_retrieval_models_settings_defaults_to_single_remote_profile() -> None:
    settings = RetrievalModelsSettings()

    assert settings.active.embedding.mode == "remote_managed"
    assert settings.active.reranker.mode == "remote_managed"
    assert settings.consumer_policy.allow_per_consumer_override is False
    assert settings.consumer_policy.profile_version == 1


def test_retrieval_models_settings_repository_loads_defaults_when_missing(tmp_path) -> None:
    repository = RetrievalModelsSettingsRepository(base_dir=tmp_path)

    settings = repository.load()

    assert settings == RetrievalModelsSettings()


def test_retrieval_models_settings_repository_round_trips_saved_settings(tmp_path) -> None:
    repository = RetrievalModelsSettingsRepository(base_dir=tmp_path)
    expected = RetrievalModelsSettings()
    expected.active.embedding.endpoint = "https://api.example.com/v1/embeddings"
    expected.active.embedding.api_key = "secret"
    expected.active.embedding.model_name = "text-embedding-3-small"
    expected.active.embedding.dimensions = 1536
    expected.active.reranker.endpoint = "https://api.example.com/v1/rerank"
    expected.active.reranker.api_key = "rerank-secret"
    expected.active.reranker.model_name = "bge-reranker-base"
    expected.consumer_policy.profile_version = 2

    repository.save(expected)

    assert repository.load() == expected


def test_retrieval_models_settings_repository_raises_for_invalid_json(
    tmp_path,
) -> None:
    settings_path = tmp_path / "retrieval-models" / "settings.json"
    settings_path.parent.mkdir(parents=True, exist_ok=True)
    settings_path.write_text("{not-json", encoding="utf-8")
    repository = RetrievalModelsSettingsRepository(base_dir=tmp_path)

    with pytest.raises(RetrievalModelsSettingsLoadError):
        repository.load()


def test_retrieval_models_settings_repository_raises_for_invalid_embedding_dimensions(
    tmp_path,
) -> None:
    settings_path = tmp_path / "retrieval-models" / "settings.json"
    settings_path.parent.mkdir(parents=True, exist_ok=True)
    settings_path.write_text(
        """
        {
          "active": {
            "embedding": {
              "mode": "remote_managed",
              "dimensions": 0
            }
          }
        }
        """.strip(),
        encoding="utf-8",
    )
    repository = RetrievalModelsSettingsRepository(base_dir=tmp_path)

    with pytest.raises(RetrievalModelsSettingsLoadError):
        repository.load()


def test_retrieval_models_settings_repository_raises_for_invalid_profile_version(
    tmp_path,
) -> None:
    settings_path = tmp_path / "retrieval-models" / "settings.json"
    settings_path.parent.mkdir(parents=True, exist_ok=True)
    settings_path.write_text(
        """
        {
          "consumer_policy": {
            "profile_version": 0
          }
        }
        """.strip(),
        encoding="utf-8",
    )
    repository = RetrievalModelsSettingsRepository(base_dir=tmp_path)

    with pytest.raises(RetrievalModelsSettingsLoadError):
        repository.load()


def test_retrieval_models_settings_repository_raises_for_invalid_reranker_mode(
    tmp_path,
) -> None:
    settings_path = tmp_path / "retrieval-models" / "settings.json"
    settings_path.parent.mkdir(parents=True, exist_ok=True)
    settings_path.write_text(
        """
        {
          "active": {
            "reranker": {
              "mode": "local_managed"
            }
          }
        }
        """.strip(),
        encoding="utf-8",
    )
    repository = RetrievalModelsSettingsRepository(base_dir=tmp_path)

    with pytest.raises(RetrievalModelsSettingsLoadError):
        repository.load()
