from fastapi.testclient import TestClient

from app.daemon.app import create_app
from nion.config.paths import reset_paths
from nion.notebook.service import NotebookService


def test_knowledge_queue_endpoint_returns_notebook_candidates(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()
    NotebookService(base_dir=tmp_path).create_note(directory="", title="Inbox Note", body="body")

    with TestClient(create_app()) as client:
        response = client.get("/api/knowledge/queue")

    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["source_kind"] == "notebook_note"


def test_knowledge_page_endpoint_returns_agent_owned_frontmatter_page(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        response = client.get("/api/knowledge/pages/concept:missing")

    assert response.status_code == 404


def test_knowledge_queue_approval_creates_compile_job(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()
    NotebookService(base_dir=tmp_path).create_note(directory="", title="Inbox Note", body="body")

    with TestClient(create_app()) as client:
        queue = client.get("/api/knowledge/queue").json()
        response = client.post(
            "/api/knowledge/queue/approve",
            json={"source_ids": [queue[0]["source_id"]]},
        )

    assert response.status_code == 200
    assert response.json()["status"] == "pending"
