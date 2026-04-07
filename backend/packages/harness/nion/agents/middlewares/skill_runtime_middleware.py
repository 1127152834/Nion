from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any, override

from langchain.agents import AgentState
from langchain.agents.middleware import AgentMiddleware
from langchain.agents.middleware.types import ModelCallResult, ModelRequest, ModelResponse
from langchain_core.messages import ToolMessage
from langgraph.types import Command

from nion.models import create_chat_model
from nion.skills.runtime import matches_skill_hook, normalize_active_skill


class SkillRuntimeMiddleware(AgentMiddleware[AgentState]):
    """Apply active skill runtime constraints to model binding and state."""

    def _resolve_model_override(self, model_name: str):
        return create_chat_model(name=model_name, thinking_enabled=True)

    def _extract_active_skill_state(self, result: ToolMessage | Command) -> dict[str, Any] | None:
        if isinstance(result, Command):
            update = result.update or {}
            active_skill = update.get("active_skill")
            if isinstance(active_skill, dict):
                return active_skill
            return None

        additional_kwargs = getattr(result, "additional_kwargs", None) or {}
        active_skill = additional_kwargs.get("active_skill")
        if isinstance(active_skill, dict):
            return normalize_active_skill(active_skill)
        return None

    def _matches_skill_hook(self, active_skill: dict[str, Any] | None, event_name: str) -> bool:
        return matches_skill_hook(active_skill, event_name)

    def _apply_skill_runtime(self, request: ModelRequest) -> ModelRequest:
        state = getattr(request, "state", {}) or {}
        active_skill = normalize_active_skill(state.get("active_skill"))
        if active_skill is None:
            return request

        overrides: dict[str, Any] = {}

        allowed_tools = active_skill.get("allowed_tools")
        if isinstance(allowed_tools, list):
            allowed_names = {item.strip() for item in allowed_tools if isinstance(item, str) and item.strip()}
            if allowed_names:
                overrides["tools"] = [tool for tool in request.tools if getattr(tool, "name", None) in allowed_names]

        model_name = active_skill.get("model")
        if isinstance(model_name, str) and model_name.strip():
            overrides["model"] = self._resolve_model_override(model_name.strip())

        effort = active_skill.get("effort")
        if isinstance(effort, str) and effort.strip():
            overrides["model_settings"] = {
                **(request.model_settings or {}),
                "reasoning_effort": effort.strip(),
            }

        if not overrides:
            return request
        return request.override(**overrides)

    @override
    def wrap_model_call(
        self,
        request: ModelRequest,
        handler: Callable[[ModelRequest], ModelResponse],
    ) -> ModelCallResult:
        return handler(self._apply_skill_runtime(request))

    @override
    async def awrap_model_call(
        self,
        request: ModelRequest,
        handler: Callable[[ModelRequest], Awaitable[ModelResponse]],
    ) -> ModelCallResult:
        return await handler(self._apply_skill_runtime(request))
