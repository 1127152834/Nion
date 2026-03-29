from fastapi.testclient import TestClient

from app.daemon.app import create_app
from nion.config.paths import reset_paths
from nion.notebook.service import NotebookService


def test_openviking_router_can_reindex_and_search_notebook(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    notebook = NotebookService(base_dir=tmp_path)
    notebook.create_note(
        directory="projects/alpha",
        title="Roadmap",
        body="# Roadmap\n\nAlpha launch depends on onboarding quality.",
    )

    with TestClient(create_app()) as client:
        reindex = client.post("/api/openviking/notebook/reindex")
        assert reindex.status_code == 200
        assert reindex.json()["notes_indexed"] == 1

        search = client.get(
            "/api/openviking/notebook/search",
            params={"query": "onboarding quality", "limit": 3},
        )
        assert search.status_code == 200
        payload = search.json()
        assert len(payload["items"]) == 1
        assert payload["items"][0]["source_relative_path"] == "projects/alpha/roadmap.md"

        preview = client.get(
            "/api/openviking/notebook/context-preview",
            params={"query": "onboarding quality", "limit": 3},
        )
        assert preview.status_code == 200
        preview_payload = preview.json()
        assert len(preview_payload["items"]) == 1
        assert "projects/alpha/roadmap.md" in preview_payload["markdown"]
