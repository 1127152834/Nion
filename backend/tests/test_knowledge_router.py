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


def test_knowledge_query_endpoint_returns_page_based_answer(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    from nion.knowledge.page_store import KnowledgePageStore

    store = KnowledgePageStore(base_dir=tmp_path)
    store.write_page(
        page_id="concept:roadmap",
        page_type="concept",
        title="Roadmap",
        body="## Summary\nRoadmap summary\n",
        sources=["source:notebook_note:note_1"],
        compiled_from=[{"source_id": "source:notebook_note:note_1", "content_hash": "abc123"}],
        last_compiled_at="2026-04-13T10:00:00Z",
    )

    with TestClient(create_app()) as client:
        response = client.get("/api/knowledge/query", params={"question": "roadmap"})

    assert response.status_code == 200
    payload = response.json()
    assert "Roadmap summary" in payload["answer_markdown"]
    assert payload["page_ids"] == ["concept:roadmap"]


def test_knowledge_graph_rebuild_endpoint_returns_graph_payload(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    from nion.knowledge.page_store import KnowledgePageStore

    store = KnowledgePageStore(base_dir=tmp_path)
    store.write_page(
        page_id="concept:roadmap",
        page_type="concept",
        title="Roadmap",
        body="See [[entity:alpha-team]]",
        sources=["source:notebook_note:note_1"],
        compiled_from=[{"source_id": "source:notebook_note:note_1", "content_hash": "abc123"}],
        last_compiled_at="2026-04-13T10:00:00Z",
    )

    with TestClient(create_app()) as client:
        response = client.post("/api/knowledge/graph/rebuild")

    assert response.status_code == 200
    payload = response.json()
    assert "nodes" in payload
    assert "edges" in payload


def test_knowledge_revision_endpoints_create_preview_and_close(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/knowledge/revisions",
            json={
                "page_id": "concept:roadmap",
                "request_type": "fix_fact",
                "instruction": "Fix the owner",
                "optional_source_refs": [],
            },
        )

        assert created.status_code == 200
        request_id = created.json()["request_id"]
        assert created.json()["status"] == "open"

        preview = client.post(f"/api/knowledge/revisions/{request_id}/preview")
        assert preview.status_code == 200
        assert preview.json()["status"] == "previewed"

        closed = client.post(f"/api/knowledge/revisions/{request_id}/close")
        assert closed.status_code == 200
        assert closed.json()["status"] == "closed"


def test_knowledge_lint_endpoint_returns_lint_report(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    from nion.knowledge.page_store import KnowledgePageStore

    store = KnowledgePageStore(base_dir=tmp_path)
    store.write_page(
        page_id="concept:roadmap",
        page_type="concept",
        title="Roadmap",
        body="See [[entity:missing-team]]",
        sources=["source:notebook_note:note_1"],
        compiled_from=[{"source_id": "source:notebook_note:note_1", "content_hash": "abc123"}],
        last_compiled_at="2026-04-13T10:00:00Z",
    )

    with TestClient(create_app()) as client:
        response = client.get("/api/knowledge/lint")

    assert response.status_code == 200
    payload = response.json()
    assert "broken_links" in payload


def test_knowledge_syntheses_endpoint_persists_answer_as_page(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        response = client.post(
            "/api/knowledge/syntheses",
            json={
                "question": "What does the roadmap say?",
                "answer_markdown": "## Summary\nRoadmap summary",
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["page_type"] == "synthesis"
    assert payload["title"] == "What does the roadmap say?"


def test_knowledge_revision_apply_endpoint_returns_applied_status(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/knowledge/revisions",
            json={
                "page_id": "concept:roadmap",
                "request_type": "fix_fact",
                "instruction": "Fix the owner",
                "optional_source_refs": [],
            },
        )
        request_id = created.json()["request_id"]
        applied = client.post(f"/api/knowledge/revisions/{request_id}/apply")

    assert applied.status_code == 200
    assert applied.json()["status"] == "applied"
