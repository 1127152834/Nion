from nion.agents.lead_agent import agent as lead_agent_module
from nion.config.summarization_config import (
    DEFAULT_SUMMARY_PROMPT,
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

    class DummyMiddleware:
        def __init__(self, **kwargs):
            captured.update(kwargs)

    monkeypatch.setattr(
        lead_agent_module,
        "SummarizationMiddleware",
        DummyMiddleware,
    )

    lead_agent_module._create_summarization_middleware()

    assert captured["summary_prompt"] == DEFAULT_SUMMARY_PROMPT
