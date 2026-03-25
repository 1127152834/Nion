from fastapi.middleware.cors import CORSMiddleware

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
