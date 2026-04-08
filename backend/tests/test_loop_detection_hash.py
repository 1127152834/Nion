from __future__ import annotations

import importlib.util
from pathlib import Path


def _load_loop_module():
    module_path = (
        Path(__file__).resolve().parents[1]
        / "packages"
        / "harness"
        / "nion"
        / "agents"
        / "middlewares"
        / "loop_detection_middleware.py"
    )
    spec = importlib.util.spec_from_file_location(
        "test_loop_detection_middleware_module",
        module_path,
    )
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_read_file_nearby_ranges_share_same_hash():
    module = _load_loop_module()
    a = module._hash_tool_calls(
        [{"name": "read_file", "args": {"path": "/tmp/a.txt", "start_line": 1, "end_line": 80}}]
    )
    b = module._hash_tool_calls(
        [{"name": "read_file", "args": {"path": "/tmp/a.txt", "start_line": 50, "end_line": 120}}]
    )
    assert a == b
