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

    monkeypatch.setattr(factory_module, "ensure_latest_app_config", lambda process_name="langgraph": config)
    monkeypatch.setattr(factory_module, "resolve_class", lambda path, base: CapturingChatModel)
    monkeypatch.setattr(factory_module, "is_tracing_enabled", lambda: False)

    factory_module.create_chat_model(name="provider-bound", thinking_enabled=False)

    assert "provider_id" not in CapturingChatModel.captured_kwargs
