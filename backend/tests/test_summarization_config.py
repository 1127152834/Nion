from nion.config.summarization_config import (
    DEFAULT_SUMMARIZATION_TOKENS,
    DEFAULT_SUMMARY_PROMPT,
    SummarizationConfig,
)


def test_summarization_defaults_use_20k_token_window() -> None:
    config = SummarizationConfig()

    assert config.trigger is not None
    assert config.trigger.type == "tokens"
    assert config.trigger.value == DEFAULT_SUMMARIZATION_TOKENS
    assert config.trim_tokens_to_summarize == DEFAULT_SUMMARIZATION_TOKENS


def test_summarization_default_prompt_preserves_decisions() -> None:
    config = SummarizationConfig()

    assert config.summary_prompt == DEFAULT_SUMMARY_PROMPT
    assert "preserve them exactly" in config.summary_prompt
    assert "Remaining open questions" in config.summary_prompt
