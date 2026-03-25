from __future__ import annotations

from langchain.chat_models import BaseChatModel

from nion.config.app_config import AppConfig
from nion.config.model_config import ModelConfig
from nion.config.sandbox_config import SandboxConfig
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
    def __init__(self) -> None:
        self.runtime_name = "gpt-4.1"
        self.runtime_model_config = ModelConfig(
            name="gpt-4.1",
            display_name="GPT-4.1",
            description="Registry-backed model",
            use="langchain_openai:ChatOpenAI",
            model="gpt-4.1",
            api_key="sk-registry-123",
            api_base="https://api.openai.com/v1",
            supports_thinking=True,
            supports_reasoning_effort=True,
            supports_vision=True,
        )


class FakeRegistry:
    def get_default_model(self) -> FakeResolvedRuntimeModel:
        return FakeResolvedRuntimeModel()

    def resolve_model(self, identity: str) -> FakeResolvedRuntimeModel:
        assert identity == "gpt-4.1"
        return FakeResolvedRuntimeModel()


def test_provider_id_is_not_forwarded_to_model_constructor(monkeypatch):
    config = AppConfig(
        models=[
            ModelConfig(
                name="provider-bound",
                display_name="provider-bound",
                description=None,
                use="langchain_anthropic:ChatAnthropic",
                model="claude-3-5-sonnet-20241022",
                api_key="test-key",
                provider_id="anthropic-default",
            )
        ],
        sandbox=SandboxConfig(use="nion.sandbox.local:LocalSandboxProvider"),
    )

    monkeypatch.setattr(
        factory_module,
        "ensure_latest_app_config",
        lambda process_name="langgraph": config,
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
        CapturingChatModel.captured_kwargs["api_base"]
        == "https://api.openai.com/v1"
    )
