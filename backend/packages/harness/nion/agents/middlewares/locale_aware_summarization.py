from __future__ import annotations

from typing import Any

from langchain.agents.middleware import SummarizationMiddleware
from langchain_core.messages import HumanMessage, get_buffer_string
from langgraph.graph.message import REMOVE_ALL_MESSAGES, RemoveMessage

from nion.config.summarization_config import (
    DEFAULT_SUMMARY_LOCALE,
    DEFAULT_SUMMARY_PROMPT,
    ZH_CN_SUMMARY_PROMPT,
)

SUMMARY_FORMAT_VERSION = 1


def _normalize_summary_locale(locale: str | None) -> str:
    if isinstance(locale, str) and locale.strip().lower() == "zh-cn":
        return "zh-CN"
    return DEFAULT_SUMMARY_LOCALE


def build_summary_prompt_for_locale(locale: str | None) -> str:
    if _normalize_summary_locale(locale) == "zh-CN":
        return ZH_CN_SUMMARY_PROMPT
    return DEFAULT_SUMMARY_PROMPT


class LocaleAwareSummarizationMiddleware(SummarizationMiddleware):
    def _create_summary_with_prompt(self, messages_to_summarize, prompt: str) -> str:
        if not messages_to_summarize:
            return "No previous conversation history."

        trimmed_messages = self._trim_messages_for_summary(messages_to_summarize)
        if not trimmed_messages:
            return "Previous conversation was too long to summarize."

        formatted_messages = get_buffer_string(trimmed_messages)

        try:
            response = self.model.invoke(prompt.format(messages=formatted_messages))
            return response.text.strip()
        except Exception as exc:
            return f"Error generating summary: {exc!s}"

    async def _acreate_summary_with_prompt(self, messages_to_summarize, prompt: str) -> str:
        if not messages_to_summarize:
            return "No previous conversation history."

        trimmed_messages = self._trim_messages_for_summary(messages_to_summarize)
        if not trimmed_messages:
            return "Previous conversation was too long to summarize."

        formatted_messages = get_buffer_string(trimmed_messages)

        try:
            response = await self.model.ainvoke(prompt.format(messages=formatted_messages))
            return response.text.strip()
        except Exception as exc:
            return f"Error generating summary: {exc!s}"

    def _build_new_messages_for_locale(
        self,
        summary: str,
        locale: str | None,
    ) -> list[HumanMessage]:
        normalized_locale = _normalize_summary_locale(locale)
        return [
            HumanMessage(
                content=summary,
                additional_kwargs={
                    "internal_summary": True,
                    "summary_locale": normalized_locale,
                    "summary_format_version": SUMMARY_FORMAT_VERSION,
                },
            )
        ]

    def before_model(self, state, runtime) -> dict[str, Any] | None:
        messages = state["messages"]
        self._ensure_message_ids(messages)

        total_tokens = self.token_counter(messages)
        if not self._should_summarize(messages, total_tokens):
            return None

        cutoff_index = self._determine_cutoff_index(messages)
        if cutoff_index <= 0:
            return None

        messages_to_summarize, preserved_messages = self._partition_messages(
            messages,
            cutoff_index,
        )
        locale = self._resolve_runtime_locale(runtime)
        prompt = build_summary_prompt_for_locale(locale)
        summary = self._create_summary_with_prompt(messages_to_summarize, prompt)
        new_messages = self._build_new_messages_for_locale(summary, locale)

        return {
            "messages": [
                RemoveMessage(id=REMOVE_ALL_MESSAGES),
                *new_messages,
                *preserved_messages,
            ]
        }

    async def abefore_model(self, state, runtime) -> dict[str, Any] | None:
        messages = state["messages"]
        self._ensure_message_ids(messages)

        total_tokens = self.token_counter(messages)
        if not self._should_summarize(messages, total_tokens):
            return None

        cutoff_index = self._determine_cutoff_index(messages)
        if cutoff_index <= 0:
            return None

        messages_to_summarize, preserved_messages = self._partition_messages(
            messages,
            cutoff_index,
        )
        locale = self._resolve_runtime_locale(runtime)
        prompt = build_summary_prompt_for_locale(locale)
        summary = await self._acreate_summary_with_prompt(messages_to_summarize, prompt)
        new_messages = self._build_new_messages_for_locale(summary, locale)

        return {
            "messages": [
                RemoveMessage(id=REMOVE_ALL_MESSAGES),
                *new_messages,
                *preserved_messages,
            ]
        }

    @staticmethod
    def _resolve_runtime_locale(runtime: Any) -> str:
        context = getattr(runtime, "context", None)
        if isinstance(context, dict):
            return _normalize_summary_locale(context.get("locale"))
        return DEFAULT_SUMMARY_LOCALE
