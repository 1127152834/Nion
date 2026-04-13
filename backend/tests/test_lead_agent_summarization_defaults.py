from nion.agents.lead_agent import agent as lead_agent_module
from nion.agents.middlewares.locale_aware_summarization import (
    LocaleAwareSummarizationMiddleware,
    build_summary_prompt_for_locale,
)
from nion.config.summarization_config import (
    SummarizationConfig,
)


def test_create_summarization_middleware_uses_nion_default_prompt_when_config_prompt_is_null(
    monkeypatch,
) -> None:
    captured: dict[str, object] = {}

    monkeypatch.setattr(
        lead_agent_module,
        "get_summarization_config",
        lambda: SummarizationConfig(enabled=True, summary_prompt=None),
    )
    monkeypatch.setattr(
        lead_agent_module,
        "create_chat_model",
        lambda **kwargs: "dummy-model",
    )
    monkeypatch.setattr(
        LocaleAwareSummarizationMiddleware,
        "__init__",
        lambda self, **kwargs: captured.update(kwargs),
    )

    lead_agent_module._create_summarization_middleware()

    assert captured["summary_prompt"] == build_summary_prompt_for_locale("en-US")
    assert captured["configured_summary_prompt"] is None


def test_create_summarization_middleware_preserves_explicit_default_prompt_override(
    monkeypatch,
) -> None:
    captured: dict[str, object] = {}

    monkeypatch.setattr(
        lead_agent_module,
        "get_summarization_config",
        lambda: SummarizationConfig(
            enabled=True,
            summary_prompt=build_summary_prompt_for_locale("en-US"),
        ),
    )
    monkeypatch.setattr(
        lead_agent_module,
        "create_chat_model",
        lambda **kwargs: "dummy-model",
    )
    monkeypatch.setattr(
        LocaleAwareSummarizationMiddleware,
        "__init__",
        lambda self, **kwargs: captured.update(kwargs),
    )

    lead_agent_module._create_summarization_middleware()

    assert captured["summary_prompt"] == build_summary_prompt_for_locale("en-US")
    assert captured["configured_summary_prompt"] == build_summary_prompt_for_locale(
        "en-US"
    )
