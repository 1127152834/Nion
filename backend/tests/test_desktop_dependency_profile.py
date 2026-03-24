from pathlib import Path


def test_desktop_profile_excludes_server_deployment_dependencies() -> None:
    text = Path("packages/harness/pyproject.toml").read_text(encoding="utf-8")
    assert "kubernetes" not in text or "optional-dependencies" in text
    assert "langgraph-cli" not in text or "optional-dependencies" in text
