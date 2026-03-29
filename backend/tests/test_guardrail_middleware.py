"""Tests for the guardrail middleware and built-in providers."""

from __future__ import annotations

import asyncio
from unittest.mock import MagicMock

import pytest
from langchain_core.messages import HumanMessage
from langgraph.errors import GraphBubbleUp

from nion.guardrails.builtin import AllowlistProvider
from nion.guardrails.middleware import GuardrailMiddleware
from nion.guardrails.provider import GuardrailDecision, GuardrailReason, GuardrailRequest
from nion.threads.repository import ThreadRepository

# --- Helpers ---


def _make_tool_call_request(name: str = "bash", args: dict | None = None, call_id: str = "call_1"):
    """Create a mock ToolCallRequest."""
    req = MagicMock()
    req.tool_call = {"name": name, "args": args or {}, "id": call_id}
    req.context = {}
    req.state = {}
    return req


class _AllowAllProvider:
    name = "allow-all"

    def evaluate(self, request: GuardrailRequest) -> GuardrailDecision:
        return GuardrailDecision(allow=True, reasons=[GuardrailReason(code="oap.allowed")])

    async def aevaluate(self, request: GuardrailRequest) -> GuardrailDecision:
        return self.evaluate(request)


class _DenyAllProvider:
    name = "deny-all"

    def evaluate(self, request: GuardrailRequest) -> GuardrailDecision:
        return GuardrailDecision(
            allow=False,
            reasons=[GuardrailReason(code="oap.denied", message="all tools blocked")],
            policy_id="test.deny.v1",
        )

    async def aevaluate(self, request: GuardrailRequest) -> GuardrailDecision:
        return self.evaluate(request)


class _ApprovalProvider:
    name = "approval"

    def evaluate(self, request: GuardrailRequest) -> GuardrailDecision:
        return GuardrailDecision(
            allow=False,
            reasons=[GuardrailReason(code="oap.approval_required", message="approval required")],
            metadata={"bridge_behavior": "request_approval"},
        )

    async def aevaluate(self, request: GuardrailRequest) -> GuardrailDecision:
        return self.evaluate(request)


class _ExplodingProvider:
    name = "exploding"

    def evaluate(self, request: GuardrailRequest) -> GuardrailDecision:
        raise RuntimeError("provider crashed")

    async def aevaluate(self, request: GuardrailRequest) -> GuardrailDecision:
        raise RuntimeError("provider crashed")


# --- AllowlistProvider tests ---


class TestAllowlistProvider:
    def test_no_restrictions_allows_all(self):
        provider = AllowlistProvider()
        req = GuardrailRequest(tool_name="bash", tool_input={})
        decision = provider.evaluate(req)
        assert decision.allow is True

    def test_denied_tools(self):
        provider = AllowlistProvider(denied_tools=["bash", "write_file"])
        req = GuardrailRequest(tool_name="bash", tool_input={})
        decision = provider.evaluate(req)
        assert decision.allow is False
        assert decision.reasons[0].code == "oap.tool_not_allowed"

    def test_denied_tools_allows_unlisted(self):
        provider = AllowlistProvider(denied_tools=["bash"])
        req = GuardrailRequest(tool_name="web_search", tool_input={})
        decision = provider.evaluate(req)
        assert decision.allow is True

    def test_allowed_tools_blocks_unlisted(self):
        provider = AllowlistProvider(allowed_tools=["web_search", "read_file"])
        req = GuardrailRequest(tool_name="bash", tool_input={})
        decision = provider.evaluate(req)
        assert decision.allow is False

    def test_allowed_tools_allows_listed(self):
        provider = AllowlistProvider(allowed_tools=["web_search"])
        req = GuardrailRequest(tool_name="web_search", tool_input={})
        decision = provider.evaluate(req)
        assert decision.allow is True

    def test_both_allowed_and_denied(self):
        provider = AllowlistProvider(allowed_tools=["bash", "web_search"], denied_tools=["bash"])
        # bash is in both: allowlist passes, denylist blocks
        req = GuardrailRequest(tool_name="bash", tool_input={})
        decision = provider.evaluate(req)
        assert decision.allow is False

    def test_async_delegates_to_sync(self):
        provider = AllowlistProvider(denied_tools=["bash"])
        req = GuardrailRequest(tool_name="bash", tool_input={})
        decision = asyncio.run(provider.aevaluate(req))
        assert decision.allow is False

    def test_approval_tools_require_explicit_approval(self):
        provider = AllowlistProvider(
            approval_tools=[
                "codepilot_cli_tools_install",
                "codepilot_cli_tools_update",
            ]
        )

        install_decision = provider.evaluate(
            GuardrailRequest(tool_name="codepilot_cli_tools_install", tool_input={})
        )
        update_decision = provider.evaluate(
            GuardrailRequest(tool_name="codepilot_cli_tools_update", tool_input={})
        )

        assert install_decision.allow is False
        assert install_decision.reasons[0].code == "oap.approval_required"
        assert install_decision.metadata["bridge_behavior"] == "request_approval"

        assert update_decision.allow is False
        assert update_decision.reasons[0].code == "oap.approval_required"
        assert update_decision.metadata["bridge_behavior"] == "request_approval"


