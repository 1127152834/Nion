import sqlite3

from fastapi.testclient import TestClient

from app.gateway.app import create_app
from app.runtime.app_factory import create_runtime_app
from nion.config.paths import get_paths, reset_paths
from nion.memory_os.repository import MemoryOSRepository


def _insert_memory_node(
    db_path,
    *,
    memory_id: str,
    canonical_key: str,
    summary: str,
    created_at: str,
    updated_at: str,
) -> None:
    with sqlite3.connect(db_path) as connection:
        connection.execute(
            """
            INSERT INTO memory_nodes (
                memory_id,
                canonical_key,
                owner_type,
                scope,
                node_type,
                status,
                summary,
                created_at,
                updated_at,
                metadata_json
            )
            VALUES (?, ?, 'agent', 'user', 'fact', 'active', ?, ?, ?, '{}')
            """,
            (memory_id, canonical_key, summary, created_at, updated_at),
        )


def _insert_memory_revision(
    db_path,
    *,
    revision_id: str,
    memory_id: str,
    revision_number: int,
    summary: str,
    evidence_ref: str | None,
    created_at: str,
) -> None:
    with sqlite3.connect(db_path) as connection:
        connection.execute(
            """
            INSERT INTO memory_revisions (
                revision_id,
                memory_id,
                revision_number,
                summary,
                evidence_ref,
                created_at,
                payload_json
            )
            VALUES (?, ?, ?, ?, ?, ?, '{}')
            """,
            (revision_id, memory_id, revision_number, summary, evidence_ref, created_at),
        )


def test_memory_ledger_returns_canonical_nodes_and_current_revisions(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()
    db_path = get_paths().memory_os_index_db_file
    MemoryOSRepository(db_path)

    _insert_memory_node(
        db_path,
        memory_id="mem_user_1",
        canonical_key="user:timezone",
        summary="用户位于 Asia/Shanghai",
        created_at="2026-04-08T08:00:00Z",
        updated_at="2026-04-08T09:00:00Z",
    )
    _insert_memory_revision(
        db_path,
        revision_id="rev_user_1_v1",
        memory_id="mem_user_1",
        revision_number=1,
        summary="初始时区记录",
        evidence_ref="evidence://doc-1",
        created_at="2026-04-08T08:30:00Z",
    )
    _insert_memory_revision(
        db_path,
        revision_id="rev_user_1_v2",
        memory_id="mem_user_1",
        revision_number=2,
        summary="最新时区记录",
        evidence_ref="evidence://doc-2",
        created_at="2026-04-08T09:30:00Z",
    )

    with TestClient(create_app()) as client:
        response = client.get("/api/memory/ledger")

    assert response.status_code == 200
    payload = response.json()
    assert list(payload.keys()) == ["nodes", "current_revisions"]
    assert {
        "memory_id": "mem_user_1",
        "canonical_key": "user:timezone",
        "summary": "用户位于 Asia/Shanghai",
        "status": "active",
        "updated_at": "2026-04-08T09:00:00Z",
    } in payload["nodes"]
    assert {
        "memory_id": "mem_user_1",
        "revision_id": "rev_user_1_v2",
        "revision_number": 2,
        "summary": "最新时区记录",
        "evidence_ref": "evidence://doc-2",
        "created_at": "2026-04-08T09:30:00Z",
    } in payload["current_revisions"]


def test_memory_ledger_is_read_only(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        response = client.post("/api/memory/ledger", json={})

    assert response.status_code == 405


def test_memory_read_only_surfaces_are_available_in_desktop_runtime_app() -> None:
    app = create_runtime_app(
        mode="desktop",
        title="test",
        description="test",
        version="0.0.0",
    )

    routes = {route.path for route in app.routes}

    assert "/api/memory/ledger" in routes
    assert "/api/memory/evidence" in routes
    assert "/api/memory/runtime-trace" in routes
