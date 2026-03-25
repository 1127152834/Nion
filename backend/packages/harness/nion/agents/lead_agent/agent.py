from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

from langchain.agents import create_agent
from langchain_core.runnables import RunnableConfig

from nion.agents.lead_agent.prompt import apply_prompt_template
from nion.agents.middlewares.clarification_middleware import ClarificationMiddleware
from nion.agents.middlewares.continuity_middleware import ContinuityMiddleware
from nion.agents.middlewares.loop_detection_middleware import LoopDetectionMiddleware
from nion.agents.middlewares.memory_middleware import MemoryMiddleware
from nion.agents.middlewares.recall_capture_middleware import RecallCaptureMiddleware
from nion.agents.middlewares.subagent_limit_middleware import SubagentLimitMiddleware
from nion.agents.middlewares.todo_list_middleware import TodoListMiddleware
from nion.agents.middlewares.tool_error_handling_middleware import (
    build_lead_runtime_middlewares,
)
from nion.agents.middlewares.view_image_middleware import ViewImageMiddleware
from nion.agents.thread_state import ThreadState
from nion.config import get_app_config
from nion.config.agents_config import load_agent_config
from nion.model_management.service import get_model_registry_service
from nion.models import create_chat_model

logger = logging.getLogger(__name__)


def _resolve_model_name() -> str | None:
    registry = get_model_registry_service(app_config_provider=get_app_config)
    try:
        return registry.get_default_model().runtime_name
    except ValueError:
        return None


def _create_summarization_middleware():
    app_config = get_app_config()
    if not app_config.summarization.enabled:
        return None

    from nion.agents.middlewares.summarization_middleware import SummarizationMiddleware

    return SummarizationMiddleware()


def _create_todo_list_middleware(is_plan_mode: bool):
    if not is_plan_mode:
        return None
    return TodoListMiddleware()


# TodoListMiddleware should be before ClarificationMiddleware to allow todo management
# Title generation now happens out-of-band after the first exchange is persisted
# MemoryMiddleware queues conversation for memory update after the main reply
# RecallCaptureMiddleware archives the latest recallable exchange after each run
# ContinuityMiddleware injects thread-scoped recall before the next model call
# ViewImageMiddleware should be before ClarificationMiddleware to inject image details before LLM
# ToolErrorHandlingMiddleware should be before ClarificationMiddleware to convert tool exceptions to ToolMessages
# ClarificationMiddleware should be last to intercept clarification requests after model calls
def _build_middlewares(
    config: RunnableConfig,
    model_name: str | None,
    agent_name: str | None = None,
):
    surface = config.get("configurable", {}).get("surface", "workspace")
    middlewares = build_lead_runtime_middlewares(surface=surface, lazy_init=True)

    summarization_middleware = _create_summarization_middleware()
    if summarization_middleware is not None:
        middlewares.append(summarization_middleware)

    is_plan_mode = config.get("configurable", {}).get("is_plan_mode", False)
    todo_list_middleware = _create_todo_list_middleware(is_plan_mode)
    if todo_list_middleware is not None:
        middlewares.append(todo_list_middleware)

    middlewares.append(MemoryMiddleware(agent_name=agent_name))
    middlewares.append(RecallCaptureMiddleware(agent_name=agent_name or "lead_agent"))
    middlewares.append(ContinuityMiddleware())
    app_config = get_app_config()

    registry = get_model_registry_service(app_config_provider=get_app_config)
    resolved_model = None
    try:
      resolved_model = registry.resolve_model(model_name) if model_name else registry.get_default_model()
    except ValueError:
      resolved_model = None
    if resolved_model is not None and resolved_model.runtime_model_config.supports_vision:
        middlewares.append(ViewImageMiddleware())

    if app_config.tool_search.enabled:
        from nion.agents.middlewares.deferred_tool_filter_middleware import (
            DeferredToolFilterMiddleware,
        )

        middlewares.append(DeferredToolFilterMiddleware())

    subagent_enabled = config.get("configurable", {}).get("subagent_enabled", False)
    if subagent_enabled:
        max_concurrent_subagents = config.get("configurable", {}).get(
            "max_concurrent_subagents",
            3,
        )
        middlewares.append(SubagentLimitMiddleware(max_concurrent=max_concurrent_subagents))

    middlewares.append(LoopDetectionMiddleware())
    middlewares.append(ClarificationMiddleware())
    return middlewares


