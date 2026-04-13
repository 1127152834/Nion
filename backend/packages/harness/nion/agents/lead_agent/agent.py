import logging

from langchain.agents import create_agent
from langchain.agents.middleware import SummarizationMiddleware
from langchain_core.runnables import RunnableConfig

from nion.agents.lead_agent.prompt import apply_prompt_template
from nion.agents.middlewares.clarification_middleware import ClarificationMiddleware
from nion.agents.middlewares.continuity_middleware import ContinuityMiddleware
from nion.agents.middlewares.locale_aware_summarization import (
    LocaleAwareSummarizationMiddleware,
    build_summary_prompt_for_locale,
)
from nion.agents.middlewares.loop_detection_middleware import LoopDetectionMiddleware
from nion.agents.middlewares.recall_capture_middleware import RecallCaptureMiddleware
from nion.agents.middlewares.subagent_limit_middleware import SubagentLimitMiddleware
from nion.agents.middlewares.todo_middleware import TodoMiddleware
from nion.agents.middlewares.tool_error_handling_middleware import (
    build_lead_runtime_middlewares,
)
from nion.agents.middlewares.user_identity_middleware import UserIdentityMiddleware
from nion.agents.middlewares.view_image_middleware import ViewImageMiddleware
from nion.agents.thread_state import ThreadState
from nion.config.agents_config import load_agent_config
from nion.config.app_config import ensure_latest_app_config
from nion.config.summarization_config import (
    get_summarization_config,
)
from nion.model_management.service import get_model_registry_service
from nion.models import create_chat_model
from nion.models.factory import resolve_model_name_with_fallback

logger = logging.getLogger(__name__)


def get_app_config():
    return ensure_latest_app_config(process_name="langgraph")


def _resolve_model_name(requested_model_name: str | None = None) -> str:
    """Resolve a runtime model name safely, falling back to default if invalid."""
    registry = get_model_registry_service(app_config_provider=get_app_config)
    try:
        default_model = registry.get_default_model()
    except ValueError as exc:
        raise ValueError(
            "No chat models are configured. Please configure at least one runtime model."
        ) from exc
    default_model_name = default_model.runtime_name

    if requested_model_name:
        try:
            return registry.resolve_model(requested_model_name).runtime_name
        except ValueError:
            if requested_model_name != default_model_name:
                logger.warning(
                    "Model '%s' not found in runtime registry; fallback to default model '%s'.",
                    requested_model_name,
                    default_model_name,
                )
    return default_model_name


def _create_summarization_middleware() -> SummarizationMiddleware | None:
    """Create and configure the summarization middleware from config."""
    config = get_summarization_config()

    if not config.enabled:
        return None

    trigger = None
    if config.trigger is not None:
        if isinstance(config.trigger, list):
            trigger = [item.to_tuple() for item in config.trigger]
        else:
            trigger = config.trigger.to_tuple()

    keep = config.keep.to_tuple()

    if config.model_name:
        model_name = resolve_model_name_with_fallback(config.model_name)
        model = create_chat_model(name=model_name, thinking_enabled=False)
    else:
        model = create_chat_model(thinking_enabled=False)

    kwargs = {
        "model": model,
        "trigger": trigger,
        "keep": keep,
    }

    if config.trim_tokens_to_summarize is not None:
        kwargs["trim_tokens_to_summarize"] = config.trim_tokens_to_summarize

    kwargs["summary_prompt"] = config.summary_prompt or build_summary_prompt_for_locale(
        None
    )

    return LocaleAwareSummarizationMiddleware(**kwargs)


