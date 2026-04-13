import asyncio

from nion.config import paths as paths_module
from nion.config.a2a_config import A2AAgentConfig
from nion.orchestration.remote_agent_transport import (
    RemoteAgentTarget,
    resolve_remote_transport,
)


class _MemorySessionStore:
    def __init__(self) -> None:
        self._sessions: dict[tuple[str, str], dict[str, str]] = {}

    def load(self, thread_id: str | None, agent_name: str) -> dict[str, str] | None:
        if thread_id is None:
            return None
        return self._sessions.get((thread_id, agent_name))

    def save(self, thread_id: str | None, agent_name: str, session: dict[str, str]) -> None:
        if thread_id is None:
            return
        self._sessions[(thread_id, agent_name)] = session


def test_a2a_session_store_round_trips_to_thread_directory(monkeypatch, tmp_path):
    from nion.orchestration.remote_transports.a2a import A2ASessionStore

    monkeypatch.setattr(
        "nion.orchestration.remote_transports.a2a.get_paths",
        lambda: paths_module.Paths(base_dir=tmp_path),
    )

    store = A2ASessionStore()
    store.save(
        "thread-1",
        "writer-agent",
        {"context_id": "ctx-1", "task_id": "task-1"},
    )

    assert store.load("thread-1", "writer-agent") == {
        "context_id": "ctx-1",
        "task_id": "task-1",
    }


class _FakeResponse:
    def __init__(self, payload=None, *, content_type: str = "application/json") -> None:
        self._payload = payload
        self.headers = {"content-type": content_type}

    def raise_for_status(self) -> None:
        return None

    def json(self):
        return self._payload


class _FakeStreamResponse(_FakeResponse):
    def __init__(self, lines: list[str]) -> None:
        super().__init__(payload=None, content_type="text/event-stream")
        self._lines = lines

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def aiter_lines(self):
        for line in self._lines:
            yield line


def test_resolve_remote_transport_prefers_local_for_catalog_agents():
    target = RemoteAgentTarget(kind="local", agent_name="research-agent")
    transport = resolve_remote_transport(target)
    assert transport.kind == "local"


def test_a2a_transport_can_build_agent_card_url():
    from nion.orchestration.remote_transports.a2a import build_agent_card_url

    assert (
        build_agent_card_url("https://agents.example.com/worker")
        == "https://agents.example.com/worker/.well-known/agent-card.json"
    )


def test_a2a_transport_fetches_agent_card_via_injected_fetcher():
    from nion.orchestration.remote_transports.a2a import A2ADiscoveryTransport

    transport = A2ADiscoveryTransport(
        base_url="https://agents.example.com/worker",
        agent_card_fetcher=lambda url: {
            "name": "worker-agent",
            "version": "2026-04-12",
            "url": url,
        },
    )

    card = transport.fetch_agent_card()

    assert card.name == "worker-agent"
    assert card.version == "2026-04-12"
    assert card.url == "https://agents.example.com/worker/.well-known/agent-card.json"
    assert card.payload["url"] == card.url


def test_a2a_transport_send_returns_text_and_persists_session():
    from nion.orchestration.remote_transports.a2a import A2ATransport

    captured: dict[str, object] = {}
    session_store = _MemorySessionStore()

    class _FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, url, *, json, headers=None):
            captured["url"] = url
            captured["json"] = json
            captured["headers"] = headers
            return _FakeResponse(
                {
                    "jsonrpc": "2.0",
                    "result": {
                        "id": "task-1",
                        "contextId": "ctx-1",
                        "status": {
                            "state": "completed",
                            "message": {
                                "role": "agent",
                                "parts": [{"kind": "text", "text": "hello from send"}],
                            },
                        },
                    },
                }
            )

    transport = A2ATransport(
        agent_name="writer-agent",
        agent_config=A2AAgentConfig(
            base_url="https://agents.example.com/worker",
            description="Writer",
            streaming=False,
        ),
        agent_card_fetcher=lambda _url: {
            "name": "writer-agent",
            "url": "https://agents.example.com/rpc",
            "preferredTransport": "JSONRPC",
        },
        client_factory=lambda **kwargs: _FakeClient(),
        session_store=session_store,
    )

    result = asyncio.run(transport.run("write a summary", thread_id="thread-1"))

    assert result == "hello from send"
    assert captured["url"] == "https://agents.example.com/rpc"
    assert captured["json"]["method"] == "message/send"
    assert captured["json"]["params"]["message"]["parts"] == [
        {"kind": "text", "text": "write a summary"}
    ]
    assert session_store.load("thread-1", "writer-agent") == {
        "context_id": "ctx-1",
        "task_id": "task-1",
    }


