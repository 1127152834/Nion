from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.gateway.app import create_app
from app.gateway.routers import memory


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

    with patch(
        "app.gateway.routers.memory.clear_memory_data",
        return_value=_sample_memory(),
    ):
        with TestClient(app) as client:
            response = client.delete("/api/memory")

    assert response.status_code == 200
    assert response.json()["facts"] == []


def test_delete_memory_fact_route_returns_updated_memory() -> None:
    app = FastAPI()
    app.include_router(memory.router)
    updated_memory = _sample_memory(
        facts=[
            {
                "id": "fact_keep",
                "content": "User likes Python",
                "category": "preference",
                "confidence": 0.9,
                "createdAt": "2026-03-20T00:00:00Z",
                "source": "thread-1",
            }
        ]
    )

    with patch(
        "app.gateway.routers.memory.delete_memory_fact",
        return_value=updated_memory,
    ):
        with TestClient(app) as client:
            response = client.delete("/api/memory/facts/fact_delete")

    assert response.status_code == 200
    assert response.json()["facts"] == updated_memory["facts"]


def test_delete_memory_fact_route_returns_404_for_missing_fact() -> None:
    app = FastAPI()
    app.include_router(memory.router)

    with patch(
        "app.gateway.routers.memory.delete_memory_fact",
        side_effect=KeyError("fact_missing"),
    ):
        with TestClient(app) as client:
            response = client.delete("/api/memory/facts/fact_missing")

    assert response.status_code == 404
    assert response.json()["detail"] == "Memory fact 'fact_missing' not found."


def test_memory_router_status_has_no_runtime_block() -> None:
    app = create_app()

    with TestClient(app) as client:
        response = client.get("/api/memory/status")

    assert response.status_code == 200
    payload = response.json()
    assert "config" in payload
    assert "data" in payload
    assert "runtime" not in payload


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
