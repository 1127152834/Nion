from __future__ import annotations

from pathlib import Path

from nion.memory.embedding.settings import EmbeddingSystemSettings
from nion.memory.embedding.settings_repository import EmbeddingSettingsRepository


def test_embedding_settings_repository_defaults_to_local_managed(tmp_path: Path) -> None:
    repo = EmbeddingSettingsRepository(tmp_path)

    settings = repo.load()

    assert settings == EmbeddingSystemSettings()


def test_embedding_settings_repository_persists_and_updates_fields(tmp_path: Path) -> None:
    repo = EmbeddingSettingsRepository(tmp_path)
    repo.save(
        EmbeddingSystemSettings(
            mode="remote_managed",
            remote_endpoint="https://api.example.com/v1/embeddings",
            remote_api_key="secret",
        )
    )

    updated = repo.update(
        {
            "remote_model_name": "text-embedding-3-large",
            "remote_dimensions": 3072,
        }
    )

    assert updated.mode == "remote_managed"
    assert updated.remote_endpoint == "https://api.example.com/v1/embeddings"
    assert updated.remote_api_key == "secret"
    assert updated.remote_model_name == "text-embedding-3-large"
    assert updated.remote_dimensions == 3072
