from pathlib import Path

from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.memory_os.repository import MemoryOSRepository


def _save_node(
    repo: MemoryOSRepository,
    *,
    memory_id: str,
    canonical_key: str,
    summary: str,
    subtype: str,
    domain: str = "user_model",
    node_type: str = "user_model",
    scope: str = "user",
) -> None:
    repo.save_memory_node(
        {
            "memory_id": memory_id,
            "canonical_key": canonical_key,
            "owner_type": "agent",
            "scope": scope,
            "node_type": node_type,
            "status": "active",
            "summary": summary,
            "created_at": "2026-04-09T00:00:00Z",
            "updated_at": "2026-04-09T00:00:00Z",
            "metadata": {"domain": domain, "subtype": subtype},
        }
    )
    repo.append_memory_revision(
        memory_id=memory_id,
        summary=summary,
        evidence_ref=None,
        created_at="2026-04-09T00:00:00Z",
        payload={"domain": domain, "subtype": subtype},
    )


def test_memory_canonical_router_exposes_user_surface(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    _save_node(
        repo,
        memory_id="mem:user:work",
        canonical_key="user_model:workContext",
        summary="负责财务 BP",
        subtype="workContext",
    )

    with TestClient(create_app()) as client:
        response = client.get("/api/memory-canonical/user")

    assert response.status_code == 200
    assert response.json()["workContext"]["summary"] == "负责财务 BP"


def test_memory_canonical_router_exposes_history_surface(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    _save_node(
        repo,
        memory_id="mem:history:recent",
        canonical_key="history:recentMonths",
        summary="最近一段时间主要在做记忆重构。",
        subtype="recentMonths",
        domain="history",
        node_type="history_context",
    )

    with TestClient(create_app()) as client:
        response = client.get("/api/memory-canonical/history")

    assert response.status_code == 200
    assert response.json()["recentMonths"]["summary"] == "最近一段时间主要在做记忆重构。"


def test_memory_canonical_router_exposes_facts_surface(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_node(
        {
            "memory_id": "mem:user:fact",
            "canonical_key": "user_model:fact:writing",
            "owner_type": "agent",
            "scope": "user",
            "node_type": "user_model_fact",
            "status": "active",
            "summary": "用户偏好先给结论，再补背景。",
            "created_at": "2026-04-09T09:30:00Z",
            "updated_at": "2026-04-09T10:00:00Z",
            "metadata": {
                "domain": "user_model",
                "subtype": "preference",
                "category": "preference",
                "kind": "fact",
                "confidence": 0.91,
                "source": "thread:test",
                "created_at": "2026-04-09T09:30:00Z",
            },
        }
    )
    repo.append_memory_revision(
        memory_id="mem:user:fact",
        summary="用户偏好先给结论，再补背景。",
        evidence_ref=None,
        created_at="2026-04-09T09:30:00Z",
        payload={
            "domain": "user_model",
            "subtype": "preference",
            "category": "preference",
            "kind": "fact",
            "confidence": 0.91,
            "source": "thread:test",
        },
    )

    with TestClient(create_app()) as client:
        response = client.get("/api/memory-canonical/facts")

    assert response.status_code == 200
    assert response.json()["facts"] == [
        {
            "id": "mem:user:fact",
            "content": "用户偏好先给结论，再补背景。",
            "category": "preference",
            "confidence": 0.91,
            "createdAt": "2026-04-09T09:30:00Z",
            "source": "thread:test",
        }
    ]