def make_lead_agent(config: RunnableConfig):
    from nion.tools import get_available_tools
    from nion.tools.builtins import setup_agent

    cfg = config.get("configurable", {})

    thinking_enabled = cfg.get("thinking_enabled", True)
    reasoning_effort = cfg.get("reasoning_effort", None)
    requested_model_name: str | None = cfg.get("model_name") or cfg.get("model")
    is_plan_mode = cfg.get("is_plan_mode", False)
    subagent_enabled = cfg.get("subagent_enabled", False)
    cli_tools_enabled = cfg.get("cli_tools_enabled", False)
    surface = cfg.get("surface", "workspace")
    max_concurrent_subagents = cfg.get("max_concurrent_subagents", 3)
    is_bootstrap = cfg.get("is_bootstrap", False)
    agent_name = cfg.get("agent_name")

    agent_config = load_agent_config(agent_name) if not is_bootstrap else None
    agent_model_name = (
        agent_config.model if agent_config and agent_config.model else _resolve_model_name()
    )
    model_name = requested_model_name or agent_model_name

    registry = get_model_registry_service(app_config_provider=get_app_config)
    try:
        resolved_model = (
            registry.resolve_model(model_name) if model_name else registry.get_default_model()
        )
    except ValueError as exc:
        raise ValueError(
            "No chat model could be resolved. Please configure at least one runtime model or provide a valid 'model_name'/'model' in the request."
        ) from exc
    model_name = resolved_model.runtime_name

    if thinking_enabled and not resolved_model.runtime_model_config.supports_thinking:
        logger.warning(
            "Thinking mode is enabled but model '%s' does not support it; fallback to non-thinking mode.",
            model_name,
        )
        thinking_enabled = False

    logger.info(
        "Create Agent(%s) -> thinking_enabled: %s, reasoning_effort: %s, model_name: %s, is_plan_mode: %s, subagent_enabled: %s, max_concurrent_subagents: %s",
        agent_name or "default",
        thinking_enabled,
        reasoning_effort,
        model_name,
        is_plan_mode,
        subagent_enabled,
        max_concurrent_subagents,
    )

    if "metadata" not in config:
        config["metadata"] = {}

    config["metadata"].update(
        {
            "agent_name": agent_name or "default",
            "model_name": model_name or "default",
            "thinking_enabled": thinking_enabled,
            "reasoning_effort": reasoning_effort,
            "is_plan_mode": is_plan_mode,
            "subagent_enabled": subagent_enabled,
        }
    )

    if is_bootstrap:
        return create_agent(
            model=create_chat_model(name=model_name, thinking_enabled=thinking_enabled),
            tools=get_available_tools(
                model_name=model_name,
                subagent_enabled=subagent_enabled,
                cli_tools_enabled=cli_tools_enabled,
                surface=surface,
            )
            + [setup_agent],
            middleware=_build_middlewares(config, model_name=model_name),
            system_prompt=apply_prompt_template(
                subagent_enabled=subagent_enabled,
                cli_tools_enabled=cli_tools_enabled,
                max_concurrent_subagents=max_concurrent_subagents,
                available_skills=set(["bootstrap"]),
            ),
            state_schema=ThreadState,
        )

    return create_agent(
        model=create_chat_model(
            name=model_name,
            thinking_enabled=thinking_enabled,
            reasoning_effort=reasoning_effort,
        ),
        tools=get_available_tools(
            model_name=model_name,
            groups=agent_config.tool_groups if agent_config else None,
            subagent_enabled=subagent_enabled,
            cli_tools_enabled=cli_tools_enabled,
            surface=surface,
        ),
        middleware=_build_middlewares(config, model_name=model_name, agent_name=agent_name),
        system_prompt=apply_prompt_template(
            subagent_enabled=subagent_enabled,
            cli_tools_enabled=cli_tools_enabled,
            max_concurrent_subagents=max_concurrent_subagents,
            agent_name=agent_name,
        ),
        state_schema=ThreadState,
    )
