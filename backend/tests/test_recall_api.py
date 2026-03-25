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
    seed = recall_client.post(
        "/api/recall/query",
        json={"thread_id": "t1", "query": "yesterday"},
    )

    assert seed.status_code == 200
    assert "items" in seed.json()
    assert seed.json()["items"][0]["kind"] == "no_match"


def test_recall_continuity_endpoint_returns_block(recall_client: TestClient) -> None:
    response = recall_client.post(
        "/api/recall/continuity",
        json={"thread_id": "t1", "user_message": "continue yesterday"},
    )

    assert response.status_code == 200
    assert "<continuity_context>" in response.json()["continuity_block"]
