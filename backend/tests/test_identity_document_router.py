from fastapi.testclient import TestClient

from app.gateway.app import create_app


def test_identity_document_route_exists_and_returns_markdown_payload(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    with TestClient(create_app()) as client:
        response = client.get("/api/identity/document")

    assert response.status_code == 200
    assert response.json()["document"].startswith("# Identity")


def test_identity_document_route_accepts_whole_document_put(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    with TestClient(create_app()) as client:
        response = client.put(
            "/api/identity/document",
            json={
                "document": "# Identity\n\n## Core\n- User name: 张天成\n",
            },
        )

    assert response.status_code == 200
    assert response.json()["document"].startswith("# Identity")
