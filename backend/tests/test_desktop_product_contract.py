from pathlib import Path


def test_desktop_contract_declares_builder_and_forge() -> None:
    contract = (
        Path(__file__).resolve().parents[2] / "docs" / "desktop" / "desktop-product-contract.md"
    ).read_text(encoding="utf-8")
    assert "electron-builder" in contract
    assert "electron-forge" in contract
    assert "single local daemon" in contract
    assert "Electron single-window client" in contract
    assert "allow_background_running" in contract
