from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.gateway.app import create_app
from app.gateway.routers import memory
from nion.memory_os.repository import MemoryOSRepository


def _sample_memory(facts: list[dict] | None = None) -> dict:
    return {
        "version": "1.0",
        "lastUpdated": "2026-03-26T12:00:00Z",
        "user": {
            "workContext": {"summary": "", "updatedAt": ""},
            "personalContext": {"summary": "", "updatedAt": ""},
            "topOfMind": {"summary": "", "updatedAt": ""},
        },
        "history": {
            "recentMonths": {"summary": "", "updatedAt": ""},
            "earlierContext": {"summary": "", "updatedAt": ""},
            "longTermBackground": {"summary": "", "updatedAt": ""},
        },
        "facts": facts or [],
    }


def collect_gateway_routes() -> set[str]:
    app = create_app()
    return {route.path for route in app.routes}


def test_gateway_docs_and_router_surface_match() -> None:
    routes = collect_gateway_routes()

    assert "/api/memory" in routes
    assert "/api/openviking/status" not in routes


def test_clear_memory_route_returns_cleared_memory() -> None:
    app = FastAPI()
    app.include_router(memory.router)

    with TestClient(app) as client:
        response = client.delete("/api/memory")

    assert response.status_code == 200
    assert response.json()["facts"] == []


def test_delete_memory_fact_route_returns_updated_memory() -> None:
    app = FastAPI()
    app.include_router(memory.router)
    with TestClient(app) as client:
        create_response = client.post(
            "/api/memory/facts",
            json={
                "content": "User likes Python",
                "category": "preference",
                "confidence": 0.9,
            },
        )
        fact_id = create_response.json()["facts"][0]["id"]
        response = client.delete(f"/api/memory/facts/{fact_id}")

    assert response.status_code == 200
    assert response.json()["facts"] == []


def test_delete_memory_fact_route_returns_404_for_missing_fact() -> None:
    app = FastAPI()
    app.include_router(memory.router)
    with TestClient(app) as client:
        response = client.delete("/api/memory/facts/fact_missing")

    assert response.status_code == 404
    assert response.json()["detail"] == "Memory fact 'fact_missing' not found."


def test_create_memory_fact_route_returns_updated_memory() -> None:
    app = FastAPI()
    app.include_router(memory.router)
    with TestClient(app) as client:
        response = client.post(
            "/api/memory/facts",
            json={
                "content": "User likes structured memory",
                "category": "preference",
                "confidence": 0.8,
            },
        )

    assert response.status_code == 200
    assert response.json()["facts"][0]["content"] == "User likes structured memory"


def test_patch_memory_fact_route_returns_updated_memory() -> None:
    app = FastAPI()
    app.include_router(memory.router)
    with TestClient(app) as client:
        create_response = client.post(
            "/api/memory/facts",
            json={
                "content": "Original fact",
                "category": "context",
                "confidence": 0.9,
            },
        )
        fact_id = create_response.json()["facts"][0]["id"]
        response = client.patch(
            f"/api/memory/facts/{fact_id}",
            json={"content": "Updated fact"},
        )

    assert response.status_code == 200
    assert response.json()["facts"][0]["content"] == "Updated fact"


def test_export_memory_route_returns_current_memory() -> None:
    app = FastAPI()
    app.include_router(memory.router)
    with TestClient(app) as client:
        response = client.get("/api/memory/export")

    assert response.status_code == 200
    assert response.json()["version"] == "2.0"


def test_import_memory_route_returns_imported_memory() -> None:
    app = FastAPI()
    app.include_router(memory.router)
    imported_memory = _sample_memory()
    imported_memory["lastUpdated"] = "2026-04-02T12:00:00Z"
    imported_memory["user"]["workContext"]["summary"] = "负责财务汇报"
    imported_memory["user"]["workContext"]["updatedAt"] = "2026-04-02T12:00:00Z"

    with TestClient(app) as client:
        response = client.post("/api/memory/import", json=imported_memory)

    assert response.status_code == 200
    assert response.json()["lastUpdated"].endswith("Z")
    assert response.json()["user"]["workContext"]["summary"] == "负责财务汇报"


def test_memory_router_status_has_no_runtime_block() -> None:
    app = create_app()

    with TestClient(app) as client:
        response = client.get("/api/memory/status")

    assert response.status_code == 200
    payload = response.json()
    assert "config" in payload
    assert "data" in payload
    assert "runtime" not in payload


def test_memory_router_reads_memory_os_projection_without_legacy_updater(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "user_work_1",
            "domain": "user_model",
            "subtype": "workContext",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "负责财务 BP",
            "confidence": 0.8,
            "created_at": "2026-04-07T00:00:00Z",
            "updated_at": "2026-04-07T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )

    with TestClient(create_app()) as client:
        response = client.get("/api/memory")

    assert response.status_code == 200
    payload = response.json()
    assert payload["user"]["workContext"]["summary"] == "负责财务 BP"


def test_memory_router_status_uses_memory_os_projection_without_legacy_updater(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    with TestClient(create_app()) as client:
        response = client.get("/api/memory/status")

    assert response.status_code == 200
    assert "data" in response.json()


def test_memory_router_does_not_register_memory_os_or_maintenance_routes() -> None:
    routes = collect_gateway_routes()

    assert "/api/memory" in routes
    assert "/api/memory/config" in routes
    assert "/api/memory/status" in routes
    assert "/api/memory/reload" in routes

    assert "/api/memory-os/providers/families" not in routes
    assert "/api/autodream/run" not in routes
    assert "/api/self-maintenance/run" not in routes
    assert "/api/heartbeat/status" not in routes
    assert "/api/memory/compact" not in routes
    assert not any(
        route == "/api/memory/rebuild" or route.startswith("/api/memory/rebuild/")
        for route in routes
    )
