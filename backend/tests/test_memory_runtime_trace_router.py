from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.config.paths import get_paths, reset_paths


def test_memory_runtime_trace_returns_trace_events(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()
    trace_dir = get_paths().memory_os_dir / "runtime_trace"
    trace_dir.mkdir(parents=True, exist_ok=True)
    trace_file = trace_dir / "events.jsonl"
    trace_file.write_text(
        "\n".join(
            [
                '{"event_id":"evt-1","event_type":"memory.read","memory_id":"mem-1","thread_id":"thread-1","created_at":"2026-04-08T10:00:00Z","metadata":{"source":"ledger"}}',
                '{"event_id":"evt-2","event_type":"memory.project","memory_id":"mem-2","thread_id":"thread-2","created_at":"2026-04-08T10:05:00Z","metadata":{"source":"growth"}}',
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    with TestClient(create_app()) as client:
        response = client.get(
            "/api/memory/runtime-trace",
            params={"thread_id": "thread-1", "limit": 5},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["items"] == [
        {
            "event_id": "evt-1",
            "event_type": "memory.read",
            "memory_id": "mem-1",
            "thread_id": "thread-1",
            "created_at": "2026-04-08T10:00:00Z",
            "metadata": {"source": "ledger"},
        }
    ]


def test_memory_runtime_trace_is_read_only(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        response = client.post("/api/memory/runtime-trace", json={})

    assert response.status_code == 405
