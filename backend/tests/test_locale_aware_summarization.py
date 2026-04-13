from __future__ import annotations

from types import SimpleNamespace

from langchain_core.messages import AIMessage, HumanMessage

from nion.agents.middlewares.locale_aware_summarization import (
    SUMMARY_FORMAT_VERSION,
    DEFAULT_SUMMARY_LOCALE,
    LocaleAwareSummarizationMiddleware,
    build_summary_prompt_for_locale,
)
from nion.config.summarization_config import DEFAULT_SUMMARY_PROMPT


class _FakeChatModel:
    _llm_type = "openai-chat"

    def invoke(self, prompt: str):
        raise AssertionError("invoke should be stubbed in tests")

    async def ainvoke(self, prompt: str):
        raise AssertionError("ainvoke should be stubbed in tests")


def test_build_summary_prompt_for_locale_zh_cn_uses_chinese_section_headings() -> None:
    prompt = build_summary_prompt_for_locale("zh-CN")

    assert "仅返回简洁 Markdown" in prompt
    assert "目标" in prompt
    assert "已确认决策" in prompt
    assert "约束" in prompt
    assert "已完成工作" in prompt
    assert "待确认问题" in prompt


def test_locale_aware_middleware_builds_summary_message_with_metadata() -> None:
    middleware = LocaleAwareSummarizationMiddleware(
        model=_FakeChatModel(),
        trigger=("messages", 2),
        keep=("messages", 1),
    )

    messages = middleware._build_new_messages_for_locale("摘要内容", "zh-CN")

    assert len(messages) == 1
    summary_message = messages[0]
    assert isinstance(summary_message, HumanMessage)
    assert summary_message.content == "摘要内容"
    assert summary_message.additional_kwargs == {
        "internal_summary": True,
        "summary_locale": "zh-CN",
        "summary_format_version": SUMMARY_FORMAT_VERSION,
    }


def test_locale_aware_before_model_uses_runtime_locale_for_prompt_and_metadata() -> None:
    middleware = LocaleAwareSummarizationMiddleware(
        model=_FakeChatModel(),
        trigger=("messages", 2),
        keep=("messages", 1),
    )
    messages = [
        HumanMessage(content="你好", id="h-1"),
        AIMessage(content="世界", id="ai-1"),
        HumanMessage(content="保留", id="h-2"),
    ]

    middleware.token_counter = lambda _: 100
    middleware._create_summary_with_prompt = lambda messages_to_summarize, prompt: (
        "中文摘要" if "已确认决策" in prompt else "unexpected"
    )

    result = middleware.before_model(
        {"messages": messages},
        SimpleNamespace(context={"locale": "zh-CN"}),
    )

    assert result is not None
    summary_message = result["messages"][1]
    preserved_message = result["messages"][2]
    assert isinstance(summary_message, HumanMessage)
    assert summary_message.content == "中文摘要"
    assert summary_message.additional_kwargs["internal_summary"] is True
    assert summary_message.additional_kwargs["summary_locale"] == "zh-CN"
    assert summary_message.additional_kwargs["summary_format_version"] == SUMMARY_FORMAT_VERSION
    assert preserved_message.content == "保留"


def test_locale_aware_before_model_defaults_to_en_us_locale() -> None:
    middleware = LocaleAwareSummarizationMiddleware(
        model=_FakeChatModel(),
        trigger=("messages", 2),
        keep=("messages", 1),
    )
    messages = [
        HumanMessage(content="hi", id="h-1"),
        AIMessage(content="there", id="ai-1"),
        HumanMessage(content="keep", id="h-2"),
    ]

    middleware.token_counter = lambda _: 100
    middleware._create_summary_with_prompt = lambda messages_to_summarize, prompt: (
        DEFAULT_SUMMARY_LOCALE if "Confirmed decisions" in prompt else "unexpected"
    )

    result = middleware.before_model(
        {"messages": messages},
        SimpleNamespace(context={}),
    )

    assert result is not None
    summary_message = result["messages"][1]
    assert summary_message.content == DEFAULT_SUMMARY_LOCALE
    assert summary_message.additional_kwargs["summary_locale"] == DEFAULT_SUMMARY_LOCALE


def test_locale_aware_before_model_prefers_explicit_summary_prompt_over_locale_default() -> None:
    middleware = LocaleAwareSummarizationMiddleware(
        model=_FakeChatModel(),
        trigger=("messages", 2),
        keep=("messages", 1),
        summary_prompt="CUSTOM {messages}",
    )
    messages = [
        HumanMessage(content="你好", id="h-1"),
        AIMessage(content="世界", id="ai-1"),
        HumanMessage(content="保留", id="h-2"),
    ]
    captured: dict[str, str] = {}

    middleware.token_counter = lambda _: 100

    def _capture_prompt(messages_to_summarize, prompt):
        captured["prompt"] = prompt
        return "custom-summary"

    middleware._create_summary_with_prompt = _capture_prompt

    result = middleware.before_model(
        {"messages": messages},
        SimpleNamespace(context={"locale": "zh-CN"}),
    )

    assert result is not None
    assert captured["prompt"] == "CUSTOM {messages}"
    assert result["messages"][1].content == "custom-summary"


def test_locale_aware_treats_default_english_prompt_as_locale_selectable_fallback() -> None:
    middleware = LocaleAwareSummarizationMiddleware(
        model=_FakeChatModel(),
        trigger=("messages", 2),
        keep=("messages", 1),
        summary_prompt=DEFAULT_SUMMARY_PROMPT,
    )
    messages = [
        HumanMessage(content="你好", id="h-1"),
        AIMessage(content="世界", id="ai-1"),
        HumanMessage(content="保留", id="h-2"),
    ]
    captured: dict[str, str] = {}

    middleware.token_counter = lambda _: 100

    def _capture_prompt(messages_to_summarize, prompt):
        captured["prompt"] = prompt
        return "locale-summary"

    middleware._create_summary_with_prompt = _capture_prompt

    result = middleware.before_model(
        {"messages": messages},
        SimpleNamespace(context={"locale": "zh-CN"}),
    )

    assert result is not None
    assert "已确认决策" in captured["prompt"]
    assert result["messages"][1].content == "locale-summary"
