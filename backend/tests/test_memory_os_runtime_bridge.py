from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage, HumanMessage

from app.daemon.app import create_app
from nion.config.paths import reset_paths


def test_memory_router_compatibility_reads_through_memory_os(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        response = client.get("/api/memory")

    assert response.status_code == 200
    assert response.json()["version"] == "1.0"


def test_get_memory_context_uses_memory_os_service(monkeypatch):
    from nion.agents.lead_agent.prompt import _get_memory_context

    monkeypatch.setattr(
        "nion.agents.lead_agent.prompt.get_memory_data",
        lambda agent_name=None: (_ for _ in ()).throw(
            AssertionError("legacy path should not be called"),
        ),
        raising=False,
    )

    class FakeService:
        def get_memory_payload(self, agent_name=None, base_dir=None):
            return {
                "version": "1.0",
                "lastUpdated": "",
                "user": {
                    "workContext": {"summary": "works on Nion", "updatedAt": ""},
                    "personalContext": {"summary": "", "updatedAt": ""},
                    "topOfMind": {"summary": "", "updatedAt": ""},
                },
                "history": {
                    "recentMonths": {"summary": "", "updatedAt": ""},
                    "earlierContext": {"summary": "", "updatedAt": ""},
                    "longTermBackground": {"summary": "", "updatedAt": ""},
                },
                "facts": [],
            }

    monkeypatch.setattr(
        "nion.agents.lead_agent.prompt.MemoryOSService",
        lambda: FakeService(),
        raising=False,
    )

    result = _get_memory_context()

    assert isinstance(result, str)
    assert "<memory>" in result


def test_memory_middleware_routes_after_chat_capture_through_memory_os(monkeypatch):
    from types import SimpleNamespace

    from nion.agents.middlewares.memory_middleware import MemoryMiddleware

    called = {"value": False}

    class FakeProvider:
        def on_after_chat(self, *, thread_id, messages, agent_name=None):
            called["value"] = True

    monkeypatch.setattr(
        "nion.agents.middlewares.memory_middleware.resolve_active_memory_provider",
        lambda: FakeProvider(),
        raising=False,
    )

    middleware = MemoryMiddleware()
    middleware.after_agent(
        {"messages": [HumanMessage(content="hi"), AIMessage(content="hello")]},
        SimpleNamespace(context={"thread_id": "thread-1"}),
    )

    assert called["value"] is True
