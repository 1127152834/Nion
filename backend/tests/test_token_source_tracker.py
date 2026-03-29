"""Tests for source-tagged token tracking callbacks."""

from __future__ import annotations

from uuid import uuid4

from langchain_core.messages import AIMessage
from langchain_core.outputs import ChatGeneration, LLMResult

from nion.telemetry.token_source import (
    TokenSourceCallbackHandler,
    aggregate_token_usage_by_source,
    token_source_context,
)


def _llm_result(
    *,
    input_tokens: int,
    output_tokens: int,
    total_tokens: int,
) -> LLMResult:
    return LLMResult(
        generations=[
            [
                ChatGeneration(
                    message=AIMessage(
                        content="ok",
                        usage_metadata={
                            "input_tokens": input_tokens,
                            "output_tokens": output_tokens,
                            "total_tokens": total_tokens,
                        },
                    )
                )
            ]
        ]
    )


def test_callback_handler_records_usage_under_active_source() -> None:
    handler = TokenSourceCallbackHandler()

    with token_source_context("lead_agent"):
        handler.on_llm_end(_llm_result(input_tokens=100, output_tokens=20, total_tokens=120), run_id=uuid4())

    with token_source_context("subagent"):
        handler.on_llm_end(_llm_result(input_tokens=40, output_tokens=10, total_tokens=50), run_id=uuid4())

    usage = aggregate_token_usage_by_source()

    assert usage["lead_agent"] == {
        "input_tokens": 100,
        "output_tokens": 20,
        "total_tokens": 120,
        "llm_calls": 1,
    }
    assert usage["subagent"] == {
        "input_tokens": 40,
        "output_tokens": 10,
        "total_tokens": 50,
        "llm_calls": 1,
    }


def test_default_source_is_unknown_when_no_context_is_set() -> None:
    handler = TokenSourceCallbackHandler()
    handler.on_llm_end(_llm_result(input_tokens=5, output_tokens=3, total_tokens=8), run_id=uuid4())

    usage = aggregate_token_usage_by_source()

    assert usage["unknown"]["total_tokens"] == 8
    assert usage["unknown"]["llm_calls"] == 1
