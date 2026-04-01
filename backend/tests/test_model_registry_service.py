from __future__ import annotations

from nion.model_management.models import (
    ModelBinding,
    ProviderInstance,
    ProviderModel,
    ProviderTemplate,
)
from nion.model_management.repository import ModelManagementRepository
from nion.model_management.service import DEFAULT_CHAT_BINDING, get_model_registry_service


def test_registry_resolves_database_binding_before_legacy(tmp_path):
    repo = ModelManagementRepository(tmp_path / "config.db")

    template = ProviderTemplate(
        code="openrouter",
        name="OpenRouter",
        category="global",
        protocol="openai-compatible",
    )
    repo.upsert_provider_template(template)

    provider = ProviderInstance(
        provider_template_id=template.id,
        kind="custom",
        display_name="OpenRouter Prod",
    )
    repo.save_provider_instance(provider)

    model = ProviderModel(
        provider_instance_id=provider.id,
        model_id="gpt-4.1",
        display_name="GPT-4.1",
        source="manual",
        is_primary=True,
        priority_order=0,
    )
    repo.save_provider_model(model)

    binding = ModelBinding(
        binding_key=DEFAULT_CHAT_BINDING,
        provider_model_id=model.id,
    )
    repo.save_binding(binding)

    service = get_model_registry_service(repo=repo)
    resolved = service.resolve_binding(DEFAULT_CHAT_BINDING)

    assert resolved.source_kind == "database"
    assert resolved.template is not None
    assert resolved.template.code == "openrouter"
    assert resolved.model.model_id == "gpt-4.1"


def test_registry_uses_provider_prefix_when_model_ids_collide(tmp_path):
    repo = ModelManagementRepository(tmp_path / "config.db")

    provider_a_template = ProviderTemplate(
        code="openrouter",
        name="OpenRouter",
        category="global",
        protocol="openai-compatible",
    )
    provider_b_template = ProviderTemplate(
        code="minimax-global",
        name="MiniMax",
        category="global",
        protocol="openai-compatible",
    )
    repo.upsert_provider_template(provider_a_template)
    repo.upsert_provider_template(provider_b_template)

    provider_a = ProviderInstance(
        provider_template_id=provider_a_template.id,
        kind="custom",
        display_name="Provider A",
    )
    provider_b = ProviderInstance(
        provider_template_id=provider_b_template.id,
        kind="custom",
        display_name="Provider B",
    )
    repo.save_provider_instance(provider_a)
    repo.save_provider_instance(provider_b)

    repo.save_provider_model(
        ProviderModel(
            provider_instance_id=provider_a.id,
            model_id="shared-model",
            display_name="Shared Model A",
            source="manual",
            is_primary=True,
            priority_order=0,
        )
    )
    repo.save_provider_model(
        ProviderModel(
            provider_instance_id=provider_b.id,
            model_id="shared-model",
            display_name="Shared Model B",
            source="manual",
            is_primary=False,
            priority_order=1,
        )
    )

    service = get_model_registry_service(repo=repo)
    runtime_names = {item.runtime_name for item in service.list_runtime_models()}

    assert runtime_names == {"openrouter:shared-model", "minimax-global:shared-model"}


def test_registry_does_not_promote_catalog_max_output_tokens_to_runtime_request_limit(tmp_path):
    repo = ModelManagementRepository(tmp_path / "config.db")

    template = ProviderTemplate(
        code="minimax-global",
        name="MiniMax",
        category="global",
        protocol="openai-compatible",
    )
    repo.upsert_provider_template(template)

    provider = ProviderInstance(
        provider_template_id=template.id,
        kind="custom",
        display_name="MiniMax Prod",
    )
    repo.save_provider_instance(provider)

    model = ProviderModel(
        provider_instance_id=provider.id,
        model_id="minimax-m2.5",
        display_name="MiniMax M2.5",
        source="discovered",
        is_primary=True,
        priority_order=0,
        context_window=196608,
        max_output_tokens=196608,
    )
    repo.save_provider_model(model)

    binding = ModelBinding(
        binding_key=DEFAULT_CHAT_BINDING,
        provider_model_id=model.id,
    )
    repo.save_binding(binding)

    service = get_model_registry_service(repo=repo)
    resolved = service.resolve_binding(DEFAULT_CHAT_BINDING)
    payload = resolved.runtime_model_config.model_dump(exclude_none=True)

    assert payload["context_window"] == 196608
    assert "max_tokens" not in payload
