from __future__ import annotations

from nion.model_management.crypto import build_model_management_secret
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


def test_upsert_provider_template_updates_existing_row_by_code(tmp_path):
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
        sort_order=7,
    )
    saved = repo.upsert_provider_template(replacement)

    templates = repo.list_provider_templates()

    assert saved.id == original.id
    assert [item.code for item in templates] == ["openai"]
    assert templates[0].id == original.id
    assert templates[0].name == "OpenAI Updated"
    assert templates[0].category == "aggregator"
    assert templates[0].sort_order == 7


def test_save_binding_updates_existing_row_by_binding_key(tmp_path):
    repo = ModelManagementRepository(tmp_path / "config.db")

    original = ModelBinding(
        binding_key="chat.default",
        provider_model_id="model-1",
    )
    repo.save_binding(original)

    replacement = ModelBinding(
        binding_key="chat.default",
        provider_model_id="model-2",
        fallback_provider_model_id="model-3",
        status="disabled",
    )
    saved = repo.save_binding(replacement)

    binding = repo.get_binding("chat.default")

    assert binding is not None
    assert saved.id == original.id
    assert binding.id == original.id
    assert binding.provider_model_id == "model-2"
    assert binding.fallback_provider_model_id == "model-3"
    assert binding.status == "disabled"


def test_save_provider_instance_encrypts_plaintext_api_key(tmp_path):
    repo = ModelManagementRepository(
        tmp_path / "config.db",
        secret_provider=lambda: build_model_management_secret("test-secret"),
    )

    instance = ProviderInstance(
        kind="custom",
        display_name="Custom Provider",
    )

    saved = repo.save_provider_instance(
        instance,
        api_key_plaintext="sk-live-12345678",
    )
    loaded = repo.list_provider_instances()

    assert saved.api_key_encrypted is not None
    assert saved.api_key_encrypted != "sk-live-12345678"
    assert saved.api_key_masked == "••••5678"
    assert [item.api_key_masked for item in loaded] == ["••••5678"]
    assert loaded[0].api_key_encrypted == saved.api_key_encrypted

    with repo._connect() as connection:
        row = connection.execute(
            "SELECT payload FROM provider_instances WHERE id = ?",
            (saved.id,),
        ).fetchone()

    assert row is not None
    assert "sk-live-12345678" not in row["payload"]


def test_save_provider_instance_can_clear_saved_api_key(tmp_path):
    repo = ModelManagementRepository(
        tmp_path / "config.db",
        secret_provider=lambda: build_model_management_secret("test-secret"),
    )

    instance = ProviderInstance(
        kind="custom",
        display_name="Custom Provider",
    )
    saved = repo.save_provider_instance(
        instance,
        api_key_plaintext="sk-live-12345678",
    )

    cleared = repo.save_provider_instance(
        saved,
        api_key_plaintext="",
    )

    assert cleared.api_key_encrypted is None
    assert cleared.api_key_masked is None


def test_save_provider_instance_preserves_existing_api_key_when_plaintext_is_omitted(tmp_path):
    repo = ModelManagementRepository(
        tmp_path / "config.db",
        secret_provider=lambda: build_model_management_secret("test-secret"),
    )

    instance = ProviderInstance(
        kind="custom",
        display_name="Custom Provider",
    )
    saved = repo.save_provider_instance(
        instance,
        api_key_plaintext="sk-live-12345678",
    )

    updated = repo.save_provider_instance(
        saved.model_copy(update={"display_name": "Renamed Provider"}),
    )
    loaded = repo.list_provider_instances()

    assert updated.display_name == "Renamed Provider"
    assert updated.api_key_encrypted == saved.api_key_encrypted
    assert updated.api_key_masked == saved.api_key_masked
    assert len(loaded) == 1
    assert loaded[0].display_name == "Renamed Provider"
    assert loaded[0].api_key_encrypted == saved.api_key_encrypted
    assert loaded[0].api_key_masked == saved.api_key_masked
