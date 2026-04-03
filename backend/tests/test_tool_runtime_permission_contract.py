from __future__ import annotations

from types import SimpleNamespace

import pytest
from langgraph.errors import GraphBubbleUp

from nion.agents.middlewares.tool_error_handling_middleware import ToolErrorHandlingMiddleware
from nion.guardrails.middleware import GuardrailMiddleware
from nion.guardrails.provider import GuardrailDecision, GuardrailReason, GuardrailRequest


def _request(name: str = "bash", args: dict | None = None, tool_call_id: str = "call-1"):
    return SimpleNamespace(
        tool_call={"name": name, "args": args or {}, "id": tool_call_id},
        context={},
        state={},
    )


class _ApprovalProvider:
    def evaluate(self, request: GuardrailRequest) -> GuardrailDecision:
        return GuardrailDecision(
            allow=False,
            reasons=[GuardrailReason(code="oap.approval_required", message="approval required")],
        )

    async def aevaluate(self, request: GuardrailRequest) -> GuardrailDecision:
        return self.evaluate(request)


class _DenyProvider:
    def evaluate(self, request: GuardrailRequest) -> GuardrailDecision:
        return GuardrailDecision(
            allow=False,
            reasons=[GuardrailReason(code="oap.denied", message="blocked")],
        )

    async def aevaluate(self, request: GuardrailRequest) -> GuardrailDecision:
        return self.evaluate(request)


class _ExplodingProvider:
    def evaluate(self, request: GuardrailRequest) -> GuardrailDecision:
        raise RuntimeError("provider crashed")

    async def aevaluate(self, request: GuardrailRequest) -> GuardrailDecision:
        raise RuntimeError("provider crashed")


def test_guardrail_denied_message_exposes_runtime_status() -> None:
    middleware = GuardrailMiddleware(_DenyProvider())
    result = middleware.wrap_tool_call(_request(), lambda _req: None)

    assert result.status == "error"
    assert result.additional_kwargs["tool_runtime"] == {
        "status": "denied",
        "stage": "check_policy",
        "tool_name": "bash",
        "tool_call_id": "call-1",
    }


def test_guardrail_permission_request_exposes_runtime_status() -> None:
    middleware = GuardrailMiddleware(_ApprovalProvider())
    request = _request()
    request.context = {"thread_id": "thread-1"}
    result = middleware.wrap_tool_call(request, lambda _req: None)

    tool_message = result.update["messages"][0]
    assert tool_message.name == "permission_request"
    assert tool_message.additional_kwargs["tool_runtime"] == {
        "status": "approval_required",
        "stage": "request_permission",
        "tool_name": "bash",
        "tool_call_id": "call-1",
    }


def test_guardrail_fail_closed_exposes_runtime_status() -> None:
    middleware = GuardrailMiddleware(_ExplodingProvider(), fail_closed=True)
    result = middleware.wrap_tool_call(_request(), lambda _req: None)

    assert result.status == "error"
    assert result.additional_kwargs["tool_runtime"] == {
        "status": "failed",
        "stage": "check_policy",
        "tool_name": "bash",
        "tool_call_id": "call-1",
    }


def test_tool_error_message_exposes_runtime_status() -> None:
    middleware = ToolErrorHandlingMiddleware()

    def _boom(_req):
        raise RuntimeError("network down")

    result = middleware.wrap_tool_call(_request(name="web_search", tool_call_id="tc-1"), _boom)

    assert result.status == "error"
    assert result.additional_kwargs["tool_runtime"] == {
        "status": "failed",
        "stage": "execute",
        "tool_name": "web_search",
        "tool_call_id": "tc-1",
    }


def test_graph_bubble_up_still_propagates() -> None:
    middleware = ToolErrorHandlingMiddleware()

    def _bubble(_req):
        raise GraphBubbleUp()

    with pytest.raises(GraphBubbleUp):
        middleware.wrap_tool_call(_request(), _bubble)
