"""Tests for lead agent runtime model resolution behavior."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from nion.agents.lead_agent import agent as lead_agent_module
from nion.agents.middlewares.locale_aware_summarization import (
    LocaleAwareSummarizationMiddleware,
)
from nion.config.app_config import AppConfig
from nion.config.model_config import ModelConfig
from nion.config.sandbox_config import SandboxConfig


def _make_app_config(models: list[ModelConfig]) -> AppConfig:
    return AppConfig(
        models=models,
        sandbox=SandboxConfig(use="nion.sandbox.local:LocalSandboxProvider"),
    )


def _make_model(name: str, *, supports_thinking: bool) -> ModelConfig:
    return ModelConfig(
        name=name,
        display_name=name,
        description=None,
        use="langchain_openai:ChatOpenAI",
        model=name,
        supports_thinking=supports_thinking,
        supports_vision=False,
    )


def _patch_registry(monkeypatch, models: list[ModelConfig]) -> None:
    class _Resolved:
        def __init__(self, model: ModelConfig):
            self.runtime_name = model.name
            self.runtime_model_config = model

    class _Registry:
        def get_default_model(self):
            if not models:
                raise ValueError("no models")
            return _Resolved(models[0])

        def resolve_model(self, identity: str):
            for model in models:
                if model.name == identity:
                    return _Resolved(model)
            raise ValueError(identity)

    monkeypatch.setattr(
        lead_agent_module,
        "get_model_registry_service",
        lambda **kwargs: _Registry(),
    )


def test_resolve_model_name_falls_back_to_default(monkeypatch, caplog):
    app_config = _make_app_config(
        [
            _make_model("default-model", supports_thinking=False),
            _make_model("other-model", supports_thinking=True),
        ]
    )

    monkeypatch.setattr(lead_agent_module, "get_app_config", lambda: app_config)
    _patch_registry(monkeypatch, app_config.models)

    with caplog.at_level("WARNING"):
        resolved = lead_agent_module._resolve_model_name("missing-model")

    assert resolved == "default-model"
    assert "fallback to default model 'default-model'" in caplog.text


def test_resolve_model_name_uses_default_when_none(monkeypatch):
    app_config = _make_app_config(
        [
            _make_model("default-model", supports_thinking=False),
            _make_model("other-model", supports_thinking=True),
        ]
    )

    monkeypatch.setattr(lead_agent_module, "get_app_config", lambda: app_config)
    _patch_registry(monkeypatch, app_config.models)

    resolved = lead_agent_module._resolve_model_name(None)

    assert resolved == "default-model"


def test_resolve_model_name_raises_when_no_models_configured(monkeypatch):
    app_config = _make_app_config([])

    monkeypatch.setattr(lead_agent_module, "get_app_config", lambda: app_config)
    _patch_registry(monkeypatch, app_config.models)

    with pytest.raises(
        ValueError,
        match="No chat models are configured",
    ):
        lead_agent_module._resolve_model_name("missing-model")


def test_make_lead_agent_disables_thinking_when_model_does_not_support_it(monkeypatch):
    app_config = _make_app_config([_make_model("safe-model", supports_thinking=False)])

    import nion.tools as tools_module

    monkeypatch.setattr(lead_agent_module, "get_app_config", lambda: app_config)
    _patch_registry(monkeypatch, app_config.models)
    monkeypatch.setattr(tools_module, "get_available_tools", lambda **kwargs: [])
    monkeypatch.setattr(lead_agent_module, "_build_middlewares", lambda config, model_name, agent_name=None: [])

    captured: dict[str, object] = {}

    def _fake_create_chat_model(*, name, thinking_enabled, reasoning_effort=None):
        captured["name"] = name
        captured["thinking_enabled"] = thinking_enabled
        captured["reasoning_effort"] = reasoning_effort
        return object()

    monkeypatch.setattr(lead_agent_module, "create_chat_model", _fake_create_chat_model)
    monkeypatch.setattr(lead_agent_module, "create_agent", lambda **kwargs: kwargs)

    result = lead_agent_module.make_lead_agent(
        {
            "configurable": {
                "model_name": "safe-model",
                "thinking_enabled": True,
                "is_plan_mode": False,
                "subagent_enabled": False,
            }
        }
    )

    assert captured["name"] == "safe-model"
    assert captured["thinking_enabled"] is False
    assert result["model"] is not None


def test_build_middlewares_uses_resolved_model_name_for_vision(monkeypatch):
    app_config = _make_app_config(
        [
            _make_model("stale-model", supports_thinking=False),
            ModelConfig(
                name="vision-model",
                display_name="vision-model",
                description=None,
                use="langchain_openai:ChatOpenAI",
                model="vision-model",
                supports_thinking=False,
                supports_vision=True,
            ),
        ]
    )

    monkeypatch.setattr(lead_agent_module, "get_app_config", lambda: app_config)
    _patch_registry(monkeypatch, app_config.models)
    monkeypatch.setattr(lead_agent_module, "_create_summarization_middleware", lambda: None)
    monkeypatch.setattr(lead_agent_module, "_create_todo_list_middleware", lambda is_plan_mode: None)

    middlewares = lead_agent_module._build_middlewares(
        {"configurable": {"model_name": "stale-model", "is_plan_mode": False, "subagent_enabled": False}},
        model_name="vision-model",
    )

    assert any(isinstance(m, lead_agent_module.ViewImageMiddleware) for m in middlewares)


def test_create_summarization_middleware_uses_runtime_model_instance(monkeypatch):
    captured: dict[str, object] = {}

    monkeypatch.setattr(
        lead_agent_module,
        "get_summarization_config",
        lambda: SimpleNamespace(
            enabled=True,
            model_name="stale-summary-model",
            trigger=None,
            keep=SimpleNamespace(to_tuple=lambda: ("messages", 20)),
            trim_tokens_to_summarize=3000,
            summary_prompt=None,
        ),
    )
    monkeypatch.setattr(
        lead_agent_module,
        "resolve_model_name_with_fallback",
        lambda requested_name=None, fallback_name=None: "gpt-5.4",
    )
    monkeypatch.setattr(
        lead_agent_module,
        "create_chat_model",
        lambda **kwargs: {"kind": "runtime-model", **kwargs},
    )
    monkeypatch.setattr(
        LocaleAwareSummarizationMiddleware,
        "__init__",
        lambda self, **kwargs: captured.update(kwargs),
    )

    middleware = lead_agent_module._create_summarization_middleware()

    assert isinstance(middleware, LocaleAwareSummarizationMiddleware)
    assert captured["model"] == {
        "kind": "runtime-model",
        "name": "gpt-5.4",
        "thinking_enabled": False,
    }
