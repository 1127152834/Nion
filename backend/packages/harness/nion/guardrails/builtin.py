"""Built-in guardrail providers that ship with Nion."""

from nion.guardrails.provider import GuardrailDecision, GuardrailReason, GuardrailRequest


class AllowlistProvider:
    """Simple allowlist/denylist provider. No external dependencies."""

    name = "allowlist"

    def __init__(
        self,
        *,
        allowed_tools: list[str] | None = None,
        denied_tools: list[str] | None = None,
        approval_tools: list[str] | None = None,
    ):
        self._allowed = set(allowed_tools) if allowed_tools else None
        self._denied = set(denied_tools) if denied_tools else set()
        self._approval = set(approval_tools) if approval_tools else set()

    def evaluate(self, request: GuardrailRequest) -> GuardrailDecision:
        if request.tool_name in self._approval:
            return GuardrailDecision(
                allow=False,
                reasons=[GuardrailReason(code="oap.approval_required", message=f"tool '{request.tool_name}' requires approval")],
                metadata={"bridge_behavior": "request_approval"},
            )
        if self._allowed is not None and request.tool_name not in self._allowed:
            return GuardrailDecision(allow=False, reasons=[GuardrailReason(code="oap.tool_not_allowed", message=f"tool '{request.tool_name}' not in allowlist")])
        if request.tool_name in self._denied:
            return GuardrailDecision(allow=False, reasons=[GuardrailReason(code="oap.tool_not_allowed", message=f"tool '{request.tool_name}' is denied")])
        return GuardrailDecision(allow=True, reasons=[GuardrailReason(code="oap.allowed")])

    async def aevaluate(self, request: GuardrailRequest) -> GuardrailDecision:
        return self.evaluate(request)
