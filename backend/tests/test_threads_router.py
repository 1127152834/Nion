import json
from types import SimpleNamespace
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.daemon.app import create_app as create_daemon_app
from app.gateway.app import create_app
from app.gateway.routers import threads
from nion.threads.models import ThreadStreamRequest
from nion.threads.repository import ThreadRepository
from nion.threads.service import ThreadBusyError, ThreadService


def test_threads_search_route_exists() -> None:
    client = TestClient(create_app())
    response = client.post("/api/threads/search", json={"limit": 10})
    assert response.status_code == 200


def test_threads_search_route_supports_thread_id_filter(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    from nion.config import paths as paths_module

    paths_module._paths = None

    repository = ThreadRepository(base_dir=tmp_path)
    repository.upsert_thread("thread-1", title="One", values={"messages": [], "artifacts": []})
    repository.upsert_thread("thread-2", title="Two", values={"messages": [], "artifacts": []})

    client = TestClient(create_app())
    response = client.post("/api/threads/search", json={"thread_id": "thread-2", "limit": 10})

    assert response.status_code == 200
    assert [item["thread_id"] for item in response.json()] == ["thread-2"]


def test_threads_stream_surfaces_runtime_errors_as_sse_events() -> None:
    app = create_daemon_app()

    class FailingThreadService:
        def stream(self, thread_id: str, payload):
            raise RuntimeError("upstream unavailable")

    app.dependency_overrides[threads.get_thread_service] = lambda: FailingThreadService()
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
        assert 'event: created' in response.text
        assert 'event: error' in response.text
        assert json.dumps({"message": "upstream unavailable"}) in response.text


def test_delete_thread_route_removes_thread_directory(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    from nion.config import paths as paths_module

    paths_module._paths = None

    repository = ThreadRepository(base_dir=tmp_path)
    repository.upsert_thread("thread-1", title="T", values={"messages": [], "artifacts": []})

    thread_dir = tmp_path / "threads" / "thread-1" / "user-data" / "outputs"
    thread_dir.mkdir(parents=True)

    client = TestClient(create_app())
    response = client.delete("/api/threads/thread-1")

    assert response.status_code == 204
    assert not (tmp_path / "threads" / "thread-1").exists()


def test_threads_stream_finished_keeps_legacy_memory_surfaces_removed(
    tmp_path,
    monkeypatch,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    from nion.config import paths as paths_module

    paths_module._paths = None

    class SuccessfulThreadService:
        def stream(self, thread_id: str, payload):
            yield type("Event", (), {"type": "message", "data": {"ok": True}})()

    app = create_daemon_app()
    app.dependency_overrides[threads.get_thread_service] = lambda: SuccessfulThreadService()

    with TestClient(app) as client:
        autodream_before = client.get("/api/autodream/status")
        maintenance_before = client.get("/api/self-maintenance/status")
        assert autodream_before.status_code == 404
        assert maintenance_before.status_code == 404

        response = client.post(
            "/api/threads/new/stream",
            json={
                "messages": [{"type": "human", "content": [{"type": "text", "text": "hi"}]}],
                "context": {},
                "config": {},
            },
        )

        assert response.status_code == 200
        assert "event: message" in response.text

        autodream_after = client.get("/api/autodream/status")
        maintenance_after = client.get("/api/self-maintenance/status")
        assert autodream_after.status_code == 404
        assert maintenance_after.status_code == 404


def test_threads_stream_failed_keeps_legacy_memory_surfaces_removed(
    tmp_path,
    monkeypatch,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    from nion.config import paths as paths_module

    paths_module._paths = None

    class FailingThreadService:
        def stream(self, thread_id: str, payload):
            raise RuntimeError("upstream unavailable")

    app = create_daemon_app()
    app.dependency_overrides[threads.get_thread_service] = lambda: FailingThreadService()

    with TestClient(app) as client:
        autodream_before = client.get("/api/autodream/status")
        maintenance_before = client.get("/api/self-maintenance/status")
        assert autodream_before.status_code == 404
        assert maintenance_before.status_code == 404

        response = client.post(
            "/api/threads/new/stream",
            json={
                "messages": [{"type": "human", "content": [{"type": "text", "text": "hi"}]}],
                "context": {},
                "config": {},
            },
        )

        assert response.status_code == 200
        assert "event: error" in response.text

        autodream_after = client.get("/api/autodream/status")
        maintenance_after = client.get("/api/self-maintenance/status")
        assert autodream_after.status_code == 404
        assert maintenance_after.status_code == 404


def test_thread_service_stream_maps_assistant_id_to_agent_name():
    client = MagicMock()
    client.stream.return_value = iter(
        [SimpleNamespace(type="values", data={"title": "T", "messages": [], "artifacts": []})]
    )
    repository = MagicMock()
    repository.get_thread.return_value = None
    repository.upsert_thread.return_value = SimpleNamespace(values=SimpleNamespace(model_dump=lambda: {}))
    service = ThreadService(repository=repository, client=client)

    request = ThreadStreamRequest(
        messages=[{"type": "human", "content": [{"type": "text", "text": "hi"}]}],
        context={},
        config={},
        assistant_id="finalis",
    )

    list(service.stream("thread-1", request))

    client.stream.assert_called_once()
    kwargs = client.stream.call_args.kwargs
    assert kwargs["thread_id"] == "thread-1"
    assert kwargs["agent_name"] == "finalis"


def test_thread_service_stream_preserves_explicit_context_agent_name():
    client = MagicMock()
    client.stream.return_value = iter(
        [SimpleNamespace(type="values", data={"title": "T", "messages": [], "artifacts": []})]
    )
    repository = MagicMock()
    repository.get_thread.return_value = None
    repository.upsert_thread.return_value = SimpleNamespace(values=SimpleNamespace(model_dump=lambda: {}))
    service = ThreadService(repository=repository, client=client)

    request = ThreadStreamRequest(
        messages=[{"type": "human", "content": [{"type": "text", "text": "hi"}]}],
        context={"agent_name": "custom-agent"},
        config={},
        assistant_id="finalis",
    )

    list(service.stream("thread-1", request))

    kwargs = client.stream.call_args.kwargs
    assert kwargs["agent_name"] == "custom-agent"


def test_thread_service_stream_passes_runtime_profile_and_keeps_cli_selection_out_of_message_text():
    client = MagicMock()
    client.stream.return_value = iter(
        [SimpleNamespace(type="values", data={"title": "T", "messages": [], "artifacts": []})]
    )
    repository = MagicMock()
    repository.get_thread.return_value = None
    repository.upsert_thread.return_value = SimpleNamespace(values=SimpleNamespace(model_dump=lambda: {}))
    service = ThreadService(repository=repository, client=client)

    request = ThreadStreamRequest(
        messages=[
            {
                "type": "human",
                "content": [{"type": "text", "text": "看看我们现在 docker 的状态"}],
                "additional_kwargs": {
                    "shortcut_selections": {
                        "cliTools": ["docker"],
                    }
                },
            }
        ],
        context={
            "execution_mode": "host",
            "host_workdir": "/tmp/nion-host",
        },
        config={},
    )

    list(service.stream("thread-1", request))

    kwargs = client.stream.call_args.kwargs
    assert kwargs["thread_id"] == "thread-1"
    assert kwargs["execution_mode"] == "host"
    assert kwargs["host_workdir"] == "/tmp/nion-host"
    assert client.stream.call_args.args[0] == "看看我们现在 docker 的状态"
    assert "<selected_cli_tools>" not in client.stream.call_args.args[0]
    assert kwargs["human_message_payload"]["content"] == [
        {"type": "text", "text": "看看我们现在 docker 的状态"}
    ]
    assert kwargs["human_message_payload"]["additional_kwargs"]["shortcut_selections"] == {
        "cliTools": ["docker"]
    }


def test_thread_service_stream_passes_locale_to_client():
    client = MagicMock()
    client.stream.return_value = iter(
        [SimpleNamespace(type="values", data={"title": "T", "messages": [], "artifacts": []})]
    )
    repository = MagicMock()
    repository.get_thread.return_value = None
    repository.upsert_thread.return_value = SimpleNamespace(values=SimpleNamespace(model_dump=lambda: {}))
    service = ThreadService(repository=repository, client=client)

    request = ThreadStreamRequest(
        messages=[{"type": "human", "content": [{"type": "text", "text": "hi"}]}],
        context={"locale": "zh-CN"},
        config={},
    )

    list(service.stream("thread-1", request))

    kwargs = client.stream.call_args.kwargs
    assert kwargs["locale"] == "zh-CN"


def test_thread_service_stream_rejects_concurrent_same_thread_runs():
    client = MagicMock()
    client.stream.return_value = iter(
        [SimpleNamespace(type="values", data={"title": "T", "messages": [], "artifacts": []})]
    )
    repository = MagicMock()
    repository.get_thread.return_value = None
    repository.upsert_thread.return_value = SimpleNamespace(values=SimpleNamespace(model_dump=lambda: {}))
    service = ThreadService(repository=repository, client=client)

    request = ThreadStreamRequest(
        messages=[{"type": "human", "content": [{"type": "text", "text": "hi"}]}],
        context={},
        config={},
    )

    from nion.threads import service as thread_service_module

    thread_service_module._active_thread_runs["thread-1"] = thread_service_module._ActiveThreadRun(
        run_id="run-1"
    )
    try:
        try:
            list(service.stream("thread-1", request))
        except ThreadBusyError as exc:
            assert "already has an active run" in str(exc)
        else:
            raise AssertionError("Expected ThreadBusyError")
    finally:
        thread_service_module._active_thread_runs.pop("thread-1", None)


def test_threads_stream_surfaces_thread_busy_as_sse_error_event() -> None:
    app = create_daemon_app()

    class BusyThreadService:
        def stream(self, thread_id: str, payload):
            raise ThreadBusyError("Thread 'new' already has an active run in progress.")

    app.dependency_overrides[threads.get_thread_service] = lambda: BusyThreadService()
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
    assert "already has an active run in progress" in response.text


def test_cancel_thread_run_route_releases_active_run_lock() -> None:
    app = create_daemon_app()
    service = ThreadService(repository=MagicMock(), client=MagicMock())
    app.dependency_overrides[threads.get_thread_service] = lambda: service

    from nion.threads import service as thread_service_module

    run_id = thread_service_module._claim_thread_run("thread-cancel")
    try:
        with TestClient(app) as client:
            response = client.post("/api/threads/thread-cancel/cancel")

        assert response.status_code == 200
        assert response.json() == {"ok": True}
        replacement_run_id = thread_service_module._claim_thread_run("thread-cancel")
        assert replacement_run_id != run_id
        thread_service_module._release_thread_run("thread-cancel", replacement_run_id)
    finally:
        thread_service_module._release_thread_run("thread-cancel", run_id)
