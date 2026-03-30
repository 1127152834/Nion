from __future__ import annotations

from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager, contextmanager
from contextvars import ContextVar, Token
from typing import Any

from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.outputs import LLMResult

_TOKEN_SOURCE: ContextVar[str] = ContextVar("nion_token_source", default="unknown")

_usage_by_source: dict[str, dict[str, int]] = {}


def _empty_usage() -> dict[str, int]:
    return {
        "input_tokens": 0,
        "output_tokens": 0,
        "total_tokens": 0,
        "llm_calls": 0,
    }


def _extract_usage(response: LLMResult) -> dict[str, int]:
    totals = {
        "input_tokens": 0,
        "output_tokens": 0,
        "total_tokens": 0,
    }
    for generation_list in response.generations:
        for generation in generation_list:
            message = getattr(generation, "message", None)
            usage = getattr(message, "usage_metadata", None) if message is not None else None
            if not usage:
                continue
            totals["input_tokens"] += int(usage.get("input_tokens", 0) or 0)
            totals["output_tokens"] += int(usage.get("output_tokens", 0) or 0)
            totals["total_tokens"] += int(usage.get("total_tokens", 0) or 0)
    return totals


def set_token_source(source: str) -> Token[str]:
    return _TOKEN_SOURCE.set(source)


def reset_token_source(token: Token[str]) -> None:
    _TOKEN_SOURCE.reset(token)


def get_current_token_source() -> str:
    return _TOKEN_SOURCE.get()


@contextmanager
def token_source_context(source: str):
    token = set_token_source(source)
    try:
        yield
    finally:
        reset_token_source(token)


@contextmanager
def token_source_scope(source: str):
    """Temporarily set token source for a single synchronous operation.

    Unlike ``token_source_context`` wrapped around a generator body, this scope is
    intended to start and finish within the same Python Context so it remains
    safe when stream consumers resume or close generators from a different
    Context.
    """
    token = set_token_source(source)
    try:
        yield
    finally:
        reset_token_source(token)


def iter_with_token_source(source: str, iterable: Iterator[Any]) -> Iterator[Any]:
    """Apply token source separately to each synchronous iteration step."""
    while True:
        with token_source_scope(source):
            try:
                item = next(iterable)
            except StopIteration:
                return
        yield item


@asynccontextmanager
async def token_source_async_scope(source: str):
    """Temporarily set token source for one awaited async operation."""
    token = set_token_source(source)
    try:
        yield
    finally:
        reset_token_source(token)


async def aiter_with_token_source(
    source: str,
    iterable: AsyncIterator[Any],
) -> AsyncIterator[Any]:
    """Apply token source separately to each async iteration step."""
    while True:
        try:
            async with token_source_async_scope(source):
                item = await anext(iterable)
        except StopAsyncIteration:
            return
        yield item


def aggregate_token_usage_by_source() -> dict[str, dict[str, int]]:
    return {key: value.copy() for key, value in _usage_by_source.items()}


def reset_token_usage_by_source() -> None:
    _usage_by_source.clear()


class TokenSourceCallbackHandler(BaseCallbackHandler):
    def on_llm_end(
        self,
        response: LLMResult,
        *,
        run_id,
        parent_run_id=None,
        tags=None,
        **kwargs: Any,
    ) -> Any:
        source = _TOKEN_SOURCE.get()
        bucket = _usage_by_source.setdefault(source, _empty_usage())
        usage = _extract_usage(response)
        bucket["input_tokens"] += usage["input_tokens"]
        bucket["output_tokens"] += usage["output_tokens"]
        bucket["total_tokens"] += usage["total_tokens"]
        bucket["llm_calls"] += 1
        return None
