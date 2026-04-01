"""GuardrailMiddleware - evaluates tool calls against a GuardrailProvider before execution."""

import logging
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from typing import Any, override

from langchain.agents import AgentState
from langchain.agents.middleware import AgentMiddleware
from langchain_core.messages import HumanMessage, ToolMessage
from langgraph.errors import GraphBubbleUp
from langgraph.graph import END
from langgraph.prebuilt.tool_node import ToolCallRequest
from langgraph.types import Command

from nion.thread_permissions import (
    consume_thread_pending_allow,
    create_thread_permission_request,
    get_thread_permission_profile,
)
from nion.threads.repository import ThreadRepository
from nion.guardrails.provider import GuardrailDecision, GuardrailProvider, GuardrailReason, GuardrailRequest

logger = logging.getLogger(__name__)


class GuardrailMiddleware(AgentMiddleware[AgentState]):
    """Evaluate tool calls against a GuardrailProvider before execution.

    Denied calls return an error ToolMessage so the agent can adapt.
    If the provider raises, behavior depends on fail_closed:
      - True (default): block the call
      - False: allow it through with a warning
    """

    def __init__(self, provider: GuardrailProvider, *, fail_closed: bool = True, passport: str | None = None):
        self.provider = provider
        self.fail_closed = fail_closed
        self.passport = passport

    def _build_request(self, request: ToolCallRequest) -> GuardrailRequest:
        context = getattr(request, "context", {}) or {}
        return GuardrailRequest(
            tool_name=str(request.tool_call.get("name", "")),
            tool_input=request.tool_call.get("args", {}),
            agent_id=self.passport,
            thread_id=context.get("thread_id"),
            timestamp=datetime.now(UTC).isoformat(),
        )

    def _is_bridge_surface(self, request: ToolCallRequest) -> bool:
        context = getattr(request, "context", {}) or {}
        return context.get("surface") == "bridge"

    def _supports_permission_request(self, request: ToolCallRequest, decision: GuardrailDecision) -> bool:
        reason_code = decision.reasons[0].code if decision.reasons else ""
        if reason_code != "oap.approval_required":
            return False
        context = getattr(request, "context", {}) or {}
        return bool(context.get("thread_id"))

    def _is_cli_management_tool(self, tool_name: str) -> bool:
        return tool_name.startswith("codepilot_cli_tools_")

    def _extract_latest_human_message(self, request: ToolCallRequest) -> str:
        state = getattr(request, "state", {}) or {}
        messages = state.get("messages", [])
        for message in reversed(messages):
            if isinstance(message, HumanMessage):
                content = getattr(message, "content", "")
                return self._extract_human_text_content(content)
            if isinstance(message, dict) and message.get("type") == "human":
                content = message.get("content", "")
                return self._extract_human_text_content(content)
        return ""

    def _extract_human_text_content(self, content: Any) -> str:
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            text_parts: list[str] = []
            for part in content:
                if isinstance(part, dict) and part.get("type") == "text":
                    text = part.get("text")
                    if isinstance(text, str):
                        text_parts.append(text)
                elif isinstance(part, str):
                    text_parts.append(part)
            return "\n".join(text_parts)
        return str(content)

    def _extract_latest_human_replay_payload(
        self,
        request: ToolCallRequest,
    ) -> dict[str, Any]:
        state = getattr(request, "state", {}) or {}
        messages = state.get("messages", [])
        for message in reversed(messages):
            if isinstance(message, HumanMessage):
                content = getattr(message, "content", "")
                additional_kwargs = getattr(message, "additional_kwargs", None) or {}
                text = self._extract_human_text_content(content)
                files = additional_kwargs.get("files", [])
                return {
                    "text": text,
                    "files": files if isinstance(files, list) else [],
                    "additional_kwargs": additional_kwargs,
                }
            if isinstance(message, dict) and message.get("type") == "human":
                content = message.get("content", "")
                additional_kwargs = message.get("additional_kwargs", {})
                text = self._extract_human_text_content(content)
                files = (
                    additional_kwargs.get("files", [])
                    if isinstance(additional_kwargs, dict)
                    else []
                )
                return {
                    "text": text,
                    "files": files if isinstance(files, list) else [],
                    "additional_kwargs": additional_kwargs
                    if isinstance(additional_kwargs, dict)
                    else {},
                }
        return {
            "text": "",
            "files": [],
            "additional_kwargs": {},
        }

    def _build_permission_request_command(
        self,
        request: ToolCallRequest,
        decision: GuardrailDecision,
    ) -> Command:
        thread_id = str((getattr(request, "context", {}) or {}).get("thread_id") or "")
        tool_name = str(request.tool_call.get("name", "unknown_tool"))
        tool_call_id = str(request.tool_call.get("id", "missing_id"))
        tool_input = request.tool_call.get("args", {}) or {}
        original_message_text = self._extract_latest_human_message(request)
        replay_payload = self._extract_latest_human_replay_payload(request)
        permission_request = create_thread_permission_request(
            thread_id=thread_id,
            tool_name=tool_name,
            tool_input=tool_input,
            original_message_text=original_message_text,
            replay_payload=replay_payload,
        )
        if thread_id and self._is_cli_management_tool(tool_name):
            ThreadRepository().update_state(
                thread_id,
                {
                    "cli_management": {
                        "active": True,
                        "phase": "awaiting_permission",
                        "last_trigger": "permission_request",
                        "last_intent": "install",
                        "pending_permission_request_id": permission_request.id,
                        "followup_turns_remaining": 1,
                        "updated_at": datetime.now(UTC).isoformat(),
                    }
                },
            )

        summary = str(tool_input)
        if isinstance(tool_input, dict):
            try:
                import json

                summary = json.dumps(tool_input, ensure_ascii=False, indent=2)
            except Exception:
                summary = str(tool_input)
        if len(summary) > 300:
            summary = summary[:300] + "..."

        tool_message = ToolMessage(
            content=(
                "🔐 需要确认后才能继续。\n\n"
                f"工具: {tool_name}\n"
                f"参数:\n{summary}"
            ),
            tool_call_id=tool_call_id,
            name="permission_request",
            additional_kwargs={
                "permission_request": {
                    "id": permission_request.id,
                    "tool_name": tool_name,
                    "tool_input": tool_input,
                    "actions": [
                        {"key": "allow", "label": "Allow"},
                        {"key": "allow_session", "label": "Allow Session"},
                        {"key": "deny", "label": "Deny"},
                    ],
                    "options": ["Allow", "Allow Session", "Deny"],
                    "reason_code": decision.reasons[0].code if decision.reasons else "oap.approval_required",
                    "reason_message": decision.reasons[0].message if decision.reasons else "",
                },
                "tool_runtime": {
                    "status": "approval_required",
                    "stage": "request_permission",
                    "tool_name": tool_name,
                    "tool_call_id": tool_call_id,
                },
                "hook_event": {
                    "event": "permission_request",
                    "mode": "in_runtime",
                },
            },
        )
        return Command(update={"messages": [tool_message]}, goto=END)

    def _build_denied_message(self, request: ToolCallRequest, decision: GuardrailDecision) -> ToolMessage:
        tool_name = str(request.tool_call.get("name", "unknown_tool"))
        tool_call_id = str(request.tool_call.get("id", "missing_id"))
        reason_text = decision.reasons[0].message if decision.reasons else "blocked by guardrail policy"
        reason_code = decision.reasons[0].code if decision.reasons else "oap.denied"
        return ToolMessage(
            content=f"Guardrail denied: tool '{tool_name}' was blocked ({reason_code}). Reason: {reason_text}. Choose an alternative approach.",
            tool_call_id=tool_call_id,
            name=tool_name,
            status="error",
            additional_kwargs={
                "tool_runtime": {
                    "status": "failed"
                    if reason_code == "oap.evaluator_error"
                    else "denied",
                    "stage": "check_policy",
                    "tool_name": tool_name,
                    "tool_call_id": tool_call_id,
                    "reason_code": reason_code,
                },
                "hook_event": {
                    "event": "permission_denied",
                    "mode": "in_runtime",
                },
            },
        )

    @override
    def wrap_tool_call(
        self,
        request: ToolCallRequest,
        handler: Callable[[ToolCallRequest], ToolMessage | Command],
    ) -> ToolMessage | Command:
        gr = self._build_request(request)
        if self._is_bridge_surface(request) and gr.thread_id:
            if get_thread_permission_profile(gr.thread_id) == "full_access":
                return handler(request)
            if consume_thread_pending_allow(
                thread_id=gr.thread_id,
                tool_name=gr.tool_name,
                tool_input=gr.tool_input,
            ):
                return handler(request)
        try:
            decision = self.provider.evaluate(gr)
        except GraphBubbleUp:
            # Preserve LangGraph control-flow signals (interrupt/pause/resume).
            raise
        except Exception:
            logger.exception("Guardrail provider error (sync)")
            if self.fail_closed:
                decision = GuardrailDecision(allow=False, reasons=[GuardrailReason(code="oap.evaluator_error", message="guardrail provider error (fail-closed)")])
            else:
                return handler(request)
        if not decision.allow:
            if self._supports_permission_request(request, decision):
                return self._build_permission_request_command(request, decision)
            logger.warning("Guardrail denied: tool=%s policy=%s code=%s", gr.tool_name, decision.policy_id, decision.reasons[0].code if decision.reasons else "unknown")
            return self._build_denied_message(request, decision)
        return handler(request)

    @override
    async def awrap_tool_call(
        self,
        request: ToolCallRequest,
        handler: Callable[[ToolCallRequest], Awaitable[ToolMessage | Command]],
    ) -> ToolMessage | Command:
        gr = self._build_request(request)
        if self._is_bridge_surface(request) and gr.thread_id:
            if get_thread_permission_profile(gr.thread_id) == "full_access":
                return await handler(request)
            if consume_thread_pending_allow(
                thread_id=gr.thread_id,
                tool_name=gr.tool_name,
                tool_input=gr.tool_input,
            ):
                return await handler(request)
        try:
            decision = await self.provider.aevaluate(gr)
        except GraphBubbleUp:
            # Preserve LangGraph control-flow signals (interrupt/pause/resume).
            raise
        except Exception:
            logger.exception("Guardrail provider error (async)")
            if self.fail_closed:
                decision = GuardrailDecision(allow=False, reasons=[GuardrailReason(code="oap.evaluator_error", message="guardrail provider error (fail-closed)")])
            else:
                return await handler(request)
        if not decision.allow:
            if self._supports_permission_request(request, decision):
                return self._build_permission_request_command(request, decision)
            logger.warning("Guardrail denied: tool=%s policy=%s code=%s", gr.tool_name, decision.policy_id, decision.reasons[0].code if decision.reasons else "unknown")
            return self._build_denied_message(request, decision)
        return await handler(request)
