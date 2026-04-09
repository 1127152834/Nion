from pathlib import Path

from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.memory_os.repository import MemoryOSRepository
from nion.memory_os.soul import create_soul_proposal


def _save_node(
    repo: MemoryOSRepository,
    *,
    memory_id: str,
    canonical_key: str,
    summary: str,
    node_type: str,
    status: str = "active",
    owner_type: str = "agent",
    scope: str = "user",
    created_at: str = "2026-04-09T00:00:00Z",
    updated_at: str = "2026-04-09T00:00:00Z",
    metadata: dict[str, object] | None = None,
) -> None:
    repo.save_memory_node(
        {
            "memory_id": memory_id,
            "canonical_key": canonical_key,
            "owner_type": owner_type,
            "scope": scope,
            "node_type": node_type,
            "status": status,
            "summary": summary,
            "created_at": created_at,
            "updated_at": updated_at,
            "metadata": dict(metadata or {}),
        }
    )


def _save_revision(
    repo: MemoryOSRepository,
    *,
    memory_id: str,
    revision_number: int,
    summary: str,
    created_at: str,
    payload: dict[str, object] | None = None,
) -> None:
    repo.save_memory_revision(
        {
            "revision_id": f"{memory_id}:rev:{revision_number}",
            "memory_id": memory_id,
            "revision_number": revision_number,
            "summary": summary,
            "evidence_ref": None,
            "created_at": created_at,
            "payload": dict(payload or {}),
        }
    )


def _save_record(
    repo: MemoryOSRepository,
    *,
    memory_id: str,
    domain: str,
    subtype: str,
    summary: str,
    status: str = "active",
    title: str | None = None,
    created_at: str = "2026-04-09T00:00:00Z",
    updated_at: str = "2026-04-09T00:00:00Z",
    owner_type: str = "agent",
    scope: str = "user",
    confidence: float = 0.8,
    provenance: dict[str, object] | None = None,
) -> None:
    record = {
        "memory_id": memory_id,
        "domain": domain,
        "subtype": subtype,
        "owner_type": owner_type,
        "scope": scope,
        "memory_type": "semantic",
        "subject_id": "agent:main" if scope == "agent" else "user:default",
        "status": status,
        "summary": summary,
        "confidence": confidence,
        "created_at": created_at,
        "updated_at": updated_at,
        "provenance": dict(provenance or {"source_type": "test"}),
    }
    if title is not None:
        record["title"] = title
    repo.save_memory_record(record)


