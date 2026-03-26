from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage

from app.daemon.app import create_app
from app.gateway.routers import threads as threads_router
from nion.client import NionClient
from nion.config.paths import get_paths
from nion.telemetry.store import TelemetryStore


def test_thread_stream_failure_records_error_event(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None

    class FailingThreadService:
        def stream(self, thread_id: str, payload):
            raise RuntimeError("upstream unavailable")

    app = create_app()
    app.dependency_overrides[threads_router.get_thread_service] = lambda: FailingThreadService()

    with TestClient(app) as client:
        response = client.post(
            "/api/threads/new/stream",
            json={
                "messages": [{"type": "human", "content": [{"type": "text", "text": "hi"}]}],
                "context": {},
                "config": {},
            },
        )

        assert response.status_code == 200
        assert 'event: error' in response.text

    store = TelemetryStore(get_paths().telemetry_db_file)
    events = store.list_events(limit=10, category="thread", level="error", thread_id="new")
    assert events
    assert events[0].event_type == "thread_stream_failed"
    assert events[0].message == "Thread stream failed for new"
    assert events[0].details["reason"] == "upstream unavailable"


def test_embedded_agent_stream_records_run_events(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None

    with patch("nion.client.get_app_config", return_value=MagicMock()):
        client = NionClient()

    agent = MagicMock()
    agent.stream.return_value = iter([{"messages": [AIMessage(content="ok", id="ai-1")]}])

    with (
        patch.object(client, "_ensure_agent"),
        patch.object(client, "_agent", agent),
    ):
        stream_events = list(client.stream("hello", thread_id="thread-telemetry"))

    assert stream_events[-1].type == "end"

    store = TelemetryStore(get_paths().telemetry_db_file)
    events = store.list_events(limit=10, category="agent", thread_id="thread-telemetry")
    event_types = {event.event_type for event in events}
    assert "agent_model_selected" in event_types
    assert "agent_run_started" in event_types
    assert "agent_run_completed" in event_types

    selected_event = next(event for event in events if event.event_type == "agent_model_selected")
    started_event = next(event for event in events if event.event_type == "agent_run_started")
    completed_event = next(event for event in events if event.event_type == "agent_run_completed")
    assert selected_event.message == "Selected model for embedded agent thread 'thread-telemetry'"
    assert started_event.message == "Started embedded agent run for thread 'thread-telemetry'"
    assert completed_event.details["ai_message_count"] == 1


def test_embedded_agent_creation_records_event(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None

    with patch("nion.client.get_app_config", return_value=MagicMock()):
        client = NionClient(model_name="gpt-test")

    with (
        patch("nion.client.create_agent", return_value=MagicMock()),
        patch("nion.client.create_chat_model", return_value=object()),
        patch.object(client, "_get_tools", return_value=[]),
        patch("nion.client._build_middlewares", return_value=[]),
        patch("nion.client.apply_prompt_template", return_value="system"),
        patch("nion.agents.checkpointer.get_checkpointer", return_value=None),
    ):
        client._ensure_agent(client._get_runnable_config("thread-created", surface="desktop"))

    store = TelemetryStore(get_paths().telemetry_db_file)
    events = store.list_events(limit=10, category="agent", thread_id="thread-created")
    created_event = next(event for event in events if event.event_type == "agent_created")
    assert created_event.message == "Created embedded agent 'lead_agent'"
    assert created_event.details["model_name"] == "gpt-test"
    assert created_event.details["surface"] == "desktop"
