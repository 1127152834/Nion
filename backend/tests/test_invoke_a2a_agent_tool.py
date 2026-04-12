from __future__ import annotations

import asyncio

from nion.config.a2a_config import A2AAgentConfig


def test_invoke_a2a_agent_tool_rejects_empty_prompt():
    from nion.tools.builtins.invoke_a2a_agent_tool import build_invoke_a2a_agent_tool

    tool = build_invoke_a2a_agent_tool(
        {
            "writer-agent": A2AAgentConfig(
                base_url="https://agents.example.com/worker",
                description="Writer",
            )
        }
    )

    result = asyncio.run(tool.coroutine(agent="writer-agent", prompt="   "))

    assert result == "A2A prompt cannot be empty."


def test_invoke_a2a_agent_tool_delegates_to_transport_seam(monkeypatch):
    from nion.tools.builtins.invoke_a2a_agent_tool import build_invoke_a2a_agent_tool

    captured: dict[str, object] = {}

    class FakeTransport:
        kind = "a2a"

        async def run(self, prompt: str, *, thread_id: str | None = None) -> str:
            captured["prompt"] = prompt
            captured["thread_id"] = thread_id
            return "transport result"

    def _fake_resolve(target):
        captured["target"] = target
        return FakeTransport()

    monkeypatch.setattr(
        "nion.tools.builtins.invoke_a2a_agent_tool.resolve_remote_transport",
        _fake_resolve,
    )

    tool = build_invoke_a2a_agent_tool(
        {
            "writer-agent": A2AAgentConfig(
                base_url="https://agents.example.com/worker",
                description="Writer",
            )
        }
    )

    result = asyncio.run(
        tool.coroutine(
            agent="writer-agent",
            prompt="hello",
            config={"configurable": {"thread_id": "thread-123"}},
        )
    )

    assert result == "transport result"
    assert captured["prompt"] == "hello"
    assert captured["thread_id"] == "thread-123"
    assert captured["target"].kind == "a2a"
    assert captured["target"].agent_name == "writer-agent"
