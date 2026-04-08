from __future__ import annotations

import importlib.util
from pathlib import Path


def test_vllm_provider_module_exists_and_loads():
    module_path = (
        Path(__file__).resolve().parents[1]
        / "packages"
        / "harness"
        / "nion"
        / "models"
        / "vllm_provider.py"
    )
    spec = importlib.util.spec_from_file_location("test_vllm_provider_module", module_path)
    assert spec is not None
    assert spec.loader is not None
