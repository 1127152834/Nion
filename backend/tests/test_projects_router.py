from __future__ import annotations

from fastapi.testclient import TestClient

from app.gateway.app import create_app


def test_project_creation_builds_initial_dashboard(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))

    with TestClient(create_app()) as client:
        create = client.post(
            "/api/projects",
            json={"name": "Project Alpha", "goal": "Build project module"},
        )

        assert create.status_code == 200
        project = create.json()
        assert project["name"] == "Project Alpha"
        assert project["current_phase"] == "头脑风暴"
        assert project["active_phase_snapshot_id"]

        dashboard = client.get(f"/api/projects/{project['id']}")
        assert dashboard.status_code == 200
        payload = dashboard.json()
        assert payload["project"]["name"] == "Project Alpha"
        assert payload["progress"]["phase_track"][0]["phase"] == "头脑风暴"
        assert payload["next_action"]["type"] == "create_thread"
        assert payload["stats"]["plan_total"] == 0


def test_primary_plan_is_unique_within_same_phase(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))

    with TestClient(create_app()) as client:
        project = client.post("/api/projects", json={"name": "Project Alpha"}).json()
        plan_a = client.post(
            f"/api/projects/{project['id']}/plans",
            json={"phase": "计划", "title": "Plan A", "is_primary": True},
        ).json()
        plan_b = client.post(
            f"/api/projects/{project['id']}/plans",
            json={"phase": "计划", "title": "Plan B", "is_primary": True},
        ).json()

        plans = client.get(f"/api/projects/{project['id']}/plans").json()["items"]
        indexed = {item["id"]: item for item in plans}
        assert indexed[plan_a["id"]]["is_primary"] is False
        assert indexed[plan_b["id"]]["is_primary"] is True


def test_project_thread_creation_marks_first_thread_as_primary(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))

    with TestClient(create_app()) as client:
        project = client.post("/api/projects", json={"name": "Project Alpha"}).json()
        thread = client.post(
            f"/api/projects/{project['id']}/threads",
            json={"title": "Main project thread", "role": "implementation"},
        )

        assert thread.status_code == 200
        payload = thread.json()
        assert payload["is_primary_thread"] is True
        assert payload["role"] == "primary"

        dashboard = client.get(f"/api/projects/{project['id']}").json()
        assert dashboard["project"]["current_primary_thread_id"] == payload["thread_id"]
        assert dashboard["next_action"]["type"] == "continue_primary_thread"


def test_project_thread_import_rejects_cross_project_thread(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))

    with TestClient(create_app()) as client:
        project_a = client.post("/api/projects", json={"name": "Project A"}).json()
        project_b = client.post("/api/projects", json={"name": "Project B"}).json()
        source = client.post(
            f"/api/projects/{project_a['id']}/threads",
            json={"title": "Source thread"},
        ).json()
        target = client.post(
            f"/api/projects/{project_b['id']}/threads",
            json={"title": "Target thread"},
        ).json()

        response = client.post(
            f"/api/projects/{project_b['id']}/threads/{target['thread_id']}/imports",
            json={"source_thread_id": source["thread_id"]},
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "Source thread is not part of this project"


def test_confirm_plan_outcome_creates_pending_decision_candidates(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))

    with TestClient(create_app()) as client:
        project = client.post("/api/projects", json={"name": "Project Alpha"}).json()
        plan = client.post(
            f"/api/projects/{project['id']}/plans",
            json={"phase": "实施", "title": "Execution Plan", "is_gate_plan": True},
        ).json()

        response = client.post(
            f"/api/projects/{project['id']}/plans/{plan['id']}/confirm-outcome",
            json={"outcome_status": "done", "outcome_summary": "Execution finished"},
        )

        assert response.status_code == 200
        dashboard = client.get(f"/api/projects/{project['id']}").json()
        assert dashboard["current_primary_plan"]["outcome_status"] == "done"
        memory = client.get(f"/api/projects/{project['id']}/memory").json()
        assert "Execution finished" in memory["summary"]["handoff"]
