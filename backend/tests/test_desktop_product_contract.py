from pathlib import Path


def test_desktop_contract_declares_builder_and_forge() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    product_readme = (repo_root / "README.md").read_text(encoding="utf-8")
    backend_readme = (repo_root / "backend" / "README.md").read_text(encoding="utf-8")
    daemon_launcher = (repo_root / "desktop" / "src" / "main" / "daemon-launcher.ts").read_text(
        encoding="utf-8"
    )
    desktop_package = (repo_root / "desktop" / "package.json").read_text(encoding="utf-8")

    assert "electron-builder" in product_readme
    assert "electron-forge" in desktop_package
    assert "Electron 单窗口客户端 + 本机单 daemon 运行时" in product_readme
    assert "single-window client" in backend_readme
    assert "allow_background_running" in daemon_launcher
