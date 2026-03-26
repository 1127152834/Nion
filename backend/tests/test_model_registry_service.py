from __future__ import annotations

from types import SimpleNamespace

from nion.config.model_config import ModelConfig
from nion.model_management import (
    ModelBinding,
    ModelManagementRepository,
    ModelRegistryService,
    ProviderInstance,
    ProviderModel,
    get_model_registry_service,
)
from nion.model_management.crypto import build_model_management_secret
from nion.model_management.seed import seed_builtin_provider_templates


def test_registry_resolves_default_chat_binding_from_database(tmp_path):
    repo = ModelManagementRepository(
        tmp_path / "config.db",
        secret_provider=lambda: build_model_management_secret("test-secret"),
    )
    seed_builtin_provider_templates(repo)
    template = repo.get_provider_template_by_code("openrouter")
    assert template is not None

    provider = repo.save_provider_instance(
        ProviderInstance(
            provider_template_id=template.id,
            kind="builtin",
            display_name="OpenRouter Main",
        ),
        api_key_plaintext="sk-test-1234",
    )
    provider_model = repo.save_provider_model(
        ProviderModel(
            provider_instance_id=provider.id,
            model_id="gpt-4.1",
            display_name="GPT-4.1",
            source="manual",
            is_primary=True,
            supports_thinking=True,
            supports_reasoning_effort=True,
            supports_vision=True,
        )
    )
    repo.save_binding(
        ModelBinding(
            binding_key="chat.default",
            provider_model_id=provider_model.id,
        )
    )

    service = ModelRegistryService(
        repo=repo,
        secret_provider=lambda: build_model_management_secret("test-secret"),
        app_config_provider=lambda: SimpleNamespace(models=[]),
    )

    runtime_models = service.list_runtime_models()
    resolved = service.resolve_binding("chat.default")
    by_identity = service.resolve_model("gpt-4.1")

    assert len(runtime_models) == 1
    assert runtime_models[0].source_kind == "database"
    assert runtime_models[0].runtime_name == "gpt-4.1"
    assert resolved.binding_key == "chat.default"
    assert resolved.provider.display_name == "OpenRouter Main"
    assert resolved.template is not None
    assert resolved.template.code == "openrouter"
    assert resolved.model.id == provider_model.id
    assert resolved.runtime_model_config.model == "gpt-4.1"
    assert resolved.runtime_model_config.use == "langchain_openai:ChatOpenAI"
    assert resolved.runtime_model_config.supports_thinking is True
    assert resolved.runtime_model_config.supports_reasoning_effort is True
    assert resolved.runtime_model_config.supports_vision is True
    assert resolved.api_key == "sk-test-1234"
    assert by_identity.model.id == provider_model.id


def test_registry_keeps_context_window_on_provider_model_but_not_runtime_config(tmp_path):
    repo = ModelManagementRepository(
        tmp_path / "config.db",
        secret_provider=lambda: build_model_management_secret("test-secret"),
    )
    seed_builtin_provider_templates(repo)
    template = repo.get_provider_template_by_code("openrouter")
    assert template is not None

    provider = repo.save_provider_instance(
        ProviderInstance(
            provider_template_id=template.id,
            kind="builtin",
            display_name="OpenRouter Main",
        ),
        api_key_plaintext="sk-test-1234",
    )
    provider_model = repo.save_provider_model(
        ProviderModel(
            provider_instance_id=provider.id,
            model_id="gpt-4.1",
            display_name="GPT-4.1",
            source="manual",
            is_primary=True,
            context_window=256000,
        )
    )

    service = ModelRegistryService(
        repo=repo,
        secret_provider=lambda: build_model_management_secret("test-secret"),
        app_config_provider=lambda: SimpleNamespace(models=[]),
    )

    resolved = service.resolve_model("gpt-4.1")
    runtime_payload = resolved.runtime_model_config.model_dump(exclude_none=True)

    assert resolved.model.id == provider_model.id
    assert resolved.model.context_window == 256000
    assert "context_window" not in runtime_payload


def test_registry_uses_prefixed_runtime_name_when_model_ids_collide(tmp_path):
    repo = ModelManagementRepository(tmp_path / "config.db")
    seed_builtin_provider_templates(repo)

    openrouter = repo.get_provider_template_by_code("openrouter")
    openai = repo.get_provider_template_by_code("minimax-global")
    assert openrouter is not None
    assert openai is not None

    provider_a = repo.save_provider_instance(
        ProviderInstance(
            provider_template_id=openrouter.id,
            kind="builtin",
            display_name="Provider A",
        )
    )
    provider_b = repo.save_provider_instance(
        ProviderInstance(
            provider_template_id=openai.id,
            kind="builtin",
            display_name="Provider B",
        )
    )

    repo.save_provider_model(
        ProviderModel(
            provider_instance_id=provider_a.id,
            model_id="shared-model",
            display_name="Shared Model A",
            source="manual",
        )
    )
    repo.save_provider_model(
        ProviderModel(
            provider_instance_id=provider_b.id,
            model_id="shared-model",
            display_name="Shared Model B",
            source="manual",
        )
    )

    service = ModelRegistryService(
        repo=repo,
        app_config_provider=lambda: SimpleNamespace(models=[]),
    )

    runtime_names = {item.runtime_name for item in service.list_runtime_models()}

    assert runtime_names == {"openrouter:shared-model", "minimax-global:shared-model"}
    assert service.resolve_model("openrouter:shared-model").provider.id == provider_a.id
    assert (
        service.resolve_model("minimax-global:shared-model").provider.id
        == provider_b.id
    )


def test_registry_falls_back_to_legacy_models_when_database_is_empty(tmp_path):
    legacy_model = ModelConfig(
        name="legacy-default",
        display_name="Legacy Default",
        description="Legacy config-backed model",
        use="langchain_openai:ChatOpenAI",
        model="gpt-legacy",
        supports_thinking=True,
        supports_reasoning_effort=False,
        supports_vision=True,
    )
    fake_app_config = SimpleNamespace(models=[legacy_model])

    service = get_model_registry_service(
        repo=ModelManagementRepository(tmp_path / "config.db"),
        app_config_provider=lambda: fake_app_config,
        secret_provider=lambda: build_model_management_secret("test-secret"),
    )

    runtime_models = service.list_runtime_models()
    resolved = service.resolve_binding("chat.default")
    by_identity = service.resolve_model("legacy-default")

    assert len(runtime_models) == 1
    assert runtime_models[0].source_kind == "legacy"
    assert runtime_models[0].runtime_name == "legacy-default"
    assert resolved.binding_key == "chat.default"
    assert resolved.runtime_model_config.model == "gpt-legacy"
    assert resolved.runtime_model_config.use == "langchain_openai:ChatOpenAI"
    assert resolved.provider.id == "legacy-provider::legacy-default"
    assert by_identity.runtime_name == "legacy-default"
