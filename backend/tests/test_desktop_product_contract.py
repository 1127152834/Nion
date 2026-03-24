from pathlib import Path


def test_desktop_contract_declares_builder_and_forge() -> None:
    contract = (
        Path(__file__).resolve().parents[2] / "docs" / "desktop" / "desktop-product-contract.md"
    ).read_text(encoding="utf-8")
    assert "electron-builder" in contract
    assert "electron-forge" in contract
    assert "GitHub Releases" in contract
    assert "generic CDN" in contract
