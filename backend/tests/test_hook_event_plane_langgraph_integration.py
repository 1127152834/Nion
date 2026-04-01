from types import SimpleNamespace

from nion.agents.middlewares.clarification_middleware import ClarificationMiddleware
from nion.guardrails.middleware import GuardrailMiddleware
from nion.guardrails.provider import GuardrailDecision, GuardrailReason, GuardrailRequest


def _request(name: str, args: dict | None = None, tool_call_id: str = "call-1"):
    return SimpleNamespace(
        tool_call={"name": name, "args": args or {}, "id": tool_call_id},
        context={"thread_id": "thread-1"},
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


def test_clarification_middleware_emits_hook_event_metadata() -> None:
    middleware = ClarificationMiddleware()
    request = _request(
        "ask_clarification",
        {
            "question": "Which environment?",
            "clarification_type": "approach_choice",
        },
    )

    result = middleware.wrap_tool_call(request, lambda _req: None)
    tool_message = result.update["messages"][0]

    assert tool_message.additional_kwargs["hook_event"]["event"] == "user_prompt_submit"
    assert tool_message.additional_kwargs["hook_event"]["mode"] == "in_runtime"


def test_guardrail_permission_request_emits_hook_event_metadata() -> None:
    middleware = GuardrailMiddleware(_ApprovalProvider())
    result = middleware.wrap_tool_call(_request("bash"), lambda _req: None)
    tool_message = result.update["messages"][0]

    assert tool_message.additional_kwargs["hook_event"]["event"] == "permission_request"
    assert tool_message.additional_kwargs["hook_event"]["mode"] == "in_runtime"
