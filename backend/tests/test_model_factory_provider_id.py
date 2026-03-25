from __future__ import annotations

import pytest

from nion.model_management.models import (
    ModelBinding,
    ProviderInstance,
    ProviderModel,
    ProviderTemplate,
)
from nion.model_management.repository import ModelManagementRepository
from nion.model_management.service import DEFAULT_CHAT_BINDING, get_model_registry_service


def _make_repository(tmp_path):
    return ModelManagementRepository(tmp_path / "config.db")


def test_model_registry_exposes_provider_prefixed_runtime_names_for_duplicate_models(tmp_path):
    repo = _make_repository(tmp_path)

    openrouter = ProviderTemplate(
        code="openrouter",
        name="OpenRouter",
        category="global",
        protocol="openai-compatible",
    )
    custom = ProviderTemplate(
        code="models-dev",
        name="Models.dev",
        category="global",
        protocol="openai-compatible",
    )
    repo.upsert_provider_template(openrouter)
    repo.upsert_provider_template(custom)

    provider_a = ProviderInstance(
        provider_template_id=openrouter.id,
        kind="custom",
        display_name="OpenRouter Prod",
    )
    provider_b = ProviderInstance(
        provider_template_id=custom.id,
        kind="custom",
        display_name="Models Dev",
    )
    repo.save_provider_instance(provider_a)
    repo.save_provider_instance(provider_b)

    model_a = ProviderModel(
        provider_instance_id=provider_a.id,
        model_id="shared-model",
        display_name="Shared Model A",
        source="manual",
        is_primary=True,
        priority_order=0,
    )
    model_b = ProviderModel(
        provider_instance_id=provider_b.id,
        model_id="shared-model",
        display_name="Shared Model B",
        source="manual",
        is_primary=False,
        priority_order=1,
    )
    repo.save_provider_model(model_a)
    repo.save_provider_model(model_b)
    repo.save_binding(
        ModelBinding(
            binding_key=DEFAULT_CHAT_BINDING,
            provider_model_id=model_a.id,
        )
    )

    service = get_model_registry_service(repo=repo)
    runtime_names = {item.runtime_name for item in service.list_runtime_models()}

    assert runtime_names == {"openrouter:shared-model", "models-dev:shared-model"}


def test_default_binding_prefers_database_primary_model(tmp_path):
    repo = _make_repository(tmp_path)

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

    primary = ProviderModel(
        provider_instance_id=provider.id,
        model_id="primary-model",
        display_name="Primary Model",
        source="manual",
        is_primary=True,
        priority_order=0,
    )
    fallback = ProviderModel(
        provider_instance_id=provider.id,
        model_id="fallback-model",
        display_name="Fallback Model",
        source="manual",
        is_primary=False,
        priority_order=1,
    )
    repo.save_provider_model(primary)
    repo.save_provider_model(fallback)

    service = get_model_registry_service(repo=repo)
    default_model = service.get_default_model()

    assert default_model.runtime_name == "primary-model"


def test_resolve_model_raises_for_unknown_runtime_identity(tmp_path):
    repo = _make_repository(tmp_path)
    service = get_model_registry_service(repo=repo)

    with pytest.raises(ValueError, match="not found"):
        service.resolve_model("missing-model")
