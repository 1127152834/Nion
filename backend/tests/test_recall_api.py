from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from nion.config.paths import Paths


def _make_app() -> FastAPI:
    from app.gateway.routers.recall import router

    app = FastAPI()
    app.include_router(router)
    return app


@pytest.fixture()
def recall_client(tmp_path: Path):
    paths = Paths(base_dir=tmp_path)

    with patch("app.gateway.routers.recall.get_paths", return_value=paths):
        with TestClient(_make_app()) as client:
            yield client


def test_recall_query_endpoint_returns_normalized_items(recall_client: TestClient) -> None:
    response = recall_client.get(
        "/api/recall/search",
        params={"thread_id": "t1", "q": "yesterday"},
    )

    assert response.status_code == 200
    assert response.json() == {"scope": "thread", "results": []}


def test_recall_search_endpoint_can_query_global_scope(recall_client: TestClient) -> None:
    response = recall_client.get(
        "/api/recall/search",
        params={"q": "yesterday"},
    )

    assert response.status_code == 200
    assert response.json() == {"scope": "global", "results": []}
