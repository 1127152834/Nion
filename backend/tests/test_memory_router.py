from app.gateway.app import create_app


def collect_gateway_routes() -> set[str]:
    app = create_app()
    return {route.path for route in app.routes}


def test_gateway_docs_and_router_surface_match() -> None:
    routes = collect_gateway_routes()

    assert "/api/memory" in routes
    assert "/api/openviking/status" not in routes
