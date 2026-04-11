from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

from app.gateway.app import create_app


def test_gateway_allows_desktop_protocol_origin() -> None:
    app = create_app()

    cors_middleware = next(
        (middleware for middleware in app.user_middleware if middleware.cls is CORSMiddleware),
        None,
    )

    assert cors_middleware is not None
    assert "nion://app" in cors_middleware.kwargs["allow_origins"]
    assert "http://localhost:3000" in cors_middleware.kwargs["allow_origins"]
    assert "http://127.0.0.1:3000" in cors_middleware.kwargs["allow_origins"]
    assert "http://127.0.0.1:5173" in cors_middleware.kwargs["allow_origins"]


def test_gateway_accepts_preflight_from_127_dev_origin() -> None:
    app = create_app()

    with TestClient(app) as client:
        response = client.options(
            "/api/memory/settings",
            headers={
                "Origin": "http://127.0.0.1:3000",
                "Access-Control-Request-Method": "GET",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:3000"
