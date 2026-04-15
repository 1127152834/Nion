from nion.retrieval.models.settings import RetrievalModelsSettings


def test_retrieval_models_settings_defaults_to_single_remote_profile() -> None:
    settings = RetrievalModelsSettings()

    assert settings.active.embedding.mode == "remote_managed"
    assert settings.active.reranker.mode in {"local_managed", "remote_managed"}
    assert settings.consumer_policy.allow_per_consumer_override is False
    assert settings.consumer_policy.profile_version == 1
