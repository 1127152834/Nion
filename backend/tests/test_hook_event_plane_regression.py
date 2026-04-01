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


class _DenyProvider:
    def evaluate(self, request: GuardrailRequest) -> GuardrailDecision:
        return GuardrailDecision(
            allow=False,
            reasons=[GuardrailReason(code="oap.denied", message="blocked")],
        )

    async def aevaluate(self, request: GuardrailRequest) -> GuardrailDecision:
        return self.evaluate(request)


def test_guardrail_denied_message_emits_hook_event_metadata() -> None:
    middleware = GuardrailMiddleware(_DenyProvider())
    result = middleware.wrap_tool_call(_request(), lambda _req: None)

    assert result.additional_kwargs["hook_event"]["event"] == "permission_denied"
    assert result.additional_kwargs["hook_event"]["mode"] == "in_runtime"


def test_tool_error_message_emits_hook_event_metadata() -> None:
    middleware = ToolErrorHandlingMiddleware()

    def _boom(_req):
        raise RuntimeError("network down")

    result = middleware.wrap_tool_call(_request(name="web_search"), _boom)

    assert result.additional_kwargs["hook_event"]["event"] == "post_tool_use_failure"
    assert result.additional_kwargs["hook_event"]["mode"] == "in_runtime"


def test_graph_bubble_up_is_not_swallowed() -> None:
    middleware = ToolErrorHandlingMiddleware()

    def _bubble(_req):
        raise GraphBubbleUp()

    with pytest.raises(GraphBubbleUp):
        middleware.wrap_tool_call(_request(), _bubble)