def _create_todo_list_middleware(is_plan_mode: bool) -> TodoMiddleware | None:
    """Create and configure the TodoList middleware."""
    if not is_plan_mode:
        return None

    system_prompt = """
<todo_list_system>
You have access to the `write_todos` tool to help you manage and track complex multi-step objectives.

**CRITICAL RULES:**
- Mark todos as completed IMMEDIATELY after finishing each step - do NOT batch completions
- Keep EXACTLY ONE task as `in_progress` at any time (unless tasks can run in parallel)
- Update the todo list in REAL-TIME as you work - this gives users visibility into your progress
- DO NOT use this tool for simple tasks (< 3 steps) - just complete them directly

**When to Use:**
This tool is designed for complex objectives that require systematic tracking:
- Complex multi-step tasks requiring 3+ distinct steps
- Non-trivial tasks needing careful planning and execution
- User explicitly requests a todo list
- User provides multiple tasks (numbered or comma-separated list)
- The plan may need revisions based on intermediate results

**When NOT to Use:**
- Single, straightforward tasks
- Trivial tasks (< 3 steps)
- Purely conversational or informational requests
- Simple tool calls where the approach is obvious

**Best Practices:**
- Break down complex tasks into smaller, actionable steps
- Use clear, descriptive task names
- Remove tasks that become irrelevant
- Add new tasks discovered during implementation
- Don't be afraid to revise the todo list as you learn more

**Task Management:**
Writing todos takes time and tokens - use it when helpful for managing complex problems, not for simple requests.
</todo_list_system>
"""

    tool_description = """Use this tool to create and manage a structured task list for complex work sessions.

**IMPORTANT: Only use this tool for complex tasks (3+ steps). For simple requests, just do the work directly.**

## When to Use

Use this tool in these scenarios:
1. **Complex multi-step tasks**: When a task requires 3 or more distinct steps or actions
2. **Non-trivial tasks**: Tasks requiring careful planning or multiple operations
3. **User explicitly requests todo list**: When the user directly asks you to track tasks
4. **Multiple tasks**: When users provide a list of things to be done
5. **Dynamic planning**: When the plan may need updates based on intermediate results

## When NOT to Use

Skip this tool when:
1. The task is straightforward and takes less than 3 steps
2. The task is trivial and tracking provides no benefit
3. The task is purely conversational or informational
4. It's clear what needs to be done and you can just do it

## How to Use

1. **Starting a task**: Mark it as `in_progress` BEFORE beginning work
2. **Completing a task**: Mark it as `completed` IMMEDIATELY after finishing
3. **Updating the list**: Add new tasks, remove irrelevant ones, or update descriptions as needed
4. **Multiple updates**: You can make several updates at once (e.g., complete one task and start the next)

## Task States

- `pending`: Task not yet started
- `in_progress`: Currently working on (can have multiple if tasks run in parallel)
- `completed`: Task finished successfully

## Task Completion Requirements

**CRITICAL: Only mark a task as completed when you have FULLY accomplished it.**

Never mark a task as completed if:
- There are unresolved issues or errors
- Work is partial or incomplete
- You encountered blockers preventing completion
- You couldn't find necessary resources or dependencies
- Quality standards haven't been met

If blocked, keep the task as `in_progress` and create a new task describing what needs to be resolved.

## Best Practices

- Create specific, actionable items
- Break complex tasks into smaller, manageable steps
- Use clear, descriptive task names
- Update task status in real-time as you work
- Mark tasks complete IMMEDIATELY after finishing (don't batch completions)
- Remove tasks that are no longer relevant
- **IMPORTANT**: When you write the todo list, mark your first task(s) as `in_progress` immediately
- **IMPORTANT**: Unless all tasks are completed, always have at least one task `in_progress` to show progress

Being proactive with task management demonstrates thoroughness and ensures all requirements are completed successfully.

**Remember**: If you only need a few tool calls to complete a task and it's clear what to do, it's better to just do the task directly and NOT use this tool at all.
"""

    return TodoMiddleware(system_prompt=system_prompt, tool_description=tool_description)


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

    middlewares.append(RecallCaptureMiddleware(agent_name=agent_name or "lead_agent"))
    middlewares.append(UserIdentityMiddleware())
    middlewares.append(ContinuityMiddleware())
    app_config = get_app_config()

    registry = get_model_registry_service(app_config_provider=get_app_config)
    resolved_model = None
    try:
        resolved_model = (
            registry.resolve_model(model_name) if model_name else registry.get_default_model()
        )
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
        middlewares.append(
            SubagentLimitMiddleware(max_concurrent=max_concurrent_subagents)
        )

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
                thread_id=str(config.get("configurable", {}).get("thread_id") or ""),
                memory_read=bool(config.get("configurable", {}).get("memory_read", True)),
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
            thread_id=str(config.get("configurable", {}).get("thread_id") or ""),
            memory_read=bool(config.get("configurable", {}).get("memory_read", True)),
        ),
        state_schema=ThreadState,
    )
