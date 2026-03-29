"""Focused tests for token-source callback injection in model factory."""

from __future__ import annotations

from langchain.chat_models import BaseChatModel

from nion.config.app_config import AppConfig
from nion.config.model_config import ModelConfig
from nion.config.sandbox_config import SandboxConfig
from nion.model_management.models import ProviderInstance, ProviderModel, ProviderTemplate
from nion.model_management.service import ResolvedRuntimeModel
from nion.models import factory as factory_module


def _make_app_config(models: list[ModelConfig]) -> AppConfig:
    return AppConfig(
        models=models,
        sandbox=SandboxConfig(use="nion.sandbox.local:LocalSandboxProvider"),
    )


def _make_model(name: str = "test-model") -> ModelConfig:
    return ModelConfig(
        name=name,
        display_name=name,
        description=None,
        use="langchain_openai:ChatOpenAI",
        model=name,
        supports_thinking=False,
        supports_vision=False,
    )


class CapturingChatModel(BaseChatModel):
    captured_kwargs: dict = {}

    def __init__(self, **kwargs):
        CapturingChatModel.captured_kwargs = dict(kwargs)
        super().__init__(**kwargs)

    @property
    def _llm_type(self) -> str:
        return "capturing"

    def _generate(self, *args, **kwargs):  # type: ignore[override]
        raise NotImplementedError

    def _stream(self, *args, **kwargs):  # type: ignore[override]
        raise NotImplementedError


def test_model_factory_attaches_token_source_callback(monkeypatch):
    cfg = _make_app_config([_make_model("callback-test")])
    monkeypatch.setattr(factory_module, "get_app_config", lambda: cfg)
    monkeypatch.setattr(factory_module, "resolve_class", lambda path, base: CapturingChatModel)
    monkeypatch.setattr(factory_module, "is_tracing_enabled", lambda: False)
    resolved = ResolvedRuntimeModel(
        runtime_name="callback-test",
        binding_key=None,
        source_kind="legacy",
        provider=ProviderInstance(
            id="provider-1",
            provider_template_id=None,
            kind="builtin",
            display_name="Provider",
            status="active",
            protocol_override="openai-compatible",
            base_url_override=None,
            api_key_encrypted=None,
            created_at="2026-03-29T00:00:00Z",
            updated_at="2026-03-29T00:00:00Z",
        ),
        template=ProviderTemplate(
            id="template-1",
            code="template",
            name="Template",
            protocol="openai-compatible",
            base_url_mode="editable",
            base_url=None,
            description=None,
            created_at="2026-03-29T00:00:00Z",
            updated_at="2026-03-29T00:00:00Z",
        ),
        model=ProviderModel(
            id="model-1",
            provider_instance_id="provider-1",
            model_id="callback-test",
            display_name="callback-test",
            source="manual",
            is_enabled=True,
            is_primary=True,
            supports_thinking=False,
            supports_reasoning_effort=False,
            supports_vision=False,
            priority_order=0,
            metadata_json={},
            created_at="2026-03-29T00:00:00Z",
            updated_at="2026-03-29T00:00:00Z",
        ),
        runtime_model_config=cfg.models[0],
        api_key=None,
        api_base=None,
    )

    class FakeRegistry:
        def resolve_model(self, identity: str):
            assert identity == "callback-test"
            return resolved

        def get_default_model(self):
            return resolved

    monkeypatch.setattr(factory_module, "get_model_registry_service", lambda app_config_provider=None: FakeRegistry())

    model = factory_module.create_chat_model(name="callback-test")

    callback_types = {type(cb).__name__ for cb in (model.callbacks or [])}
    assert "TokenSourceCallbackHandler" in callback_types
