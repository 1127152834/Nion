from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.memory.soul.console_service import build_soul_settings_payload
from nion.memory_os.repository import MemoryOSRepository


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
    document = (
        "# Soul\n\n"
        "## Core Identity\n长期陪伴、克制稳定、结论先行。\n\n"
        "## Speech Style\n先给结论，再补上下文。\n"
    )

    with TestClient(create_app()) as client:
        response = client.put(
            "/api/soul/document",
            json={
                "document": document,
            },
        )

    assert response.status_code == 200
    assert response.json()["document"] == document
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    settings = build_soul_settings_payload(repo, now_z="2026-04-13T00:00:00Z")
    assert settings["core_identity"] == "长期陪伴、克制稳定、结论先行。"
    assert settings["speech_style"] == "先给结论，再补上下文。"
