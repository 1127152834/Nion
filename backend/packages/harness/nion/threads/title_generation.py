from __future__ import annotations

import logging
from collections.abc import Callable, Sequence
from threading import Thread
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage

from nion.agents.middlewares.title_middleware import TitleMiddleware
from nion.config.title_config import get_title_config

logger = logging.getLogger(__name__)


def should_generate_thread_title(values: dict[str, Any]) -> bool:
    config = get_title_config()
    if not config.enabled:
        return False

    title = values.get("title")
    if isinstance(title, str) and title.strip() and title.strip() != "Untitled":
        return False

    messages = values.get("messages", [])
    if not isinstance(messages, Sequence):
        return False

    human_count = 0
    assistant_count = 0
    for message in messages:
        if not isinstance(message, dict):
            continue
        if message.get("type") == "human":
            human_count += 1
        elif message.get("type") == "ai":
            assistant_count += 1

    return human_count == 1 and assistant_count >= 1


def generate_thread_title(values: dict[str, Any]) -> str | None:
    if not should_generate_thread_title(values):
        return None

    messages = values.get("messages", [])
    normalized_messages = []
    for message in messages:
        if not isinstance(message, dict):
            continue
        if message.get("type") == "human":
            normalized_messages.append(HumanMessage(content=message.get("content", "")))
        elif message.get("type") == "ai":
            normalized_messages.append(AIMessage(content=message.get("content", "")))

    middleware = TitleMiddleware()
    result = middleware._generate_title_result({"messages": normalized_messages})
    if not result:
        return None
    title = result.get("title")
    return title if isinstance(title, str) and title.strip() else None


def generate_thread_title_in_background(
    *,
    thread_id: str,
    values: dict[str, Any],
    context: dict[str, Any],
    apply_title: Callable[[str, str, dict[str, Any]], None],
) -> None:
    def runner() -> None:
        try:
            title = generate_thread_title(values)
            if title:
                apply_title(thread_id, title, context)
        except Exception:
            logger.exception("Failed to generate background thread title for %s", thread_id)

    Thread(target=runner, name=f"title-generation-{thread_id[:8]}", daemon=True).start()
