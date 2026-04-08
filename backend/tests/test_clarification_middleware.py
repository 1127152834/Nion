from __future__ import annotations

import importlib.util
import sys
import types
from pathlib import Path


def _load_clarification_module():
    hooks_pkg = types.ModuleType("nion.hooks")
    hooks_pkg.HookEvent = types.SimpleNamespace(USER_PROMPT_SUBMIT="user_prompt_submit")
    hooks_pkg.dispatch_tool_call_in_runtime_hook = lambda *args, **kwargs: {
        "event": "user_prompt_submit",
        "mode": "in_runtime",
    }

    nion_pkg = sys.modules.setdefault("nion", types.ModuleType("nion"))
    setattr(nion_pkg, "hooks", hooks_pkg)
    sys.modules["nion.hooks"] = hooks_pkg

    module_path = (
        Path(__file__).resolve().parents[1]
        / "packages"
        / "harness"
        / "nion"
        / "agents"
        / "middlewares"
        / "clarification_middleware.py"
    )
    spec = importlib.util.spec_from_file_location(
        "test_clarification_middleware_module",
        module_path,
    )
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_clarification_middleware_normalizes_json_string_options():
    module = _load_clarification_module()
    middleware = module.ClarificationMiddleware()

    rendered = middleware._format_clarification_message(
        {
            "question": "Choose environment",
            "clarification_type": "approach_choice",
            "options": '["dev","prod"]',
        }
    )

    assert "1. dev" in rendered
    assert "2. prod" in rendered
