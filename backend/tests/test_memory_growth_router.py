from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.memory_os.repository import MemoryOSRepository


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


def test_memory_growth_router_supports_real_user_model_controls(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "user_mem_1",
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
        freeze = client.post("/api/memory/growth/user-model/user_mem_1/freeze")
        forget = client.post("/api/memory/growth/user-model/user_mem_1/forget")
        reject = client.post("/api/memory/growth/user-model/user_mem_1/reject")
        correct = client.post(
            "/api/memory/growth/user-model/user_mem_1/correct",
            json={"summary": "负责财务 BP 与汇报"},
        )

    assert freeze.status_code == 200
    assert forget.status_code == 200
    assert reject.status_code == 200
    assert correct.status_code == 200
    assert correct.json()["item"]["summary"] == "负责财务 BP 与汇报"
