from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.memory_os.repository import MemoryOSRepository
from nion.memory_os.soul import create_soul_proposal


def test_memory_growth_router_lists_learning_and_soul_items(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    with TestClient(create_app()) as client:
        response = client.get("/api/memory/growth")

    assert response.status_code == 200
    body = response.json()
    assert "learning" in body
    assert "procedures" in body
    assert "soul_proposals" in body


def test_memory_growth_router_lists_user_model_items(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    with TestClient(create_app()) as client:
        response = client.get("/api/memory/growth/user-model")

    assert response.status_code == 200
    body = response.json()
    assert "items" in body


def test_memory_growth_router_reports_source_mode(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    with TestClient(create_app()) as client:
        fallback = client.get("/api/memory/growth/user-model")

    assert fallback.status_code == 200
    assert fallback.json()["source_mode"] == "legacy_fallback"
    assert "items" in fallback.json()

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "user_mem_source_mode",
            "domain": "user_model",
            "subtype": "workContext",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "负责财务汇报",
            "confidence": 0.8,
            "created_at": "2026-04-05T00:00:00Z",
            "updated_at": "2026-04-05T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )

    with TestClient(create_app()) as client:
        memory_os = client.get("/api/memory/growth/user-model")

    assert memory_os.status_code == 200
    body = memory_os.json()
    assert body["source_mode"] == "memory_os"
    assert body["items"][0]["memory_id"] == "user_mem_source_mode"


def test_memory_growth_router_supports_freeze_and_reject(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    with TestClient(create_app()) as client:
        create = client.post(
            "/api/memory/growth/learning",
            json={"title": "财务表达", "summary": "重复出现"},
        )
        learning_id = create.json()["item"]["memory_id"]

        freeze = client.post(f"/api/memory/growth/{learning_id}/freeze")
        reject = client.post(f"/api/memory/growth/{learning_id}/reject")

    assert freeze.status_code == 200
    assert reject.status_code == 200


def test_memory_growth_router_supports_freezing_user_model_item(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    with TestClient(create_app()) as client:
        create = client.post(
            "/api/memory/growth/learning",
            json={"title": "财务表达", "summary": "重复出现"},
        )
        learning_id = create.json()["item"]["memory_id"]

        freeze = client.post(f"/api/memory/growth/user-model/{learning_id}/freeze")

    assert freeze.status_code == 404


def test_memory_growth_router_supports_forgetting_user_model_item(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    with TestClient(create_app()) as client:
        create = client.post(
            "/api/memory/growth/learning",
            json={"title": "财务表达", "summary": "重复出现"},
        )
        learning_id = create.json()["item"]["memory_id"]

        forget = client.post(f"/api/memory/growth/user-model/{learning_id}/forget")

    assert forget.status_code == 404


def test_memory_growth_router_supports_resume_and_accept(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    with TestClient(create_app()) as client:
        create = client.post(
            "/api/memory/growth/learning",
            json={"title": "财务表达", "summary": "重复出现"},
        )
        learning_id = create.json()["item"]["memory_id"]

        accept = client.post(f"/api/memory/growth/{learning_id}/accept")
        resume = client.post(f"/api/memory/growth/{learning_id}/resume")

    assert accept.status_code == 200
    assert resume.status_code == 200


def test_memory_growth_router_freezes_user_model_item(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "user_mem_freeze",
            "domain": "user_model",
            "subtype": "workContext",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "负责财务汇报",
            "confidence": 0.8,
            "created_at": "2026-04-05T00:00:00Z",
            "updated_at": "2026-04-05T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )

    with TestClient(create_app()) as client:
        freeze = client.post("/api/memory/growth/user-model/user_mem_freeze/freeze")

    assert freeze.status_code == 200

    records = repo.list_memory_records(domain="user_model")
    assert records[0]["status"] == "archived"
    assert records[0]["updated_at"].endswith("Z")


def test_memory_growth_router_forgets_user_model_item(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "user_mem_forget",
            "domain": "user_model",
            "subtype": "workContext",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "负责财务汇报",
            "confidence": 0.8,
            "created_at": "2026-04-05T00:00:00Z",
            "updated_at": "2026-04-05T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )

    with TestClient(create_app()) as client:
        forget = client.post("/api/memory/growth/user-model/user_mem_forget/forget")

    assert forget.status_code == 200

    records = repo.list_memory_records(domain="user_model")
    assert records[0]["status"] == "invalidated"
    assert records[0]["updated_at"].endswith("Z")


def test_memory_growth_router_rejects_user_model_item(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "user_mem_reject",
            "domain": "user_model",
            "subtype": "workContext",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "负责财务汇报",
            "confidence": 0.8,
            "created_at": "2026-04-05T00:00:00Z",
            "updated_at": "2026-04-05T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )

    with TestClient(create_app()) as client:
        reject = client.post("/api/memory/growth/user-model/user_mem_reject/reject")

    assert reject.status_code == 200

    records = repo.list_memory_records(domain="user_model")
    assert records[0]["status"] == "invalidated"
    assert records[0]["updated_at"].endswith("Z")


def test_memory_growth_router_corrects_user_model_item(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "user_mem_correct",
            "domain": "user_model",
            "subtype": "workContext",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "负责财务汇报",
            "confidence": 0.8,
            "created_at": "2026-04-05T00:00:00Z",
            "updated_at": "2026-04-05T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )

    with TestClient(create_app()) as client:
        correct = client.post(
            "/api/memory/growth/user-model/user_mem_correct/correct",
            json={"summary": "负责财务 BP 与汇报"},
        )

    assert correct.status_code == 200
    assert correct.json()["item"]["summary"] == "负责财务 BP 与汇报"

    records = repo.list_memory_records(domain="user_model")
    assert records[0]["summary"] == "负责财务 BP 与汇报"
    assert records[0]["updated_at"].endswith("Z")


def test_memory_growth_router_exposes_soul_summary_and_proposal_controls(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    proposal = create_soul_proposal(
        repo,
        title="减少鼓励式措辞",
        summary="长期证据显示用户偏好低刺激支持。",
    )
    repo.save_memory_record(
        {
            "memory_id": "rel_01",
            "domain": "relationship",
            "subtype": "initiative_policy",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "用户偏好低打扰、少施压、结论先行的支持方式。",
            "confidence": 0.9,
            "created_at": "2026-04-07T00:00:00Z",
            "updated_at": "2026-04-07T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )
    repo.save_memory_record(
        {
            "memory_id": "agent_self_narrative_staged_main",
            "domain": "agent_self",
            "subtype": "identity_narrative",
            "owner_type": "agent",
            "scope": "agent",
            "memory_type": "semantic",
            "subject_id": "agent:main",
            "status": "candidate",
            "summary": "我是一个正在变得更稳的助手。",
            "confidence": 0.88,
            "created_at": "2026-04-07T00:00:00Z",
            "updated_at": "2026-04-07T00:00:00Z",
            "artifact_uri": "nion://memory-os/artifacts/agent-self/narrative/staged_identity_narrative.md",
            "provenance": {"source_type": "test"},
        }
    )

    with TestClient(create_app()) as client:
        summary = client.get("/api/memory/growth/soul")
        proposals = client.get("/api/memory/growth/soul/proposals")
        accept = client.post(f"/api/memory/growth/soul/proposals/{proposal['memory_id']}/accept")
        events = client.get("/api/memory/growth/soul/events")
        rollback = client.post("/api/memory/growth/soul/overlay/rollback")

    assert summary.status_code == 200
    assert "summary" in summary.json()
    assert "低打扰" in summary.json()["summary"]["relationship"]
    assert summary.json()["staged_identity_narrative"]["memory_id"] == "agent_self_narrative_staged_main"
    assert proposals.status_code == 200
    assert proposals.json()["proposals"][0]["memory_id"] == proposal["memory_id"]
    assert accept.status_code == 200
    assert events.status_code == 200
    assert rollback.status_code == 200
    assert "events" in events.json()


def test_memory_growth_router_uses_canonical_clock_for_soul_governance_events(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    proposal = create_soul_proposal(
        repo,
        title="减少鼓励式措辞",
        summary="长期证据显示用户偏好低刺激支持。",
    )
    repo.save_memory_record(
        {
            "memory_id": "soul_overlay_active_main",
            "domain": "soul",
            "subtype": "adaptive_overlay",
            "owner_type": "agent",
            "scope": "agent",
            "memory_type": "semantic",
            "subject_id": "agent:main",
            "status": "active",
            "summary": "当前 overlay",
            "confidence": 0.9,
            "created_at": "2026-04-07T00:00:00Z",
            "updated_at": "2026-04-07T00:00:00Z",
            "artifact_uri": "nion://memory-os/artifacts/soul/overlays/active_overlay.md",
            "provenance": {"source_type": "test"},
        }
    )

    with TestClient(create_app()) as client:
        reject = client.post(f"/api/memory/growth/soul/proposals/{proposal['memory_id']}/reject")
        rollback = client.post("/api/memory/growth/soul/overlay/rollback")
        events = client.get("/api/memory/growth/soul/events")

    assert reject.status_code == 200
    assert rollback.status_code == 200
    assert events.status_code == 200

    event_times = {event["event_type"]: event["created_at"] for event in events.json()["events"]}
    assert event_times["proposal_rejected"].endswith("Z")
    assert event_times["overlay_rollback"].endswith("Z")


def test_memory_growth_router_exposes_rich_recent_soul_events(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_soul_event(
        {
            "event_id": "soul_evt_01",
            "event_type": "identity_narrative_staged",
            "memory_id": "agent_self_narrative_staged_main",
            "related_memory_id": None,
            "summary": "主智能体形成了新的身份叙事草稿。",
            "created_at": "2026-04-07T00:00:00Z",
            "actor": "agent:main",
            "source": "soul_artifact_writer",
            "metadata": {"artifact_uri": "nion://memory-os/artifacts/agent-self/narrative/staged_identity_narrative.md"},
        }
    )

    with TestClient(create_app()) as client:
        events = client.get("/api/memory/growth/soul/events")

    assert events.status_code == 200
    body = events.json()
    assert body["events"][0]["event_type"] == "identity_narrative_staged"
    assert body["events"][0]["actor"] == "agent:main"
    assert body["events"][0]["metadata"]["artifact_uri"].endswith("staged_identity_narrative.md")
