from fastapi.testclient import TestClient

from app.gateway.app import create_app


def test_soul_document_route_exists_and_returns_markdown_payload(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    with TestClient(create_app()) as client:
        response = client.get("/api/soul/document")

    assert response.status_code == 200
    assert response.json()["document"].startswith("# Soul")


def test_soul_document_route_accepts_whole_document_put(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    with TestClient(create_app()) as client:
        response = client.put(
            "/api/soul/document",
            json={
                "document": "# Soul\n\n## Core Identity\n长期陪伴、克制稳定、结论先行。\n",
            },
        )

    assert response.status_code == 200
    assert response.json()["document"].startswith("# Soul")
