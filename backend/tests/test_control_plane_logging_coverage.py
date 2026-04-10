from pathlib import Path


def test_control_plane_coverage_notes_exist_for_key_modules() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    product_readme = (repo_root / "README.md").read_text(encoding="utf-8")
    backend_readme = (repo_root / "backend" / "README.md").read_text(encoding="utf-8")
    combined = f"{product_readme}\n{backend_readme}"

    assert "daemon lifecycle events" in combined
    assert "thread stream events" in combined
    assert "delegated task lifecycle events" in combined
    assert "subagent execution lifecycle events" in combined
    assert "channel service lifecycle" in combined
    assert "message-bus" in combined
    assert "channel diagnostics" in combined
    assert "runtime actions" in combined
    assert "incident records" in combined
    assert "chat-triggered diagnosis" in combined
    assert "incident playbooks" in combined
    assert "suggested-action confirmation model" in combined
    assert "desktop diagnostics center" in combined
    assert "task diagnostics" in combined
    assert "skill mutation events" in combined
    assert "config mutation events" in combined
