"""Regression tests for token-source helpers across Python Context boundaries."""

from __future__ import annotations

from contextvars import copy_context

import pytest

from nion.telemetry.token_source import (
    aiter_with_token_source,
    get_current_token_source,
    iter_with_token_source,
)


def test_iter_with_token_source_survives_generator_close_from_other_context() -> None:
    observed_sources: list[str] = []

    def base_generator():
        observed_sources.append(get_current_token_source())
        yield "chunk-1"

    generator = iter_with_token_source("lead_agent", iter(base_generator()))

    assert next(generator) == "chunk-1"

    close_context = copy_context()
    close_context.run(generator.close)

    assert observed_sources == ["lead_agent"]
    assert get_current_token_source() == "unknown"


@pytest.mark.anyio
async def test_aiter_with_token_source_reapplies_source_after_context_switch() -> None:
    observed_sources: list[str] = []

    async def base_generator():
        observed_sources.append(get_current_token_source())
        yield "chunk-1"

        next_context = copy_context()

        async def emit_second():
            observed_sources.append(get_current_token_source())
            return "chunk-2"

        yield await next_context.run(emit_second)

    values: list[str] = []
    async for item in aiter_with_token_source("subagent", base_generator()):
        values.append(item)

    assert values == ["chunk-1", "chunk-2"]
    assert observed_sources == ["subagent", "subagent"]
    assert get_current_token_source() == "unknown"
