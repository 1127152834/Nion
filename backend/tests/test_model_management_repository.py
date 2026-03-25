from __future__ import annotations

from nion.model_management.models import (
    ModelBinding,
    ProviderInstance,
    ProviderModel,
    ProviderTemplate,
    ProviderTemplateCategoryMembership,
)
from nion.model_management.repository import ModelManagementRepository


def test_repository_initializes_provider_tables(tmp_path):
    repo = ModelManagementRepository(tmp_path / "config.db")

    with repo._connect() as conn:
        table_names = {
            row["name"]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            ).fetchall()
        }

    assert "provider_templates" in table_names
    assert "provider_template_category_memberships" in table_names
    assert "provider_instances" in table_names
    assert "provider_models" in table_names
    assert "model_bindings" in table_names


def test_repository_round_trips_minimal_model_management_records(tmp_path):
    repo = ModelManagementRepository(tmp_path / "config.db")

    template = ProviderTemplate(
        code="openai",
        name="OpenAI",
        category="global",
        protocol="openai-compatible",
    )
    repo.upsert_provider_template(template)
    repo.save_category_membership(
        ProviderTemplateCategoryMembership(
            provider_template_id=template.id,
            category="global",
            sort_order=10,
        )
    )

    instance = ProviderInstance(
        provider_template_id=template.id,
        kind="builtin",
        display_name="OpenAI Main",
    )
    repo.save_provider_instance(instance)

    model = ProviderModel(
        provider_instance_id=instance.id,
        model_id="gpt-4.1",
        display_name="GPT-4.1",
        source="manual",
        priority_order=1,
    )
    repo.save_provider_model(model)

    binding = ModelBinding(
        binding_key="chat.default",
        provider_model_id=model.id,
    )
    repo.save_binding(binding)

    templates = repo.list_provider_templates(category="global")
    instances = repo.list_provider_instances()
    models = repo.list_provider_models(instance.id)
    loaded_binding = repo.get_binding("chat.default")

    assert [item.code for item in templates] == ["openai"]
    assert [item.display_name for item in instances] == ["OpenAI Main"]
    assert [item.model_id for item in models] == ["gpt-4.1"]
    assert loaded_binding is not None
    assert loaded_binding.provider_model_id == model.id


def test_provider_template_upsert_reuses_existing_row_for_same_code(tmp_path):
    repo = ModelManagementRepository(tmp_path / "config.db")

    original = ProviderTemplate(
        code="openai",
        name="OpenAI",
        category="global",
        protocol="openai-compatible",
    )
    repo.upsert_provider_template(original)

    replacement = ProviderTemplate(
        code="openai",
        name="OpenAI Updated",
        category="aggregator",
        protocol="openai-compatible",
    )
    saved = repo.upsert_provider_template(replacement)

    templates = repo.list_provider_templates()

    assert saved.id == original.id
    assert len(templates) == 1
    assert templates[0].id == original.id
    assert templates[0].name == "OpenAI Updated"
    assert templates[0].category == "aggregator"


def test_save_binding_reuses_existing_row_for_same_binding_key(tmp_path):
    repo = ModelManagementRepository(tmp_path / "config.db")

    original = ModelBinding(
        binding_key="chat.default",
        provider_model_id="model-a",
    )
    repo.save_binding(original)

    replacement = ModelBinding(
        binding_key="chat.default",
        provider_model_id="model-b",
    )
    saved = repo.save_binding(replacement)
    loaded_binding = repo.get_binding("chat.default")

    assert saved.id == original.id
    assert loaded_binding is not None
    assert loaded_binding.id == original.id
    assert loaded_binding.provider_model_id == "model-b"
