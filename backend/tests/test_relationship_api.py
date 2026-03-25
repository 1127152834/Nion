from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from nion.config.paths import Paths


def _make_app() -> FastAPI:
    from app.gateway.routers.relationships import router

    app = FastAPI()
    app.include_router(router)
    return app


@pytest.fixture()
def relationship_client(tmp_path: Path):
    paths = Paths(base_dir=tmp_path)

    with patch("app.gateway.routers.relationships.get_paths", return_value=paths):
        with TestClient(_make_app()) as client:
            yield client


def test_get_relationship_profile_returns_defaults(relationship_client: TestClient) -> None:
    response = relationship_client.get("/api/memory/relationship")

    assert response.status_code == 200
    assert response.json()["familiarity_level"] == "formal"


def test_put_relationship_profile_persists_updates(relationship_client: TestClient) -> None:
    response = relationship_client.put(
        "/api/memory/relationship",
        json={
            "relationship_type": "friend",
            "familiarity_level": "familiar",
            "address_style": "阿城",
        },
    )

    assert response.status_code == 200
    assert response.json()["relationship_type"] == "friend"

    reread = relationship_client.get("/api/memory/relationship")
    assert reread.status_code == 200
    assert reread.json()["address_style"] == "阿城"