# --- GuardrailMiddleware tests ---


class TestGuardrailMiddleware:
    def test_allowed_tool_passes_through(self):
        mw = GuardrailMiddleware(_AllowAllProvider())
        req = _make_tool_call_request("web_search")
        expected = MagicMock()
        handler = MagicMock(return_value=expected)
        result = mw.wrap_tool_call(req, handler)
        handler.assert_called_once_with(req)
        assert result is expected

    def test_denied_tool_returns_error_message(self):
        mw = GuardrailMiddleware(_DenyAllProvider())
        req = _make_tool_call_request("bash")
        handler = MagicMock()
        result = mw.wrap_tool_call(req, handler)
        handler.assert_not_called()
        assert result.status == "error"
        assert "oap.denied" in result.content
        assert result.name == "bash"

    def test_fail_closed_on_provider_error(self):
        mw = GuardrailMiddleware(_ExplodingProvider(), fail_closed=True)
        req = _make_tool_call_request("bash")
        handler = MagicMock()
        result = mw.wrap_tool_call(req, handler)
        handler.assert_not_called()
        assert result.status == "error"
        assert "oap.evaluator_error" in result.content

    def test_fail_open_on_provider_error(self):
        mw = GuardrailMiddleware(_ExplodingProvider(), fail_closed=False)
        req = _make_tool_call_request("bash")
        expected = MagicMock()
        handler = MagicMock(return_value=expected)
        result = mw.wrap_tool_call(req, handler)
        handler.assert_called_once_with(req)
        assert result is expected

    def test_passport_passed_as_agent_id(self):
        captured = {}

        class CapturingProvider:
            name = "capture"

            def evaluate(self, request):
                captured["agent_id"] = request.agent_id
                return GuardrailDecision(allow=True)

            async def aevaluate(self, request):
                return self.evaluate(request)

        mw = GuardrailMiddleware(CapturingProvider(), passport="./guardrails/passport.json")
        req = _make_tool_call_request("bash")
        mw.wrap_tool_call(req, MagicMock())
        assert captured["agent_id"] == "./guardrails/passport.json"

    def test_decision_contains_oap_reason_codes(self):
        mw = GuardrailMiddleware(_DenyAllProvider())
        req = _make_tool_call_request("bash")
        result = mw.wrap_tool_call(req, MagicMock())
        assert "oap.denied" in result.content
        assert "all tools blocked" in result.content

    def test_deny_with_empty_reasons_uses_fallback(self):
        """Provider returns deny with empty reasons list -- middleware uses fallback text."""

        class EmptyReasonProvider:
            name = "empty-reason"

            def evaluate(self, request):
                return GuardrailDecision(allow=False, reasons=[])

            async def aevaluate(self, request):
                return self.evaluate(request)

        mw = GuardrailMiddleware(EmptyReasonProvider())
        req = _make_tool_call_request("bash")
        result = mw.wrap_tool_call(req, MagicMock())
        assert result.status == "error"
        assert "blocked by guardrail policy" in result.content

    def test_empty_tool_name(self):
        """Tool call with empty name is handled gracefully."""
        mw = GuardrailMiddleware(_AllowAllProvider())
        req = _make_tool_call_request("")
        expected = MagicMock()
        handler = MagicMock(return_value=expected)
        result = mw.wrap_tool_call(req, handler)
        assert result is expected

    def test_protocol_isinstance_check(self):
        """AllowlistProvider satisfies GuardrailProvider protocol at runtime."""
        from nion.guardrails.provider import GuardrailProvider

        assert isinstance(AllowlistProvider(), GuardrailProvider)

    def test_async_allowed(self):
        mw = GuardrailMiddleware(_AllowAllProvider())
        req = _make_tool_call_request("web_search")
        expected = MagicMock()

        async def handler(r):
            return expected

        async def run():
            return await mw.awrap_tool_call(req, handler)

        result = asyncio.run(run())
        assert result is expected

    def test_async_denied(self):
        mw = GuardrailMiddleware(_DenyAllProvider())
        req = _make_tool_call_request("bash")

        async def handler(r):
            return MagicMock()

        async def run():
            return await mw.awrap_tool_call(req, handler)

        result = asyncio.run(run())
        assert result.status == "error"

    def test_async_fail_closed(self):
        mw = GuardrailMiddleware(_ExplodingProvider(), fail_closed=True)
        req = _make_tool_call_request("bash")

        async def handler(r):
            return MagicMock()

        async def run():
            return await mw.awrap_tool_call(req, handler)

        result = asyncio.run(run())
        assert result.status == "error"

    def test_async_fail_open(self):
        mw = GuardrailMiddleware(_ExplodingProvider(), fail_closed=False)
        req = _make_tool_call_request("bash")
        expected = MagicMock()

        async def handler(r):
            return expected

        async def run():
            return await mw.awrap_tool_call(req, handler)

        result = asyncio.run(run())
        assert result is expected

    def test_bridge_surface_denial_can_become_permission_request(self):
        mw = GuardrailMiddleware(_ApprovalProvider())
        req = _make_tool_call_request("bash", {"command": "rm -rf /tmp/test"})
        req.context = {"thread_id": "t-bridge", "surface": "bridge"}
        req.state = {"messages": [HumanMessage(content="delete temp files", id="h-1")]}

        result = mw.wrap_tool_call(req, MagicMock())
        assert hasattr(result, "goto")
        tool_message = result.update["messages"][0]
        assert tool_message.name == "permission_request"
        assert tool_message.additional_kwargs["permission_request"]["tool_name"] == "bash"

    def test_workspace_surface_cli_install_can_become_permission_request(self):
        mw = GuardrailMiddleware(_ApprovalProvider())
        req = _make_tool_call_request(
            "codepilot_cli_tools_install",
            {"command": "brew install stripe/stripe-cli/stripe"},
        )
        req.context = {"thread_id": "t-workspace", "surface": "workspace"}
        req.state = {"messages": [HumanMessage(content="帮我安装 stripe CLI", id="h-1")]}

        result = mw.wrap_tool_call(req, MagicMock())
        assert hasattr(result, "goto")
        tool_message = result.update["messages"][0]
        assert tool_message.name == "permission_request"
        assert tool_message.additional_kwargs["permission_request"]["tool_name"] == "codepilot_cli_tools_install"

    def test_permission_request_payload_exposes_decision_keys(self):
        mw = GuardrailMiddleware(_ApprovalProvider())
        req = _make_tool_call_request(
            "codepilot_cli_tools_install",
            {"command": "brew install stripe/stripe-cli/stripe"},
        )
        req.context = {"thread_id": "t-workspace", "surface": "workspace"}
        req.state = {"messages": [HumanMessage(content="帮我安装 stripe CLI", id="h-1")]}

        result = mw.wrap_tool_call(req, MagicMock())
        tool_message = result.update["messages"][0]
        assert tool_message.additional_kwargs["permission_request"]["actions"] == [
            {"key": "allow", "label": "Allow"},
            {"key": "allow_session", "label": "Allow Session"},
            {"key": "deny", "label": "Deny"},
        ]

    def test_cli_permission_request_marks_thread_state_awaiting_permission(
        self,
        tmp_path,
        monkeypatch,
    ):
        monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))

        mw = GuardrailMiddleware(_ApprovalProvider())
        req = _make_tool_call_request(
            "codepilot_cli_tools_install",
            {"command": "brew install stripe/stripe-cli/stripe"},
        )
        req.context = {"thread_id": "t-cli", "surface": "workspace"}
        req.state = {"messages": [HumanMessage(content="帮我安装 stripe CLI", id="h-1")]}

        result = mw.wrap_tool_call(req, MagicMock())
        tool_message = result.update["messages"][0]
        permission_request_id = tool_message.additional_kwargs["permission_request"]["id"]

        thread = ThreadRepository(base_dir=tmp_path / "nion-home").get_thread("t-cli")
        assert thread is not None
        assert thread.values.cli_management.phase == "awaiting_permission"
        assert thread.values.cli_management.active is True
        assert thread.values.cli_management.pending_permission_request_id == permission_request_id
        assert thread.values.cli_management.last_trigger == "permission_request"
        assert thread.values.cli_management.last_intent == "install"

    def test_graph_bubble_up_not_swallowed(self):
        """GraphBubbleUp (LangGraph interrupt/pause) must propagate, not be caught."""

        class BubbleProvider:
            name = "bubble"

            def evaluate(self, request):
                raise GraphBubbleUp()

            async def aevaluate(self, request):
                raise GraphBubbleUp()

        mw = GuardrailMiddleware(BubbleProvider(), fail_closed=True)
        req = _make_tool_call_request("bash")
        with pytest.raises(GraphBubbleUp):
            mw.wrap_tool_call(req, MagicMock())

    def test_async_graph_bubble_up_not_swallowed(self):
        """Async: GraphBubbleUp must propagate."""

        class BubbleProvider:
            name = "bubble"

            def evaluate(self, request):
                raise GraphBubbleUp()

            async def aevaluate(self, request):
                raise GraphBubbleUp()

        mw = GuardrailMiddleware(BubbleProvider(), fail_closed=True)
        req = _make_tool_call_request("bash")

        async def handler(r):
            return MagicMock()

        async def run():
            return await mw.awrap_tool_call(req, handler)

        with pytest.raises(GraphBubbleUp):
            asyncio.run(run())


