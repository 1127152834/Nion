from __future__ import annotations

from langchain.chat_models import BaseChatModel

from nion.config.model_config import ModelConfig
from nion.models import factory as factory_module


class CapturingChatModel(BaseChatModel):
    captured_kwargs: dict[str, object] = {}

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


class FakeResolvedRuntimeModel:
    def __init__(self, **extra_model_kwargs: object) -> None:
        payload = {
            "name": "gpt-4.1",
            "display_name": "GPT-4.1",
            "description": "Registry-backed model",
            "use": "langchain_openai:ChatOpenAI",
            "model": "gpt-4.1",
            "api_key": "sk-registry-123",
            "api_base": "https://api.openai.com/v1",
            "supports_thinking": True,
            "supports_reasoning_effort": True,
            "supports_vision": True,
            **extra_model_kwargs,
        }
        self.runtime_name = str(payload["name"])
        self.runtime_model_config = ModelConfig(**payload)


class FakeRegistry:
    def __init__(self, **extra_model_kwargs: object) -> None:
        self._extra_model_kwargs = extra_model_kwargs

    def get_default_model(self) -> FakeResolvedRuntimeModel:
        return FakeResolvedRuntimeModel(**self._extra_model_kwargs)

    def resolve_model(self, identity: str) -> FakeResolvedRuntimeModel:
        assert identity == str(self._extra_model_kwargs.get("name", "gpt-4.1"))
        return FakeResolvedRuntimeModel(**self._extra_model_kwargs)


def test_provider_id_is_not_forwarded_to_model_constructor(monkeypatch):
    monkeypatch.setattr(
        factory_module,
        "get_model_registry_service",
        lambda **kwargs: FakeRegistry(
            name="provider-bound",
            display_name="provider-bound",
            description=None,
            use="langchain_anthropic:ChatAnthropic",
            model="claude-3-5-sonnet-20241022",
            api_key="test-key",
            api_base="https://api.anthropic.com",
            provider_id="anthropic-default",
            supports_thinking=False,
            supports_reasoning_effort=False,
            supports_vision=False,
        ),
    )
    monkeypatch.setattr(
        factory_module,
        "resolve_class",
        lambda path, base: CapturingChatModel,
    )
    monkeypatch.setattr(factory_module, "is_tracing_enabled", lambda: False)

    factory_module.create_chat_model(name="provider-bound", thinking_enabled=False)

    assert "provider_id" not in CapturingChatModel.captured_kwargs


def test_create_chat_model_uses_registry_default_binding(monkeypatch):
    CapturingChatModel.captured_kwargs = {}

    monkeypatch.setattr(
        factory_module,
        "get_model_registry_service",
        lambda **kwargs: FakeRegistry(),
    )
    monkeypatch.setattr(
        factory_module,
        "resolve_class",
        lambda path, base: CapturingChatModel,
    )
    monkeypatch.setattr(factory_module, "is_tracing_enabled", lambda: False)

    factory_module.create_chat_model(name=None)

    assert CapturingChatModel.captured_kwargs["model"] == "gpt-4.1"
    assert CapturingChatModel.captured_kwargs["api_key"] == "sk-registry-123"
    assert (
        CapturingChatModel.captured_kwargs["base_url"]
        == "https://api.openai.com/v1"
    )
    assert "api_base" not in CapturingChatModel.captured_kwargs


def test_create_chat_model_does_not_forward_context_window_metadata(monkeypatch):
    CapturingChatModel.captured_kwargs = {}

    monkeypatch.setattr(
        factory_module,
        "get_model_registry_service",
        lambda **kwargs: FakeRegistry(context_window=256000),
    )
    monkeypatch.setattr(
        factory_module,
        "resolve_class",
        lambda path, base: CapturingChatModel,
    )
    monkeypatch.setattr(factory_module, "is_tracing_enabled", lambda: False)

    factory_module.create_chat_model(name=None)

    assert "context_window" not in CapturingChatModel.captured_kwargs