def test_memory_and_growth_routes_project_canonical_store_without_legacy_records(
    monkeypatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")

    _save_node(
        repo,
        memory_id="mem:user:work",
        canonical_key="user_model:workContext",
        summary="负责财务 BP",
        node_type="user_model",
        metadata={"domain": "user_model", "subtype": "workContext"},
        updated_at="2026-04-09T09:00:00Z",
    )
    _save_revision(
        repo,
        memory_id="mem:user:work",
        revision_number=1,
        summary="负责财务 BP",
        created_at="2026-04-09T09:00:00Z",
        payload={"domain": "user_model", "subtype": "workContext"},
    )
    _save_node(
        repo,
        memory_id="mem:user:fact",
        canonical_key="user_model:fact:writing",
        summary="用户偏好结论先行",
        node_type="user_model_fact",
        metadata={
            "domain": "user_model",
            "subtype": "preference",
            "category": "preference",
            "kind": "fact",
            "confidence": 0.91,
            "source": "thread:test",
            "created_at": "2026-04-09T09:30:00Z",
        },
        updated_at="2026-04-09T10:00:00Z",
    )
    _save_revision(
        repo,
        memory_id="mem:user:fact",
        revision_number=1,
        summary="用户偏好结论先行",
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
    _save_node(
        repo,
        memory_id="learn:canon:1",
        canonical_key="learning:topic:finance-expression",
        summary="反复出现财务表达纠偏需求",
        node_type="learning",
        metadata={"domain": "learning", "subtype": "topic", "title": "财务表达"},
        updated_at="2026-04-09T11:00:00Z",
    )
    _save_revision(
        repo,
        memory_id="learn:canon:1",
        revision_number=1,
        summary="反复出现财务表达纠偏需求",
        created_at="2026-04-09T11:00:00Z",
        payload={"domain": "learning", "subtype": "topic", "title": "财务表达"},
    )

    with TestClient(create_app()) as client:
        memory_response = client.get("/api/memory")
        growth_response = client.get("/api/memory/growth")
        user_model_response = client.get("/api/memory/growth/user-model")

    assert memory_response.status_code == 200
    memory_payload = memory_response.json()
    assert memory_payload["user"]["workContext"]["summary"] == "负责财务 BP"
    assert memory_payload["facts"] == [
        {
            "id": "mem:user:fact",
            "content": "用户偏好结论先行",
            "category": "preference",
            "confidence": 0.91,
            "createdAt": "2026-04-09T09:30:00Z",
            "source": "thread:test",
        }
    ]

    assert growth_response.status_code == 200
    growth_payload = growth_response.json()
    assert growth_payload["learning"] == [
        {
            "memory_id": "learn:canon:1",
            "domain": "learning",
            "subtype": "topic",
            "status": "active",
            "title": "财务表达",
            "summary": "反复出现财务表达纠偏需求",
        }
    ]
    assert growth_payload["procedures"] == []
    assert growth_payload["soul_proposals"] == []

    assert user_model_response.status_code == 200
    assert user_model_response.json() == {
        "items": [
            {
                "memory_id": "mem:user:work",
                "domain": "user_model",
                "subtype": "workContext",
                "status": "active",
                "title": None,
                "summary": "负责财务 BP",
            },
            {
                "memory_id": "mem:user:fact",
                "domain": "user_model",
                "subtype": "preference",
                "status": "active",
                "title": None,
                "summary": "用户偏好结论先行",
            },
        ],
        "source_mode": "memory_os",
    }


def test_growth_user_model_actions_continue_working_via_canonical_store(
    monkeypatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    _save_node(
        repo,
        memory_id="mem:user:style",
        canonical_key="user_model:preference:style",
        summary="用户偏好结论先行",
        node_type="user_model_fact",
        metadata={"domain": "user_model", "subtype": "preference", "category": "preference"},
    )
    _save_revision(
        repo,
        memory_id="mem:user:style",
        revision_number=1,
        summary="用户偏好结论先行",
        created_at="2026-04-09T00:00:00Z",
        payload={"domain": "user_model", "subtype": "preference", "category": "preference"},
    )

    with TestClient(create_app()) as client:
        correct = client.post(
            "/api/memory/growth/user-model/mem:user:style/correct",
            json={"summary": "用户偏好先给结论，再补背景"},
        )
        freeze = client.post("/api/memory/growth/user-model/mem:user:style/freeze")
        forget = client.post("/api/memory/growth/user-model/mem:user:style/forget")

    assert correct.status_code == 200
    assert correct.json()["item"]["summary"] == "用户偏好先给结论，再补背景"
    assert freeze.status_code == 200
    assert forget.status_code == 200

    node = repo.get_memory_node("mem:user:style")
    revisions = repo.list_memory_revisions(memory_id="mem:user:style")

    assert node is not None
    assert node.summary == "用户偏好先给结论，再补背景"
    assert node.status == "invalidated"
    assert [revision.revision_number for revision in revisions] == [2, 1]
    assert revisions[0].summary == "用户偏好先给结论，再补背景"


def test_memory_route_preserves_canonical_zero_confidence_boundary_value(
    monkeypatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    _save_node(
        repo,
        memory_id="mem:user:zero-confidence",
        canonical_key="user_model:fact:zero-confidence",
        summary="这是一条零置信度事实",
        node_type="user_model_fact",
        metadata={
            "domain": "user_model",
            "subtype": "preference",
            "category": "preference",
            "kind": "fact",
            "confidence": 0.0,
            "source": "thread:test-zero",
            "created_at": "2026-04-09T12:00:00Z",
        },
        updated_at="2026-04-09T12:30:00Z",
    )
    _save_revision(
        repo,
        memory_id="mem:user:zero-confidence",
        revision_number=1,
        summary="这是一条零置信度事实",
        created_at="2026-04-09T12:00:00Z",
        payload={
            "domain": "user_model",
            "subtype": "preference",
            "category": "preference",
            "kind": "fact",
            "confidence": 0.0,
            "source": "thread:test-zero",
        },
    )

    with TestClient(create_app()) as client:
        response = client.get("/api/memory")

    assert response.status_code == 200
    assert response.json()["facts"] == [
        {
            "id": "mem:user:zero-confidence",
            "content": "这是一条零置信度事实",
            "category": "preference",
            "confidence": 0.0,
            "createdAt": "2026-04-09T12:00:00Z",
            "source": "thread:test-zero",
        }
    ]


def test_soul_routes_still_project_records_and_events_with_canonical_learning_present(
    monkeypatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    _save_node(
        repo,
        memory_id="learn:canon:2",
        canonical_key="learning:topic:soul-governance",
        summary="最近发生多次 soul 策略波动",
        node_type="learning",
        metadata={"domain": "learning", "subtype": "topic", "title": "Soul 治理观察"},
    )
    _save_revision(
        repo,
        memory_id="learn:canon:2",
        revision_number=1,
        summary="最近发生多次 soul 策略波动",
        created_at="2026-04-09T00:00:00Z",
        payload={"domain": "learning", "subtype": "topic", "title": "Soul 治理观察"},
    )
    _save_record(
        repo,
        memory_id="soul_core_main",
        domain="soul",
        subtype="core",
        summary="长期陪伴、克制稳定、结论先行。",
        scope="agent",
    )
    proposal = create_soul_proposal(
        repo,
        title="减少鼓励式措辞",
        summary="长期证据显示用户偏好低刺激支持。",
    )

    with TestClient(create_app()) as client:
        proposals = client.get("/api/memory/growth/soul/proposals")
        accept = client.post(f"/api/memory/growth/soul/proposals/{proposal['memory_id']}/accept")
        summary = client.get("/api/memory/growth/soul")
        events = client.get("/api/memory/growth/soul/events")

    assert proposals.status_code == 200
    assert proposals.json()["proposals"][0]["memory_id"] == proposal["memory_id"]

    assert accept.status_code == 200
    accepted = accept.json()
    assert accepted["memory_id"] == proposal["memory_id"]
    assert accepted["action"] == "accept"

    assert summary.status_code == 200
    summary_payload = summary.json()
    assert summary_payload["core_soul"]["memory_id"] == "soul_core_main"
    assert summary_payload["current_soul"]["memory_id"] == "soul_overlay_active_main"
    assert summary_payload["summary"]["baseline"] == "长期陪伴、克制稳定、结论先行。"
    assert summary_payload["summary"]["current"] == "长期证据显示用户偏好低刺激支持。"

    assert events.status_code == 200
    event_types = [item["event_type"] for item in events.json()["events"]]
    assert "proposal_accepted" in event_types
