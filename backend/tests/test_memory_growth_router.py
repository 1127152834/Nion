from fastapi.testclient import TestClient

from app.gateway.app import create_app


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
