from __future__ import annotations

import asyncio
import sys
from types import SimpleNamespace

from nion.config.acp_config import ACPAgentConfig


def test_missing_acp_executable_returns_actionable_error():
    from nion.tools.builtins.invoke_acp_agent_tool import build_invoke_acp_agent_tool

    tool = build_invoke_acp_agent_tool(
        {
            "codex": ACPAgentConfig(
                command="definitely-missing-acp-binary",
                args=[],
                description="Codex ACP adapter",
            )
        }
    )

    result = asyncio.run(
        tool.coroutine(agent="codex", prompt="hello")
    )

    assert "not found" in result.lower()
    assert "definitely-missing-acp-binary" in result.lower()


def test_build_permission_response_denies_by_default(monkeypatch):
    from nion.tools.builtins import invoke_acp_agent_tool as module

    class DummyDeniedOutcome:
        def __init__(self, *, outcome):
            self.outcome = outcome

    class DummyAllowedOutcome:
        def __init__(self, *, outcome, optionId):
            self.outcome = outcome
            self.optionId = optionId

    class DummyRequestPermissionResponse:
        def __init__(self, *, outcome):
            self.outcome = outcome

    monkeypatch.setitem(
        sys.modules,
        "acp",
        SimpleNamespace(RequestPermissionResponse=DummyRequestPermissionResponse),
    )
    monkeypatch.setitem(
        sys.modules,
        "acp.schema",
        SimpleNamespace(
            AllowedOutcome=DummyAllowedOutcome,
            DeniedOutcome=DummyDeniedOutcome,
        ),
    )

    option = SimpleNamespace(kind="allow_once", option_id="option-1")
    response = module._build_permission_response([option], auto_approve=False)

    assert response.outcome.outcome == "cancelled"


def test_invoke_acp_agent_passes_resolved_env(monkeypatch):
    from nion.tools.builtins.invoke_acp_agent_tool import build_invoke_acp_agent_tool

    captured: dict[str, object] = {}

    class DummyTextContentBlock:
        def __init__(self, text: str):
            self.text = text

    class DummyClient:
        pass

    class DummyConn:
        def __init__(self, client):
            self._client = client

        async def initialize(self, **kwargs):
            captured["initialize"] = kwargs

        async def new_session(self, **kwargs):
            captured["session_kwargs"] = kwargs
            return SimpleNamespace(session_id="session-1")

        async def prompt(self, **kwargs):
            await self._client.session_update(
                "session-1",
                SimpleNamespace(content=DummyTextContentBlock("hello from acp")),
            )

    class DummyProcessContext:
        def __init__(self, client, cmd, *args, cwd, env):
            captured["cmd"] = cmd
            captured["args"] = list(args)
            captured["cwd"] = cwd
            captured["env"] = env
            self._conn = DummyConn(client)

        async def __aenter__(self):
            return self._conn, object()

        async def __aexit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setenv("OPENAI_API_KEY", "test-token")
    monkeypatch.setitem(
        sys.modules,
        "acp",
        SimpleNamespace(
            PROTOCOL_VERSION="2026-03-24",
            Client=DummyClient,
            RequestPermissionResponse=lambda *, outcome: SimpleNamespace(outcome=outcome),
            spawn_agent_process=lambda client, cmd, *args, cwd, env: DummyProcessContext(
                client,
                cmd,
                *args,
                cwd=cwd,
                env=env,
            ),
            text_block=lambda text: {"type": "text", "text": text},
        ),
    )
    monkeypatch.setitem(
        sys.modules,
        "acp.schema",
        SimpleNamespace(
            AllowedOutcome=lambda *, outcome, optionId: SimpleNamespace(
                outcome=outcome,
                optionId=optionId,
            ),
            DeniedOutcome=lambda *, outcome: SimpleNamespace(outcome=outcome),
            ClientCapabilities=lambda: {},
            Implementation=lambda **kwargs: kwargs,
            TextContentBlock=DummyTextContentBlock,
        ),
    )

    tool = build_invoke_acp_agent_tool(
        {
            "codex": ACPAgentConfig(
                command="python3",
                args=["-m", "fake-acp-adapter"],
                description="Codex ACP adapter",
                env={"OPENAI_API_KEY": "$OPENAI_API_KEY"},
            )
        }
    )

    result = asyncio.run(tool.coroutine(agent="codex", prompt="hello"))

    assert result == "hello from acp"
    assert captured["env"]["OPENAI_API_KEY"] == "test-token"


def test_get_work_dir_uses_per_thread_path_when_thread_id_given(monkeypatch, tmp_path):
    from nion.config import paths as paths_module
    from nion.tools.builtins import invoke_acp_agent_tool as module

    monkeypatch.setattr(module, "get_paths", lambda: paths_module.Paths(base_dir=tmp_path))

    result = module._get_work_dir("thread-abc-123")

    expected = tmp_path / "threads" / "thread-abc-123" / "acp-workspace"
    assert result == str(expected)
    assert expected.exists()
