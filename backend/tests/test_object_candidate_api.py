from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.config.paths import reset_paths


def test_object_candidates_api_exposes_candidate_center_routes(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/notebook/bridge/project-drafts",
            json={"note_ids": ["note-1"], "fragment_ids": [], "mode": "project_draft"},
        )
        assert created.status_code == 200
        candidate_id = created.json()["candidate"]["id"]

        listed = client.get("/api/object-candidates")
        assert listed.status_code == 200
        assert listed.json()["items"]
        assert listed.json()["items"][0]["id"] == candidate_id

        detail = client.get(f"/api/object-candidates/{candidate_id}")
        assert detail.status_code == 200
        assert detail.json()["candidate"]["id"] == candidate_id

        deferred = client.post(
            f"/api/object-candidates/{candidate_id}/defer",
            json={
                "deferred_until": "2026-04-03T09:00:00Z",
                "reason": "later",
            },
        )
        assert deferred.status_code == 200
        assert deferred.json()["candidate"]["deferred_reason"] == "later"

        dismissed = client.post(
            f"/api/object-candidates/{candidate_id}/dismiss",
            json={"reason": "not needed"},
        )
        assert dismissed.status_code == 200
        assert dismissed.json()["candidate"]["status"] == "dismissed"


def test_object_candidates_apply_route_applies_ready_candidate(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/projects/proj-1/bridge/memory-candidates",
            json={"kind": "long_term_memory", "scope": "whole_project"},
        )
        assert created.status_code == 200
        candidate_id = created.json()["candidate"]["id"]

        applied = client.post(f"/api/object-candidates/{candidate_id}/apply")
        assert applied.status_code == 200
        assert applied.json()["candidate"]["status"] == "applied"
        assert applied.json()["applied_target"]["target_object_type"] == "memory"