# --- Config tests ---


class TestGuardrailsConfig:
    def test_config_defaults(self):
        from nion.config.guardrails_config import GuardrailsConfig

        config = GuardrailsConfig()
        assert config.enabled is False
        assert config.fail_closed is True
        assert config.passport is None
        assert config.provider is None

    def test_config_from_dict(self):
        from nion.config.guardrails_config import GuardrailsConfig

        config = GuardrailsConfig.model_validate(
            {
                "enabled": True,
                "fail_closed": False,
                "passport": "./guardrails/passport.json",
                "provider": {
                    "use": "nion.guardrails.builtin:AllowlistProvider",
                    "config": {"denied_tools": ["bash"]},
                },
            }
        )
        assert config.enabled is True
        assert config.fail_closed is False
        assert config.passport == "./guardrails/passport.json"
        assert config.provider.use == "nion.guardrails.builtin:AllowlistProvider"
        assert config.provider.config == {"denied_tools": ["bash"]}

    def test_singleton_load_and_get(self):
        from nion.config.guardrails_config import get_guardrails_config, load_guardrails_config_from_dict, reset_guardrails_config

        try:
            load_guardrails_config_from_dict({"enabled": True, "provider": {"use": "test:Foo"}})
            config = get_guardrails_config()
            assert config.enabled is True
        finally:
            reset_guardrails_config()