def test_a2a_transport_stream_aggregates_sse_events_and_reuses_session():
    from nion.orchestration.remote_transports.a2a import A2ATransport

    captured: dict[str, object] = {}
    session_store = _MemorySessionStore()
    session_store.save(
        "thread-1",
        "writer-agent",
        {"context_id": "ctx-existing", "task_id": "task-existing"},
    )

    class _FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        def stream(self, method, url, *, json, headers=None):
            captured["method"] = method
            captured["url"] = url
            captured["json"] = json
            captured["headers"] = headers
            return _FakeStreamResponse(
                [
                    'event: message',
                    'data: {"jsonrpc":"2.0","result":{"id":"task-2","contextId":"ctx-2","status":{"state":"working","message":{"parts":[{"kind":"text","text":"partial"}]}}}}',
                    "",
                    'event: message',
                    'data: {"jsonrpc":"2.0","result":{"id":"task-2","contextId":"ctx-2","status":{"state":"completed","message":{"parts":[{"kind":"text","text":"final answer"}]}}}}',
                    "",
                    "data: [DONE]",
                    "",
                ]
            )

    transport = A2ATransport(
        agent_name="writer-agent",
        agent_config=A2AAgentConfig(
            base_url="https://agents.example.com/worker",
            description="Writer",
            streaming=True,
        ),
        agent_card_fetcher=lambda _url: {
            "name": "writer-agent",
            "url": "https://agents.example.com/rpc",
            "preferredTransport": "JSONRPC",
        },
        client_factory=lambda **kwargs: _FakeClient(),
        session_store=session_store,
    )

    result = asyncio.run(transport.run("continue the draft", thread_id="thread-1"))

    assert result == "final answer"
    assert captured["method"] == "POST"
    assert captured["url"] == "https://agents.example.com/rpc"
    assert captured["json"]["method"] == "message/stream"
    assert captured["json"]["params"]["message"]["contextId"] == "ctx-existing"
    assert captured["json"]["params"]["message"]["taskId"] == "task-existing"
    assert session_store.load("thread-1", "writer-agent") == {
        "context_id": "ctx-2",
        "task_id": "task-2",
    }


def test_a2a_transport_stream_prefers_terminal_text_over_longer_partial():
    from nion.orchestration.remote_transports.a2a import A2ATransport

    class _FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        def stream(self, method, url, *, json, headers=None):
            del method, url, json, headers
            return _FakeStreamResponse(
                [
                    'event: message',
                    'data: {"jsonrpc":"2.0","result":{"id":"task-2","contextId":"ctx-2","status":{"state":"working","message":{"parts":[{"kind":"text","text":"this is a much longer partial answer"}]}}}}',
                    "",
                    'event: message',
                    'data: {"jsonrpc":"2.0","result":{"id":"task-2","contextId":"ctx-2","status":{"state":"completed","message":{"parts":[{"kind":"text","text":"final"}]}}}}',
                    "",
                    "data: [DONE]",
                    "",
                ]
            )

    transport = A2ATransport(
        agent_name="writer-agent",
        agent_config=A2AAgentConfig(
            base_url="https://agents.example.com/worker",
            description="Writer",
            streaming=True,
        ),
        agent_card_fetcher=lambda _url: {
            "name": "writer-agent",
            "url": "https://agents.example.com/rpc",
            "preferredTransport": "JSONRPC",
        },
        client_factory=lambda **kwargs: _FakeClient(),
        session_store=_MemorySessionStore(),
    )

    result = asyncio.run(transport.run("continue the draft", thread_id="thread-1"))

    assert result == "final"


def test_a2a_transport_polls_pending_task_until_completed():
    from nion.orchestration.remote_transports.a2a import A2ATransport

    calls: list[str] = []

    class _FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, url, *, json, headers=None):
            del url, headers
            calls.append(json["method"])
            if json["method"] == "message/send":
                return _FakeResponse(
                    {
                        "jsonrpc": "2.0",
                        "result": {
                            "id": "task-9",
                            "contextId": "ctx-9",
                            "status": {"state": "working"},
                        },
                    }
                )

            return _FakeResponse(
                {
                    "jsonrpc": "2.0",
                    "result": {
                        "id": "task-9",
                        "contextId": "ctx-9",
                        "status": {
                            "state": "completed",
                            "message": {
                                "parts": [{"kind": "text", "text": "done after poll"}],
                            },
                        },
                    },
                }
            )

    transport = A2ATransport(
        agent_name="writer-agent",
        agent_config=A2AAgentConfig(
            base_url="https://agents.example.com/worker",
            description="Writer",
            streaming=False,
            poll_interval_seconds=0,
            max_poll_attempts=2,
        ),
        agent_card_fetcher=lambda _url: {
            "name": "writer-agent",
            "url": "https://agents.example.com/rpc",
            "preferredTransport": "JSONRPC",
        },
        client_factory=lambda **kwargs: _FakeClient(),
        session_store=_MemorySessionStore(),
    )

    result = asyncio.run(transport.run("continue", thread_id="thread-1"))

    assert result == "done after poll"
    assert calls == ["message/send", "tasks/get"]


def test_resolve_remote_transport_builds_a2a_transport_from_config():
    target = RemoteAgentTarget(
        kind="a2a",
        agent_name="writer-agent",
        a2a_config=A2AAgentConfig(
            base_url="https://agents.example.com/worker",
            description="Writer",
        ),
    )

    transport = resolve_remote_transport(target)

    assert transport.kind == "a2a"
