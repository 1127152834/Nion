from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.config.paths import reset_paths
from nion.memory.evidence_vault.store import EvidenceVaultStore


def test_memory_evidence_returns_filtered_paginated_list(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()
    store = EvidenceVaultStore(tmp_path / "memory-os")
    first = store.write_document(
        source_type="human_message",
        thread_id="thread-a",
        turn_id="turn-a1",
        actor="user",
        content_raw="第一条 durable 证据",
        durability_scope="durable_user_memory",
    )
    second = store.write_document(
        source_type="tool_summary",
        thread_id="thread-b",
        turn_id="turn-b1",
        actor="assistant",
        content_raw="第二条 ephemeral 证据",
        durability_scope="session_ephemeral",
    )

    with TestClient(create_app()) as client:
        response = client.get(
            "/api/memory/evidence",
            params={"thread_id": "thread-b", "limit": 1, "offset": 0},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["items"] == [
        {
            "evidence_id": second.document.evidence_id,
            "thread_id": "thread-b",
            "turn_id": "turn-b1",
            "source_type": "tool_summary",
            "actor": "assistant",
            "durability_scope": "session_ephemeral",
            "created_at": second.document.created_at,
            "artifact_uri": None,
            "content_preview": "第二条 ephemeral 证据",
        }
    ]
    assert payload["paging"] == {"limit": 1, "offset": 0, "total": 1}
    assert first.document.evidence_id != second.document.evidence_id


def test_memory_evidence_is_read_only(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        response = client.post("/api/memory/evidence", json={})

    assert response.status_code == 405
