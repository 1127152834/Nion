from pathlib import Path


def test_desktop_release_workflow_exists() -> None:
    text = Path("../.github/workflows/desktop-release.yml").read_text(encoding="utf-8")
    assert "macos-latest" in text
    assert "windows-latest" in text
    assert "GitHub Releases" in text or "release" in text
