from __future__ import annotations

from unittest.mock import patch

from nion.agents.middlewares.tool_error_handling_middleware import (
    build_lead_runtime_middlewares,
)
from nion.config.guardrails_config import reset_guardrails_config


def test_workspace_runtime_requires_approval_for_cli_install_and_update() -> None:
    reset_guardrails_config()

    captured: dict[str, list[str] | None] = {}

    class CapturingAllowlistProvider:
        def __init__(
            self,
            *,
            allowed_tools: list[str] | None = None,
            denied_tools: list[str] | None = None,
            approval_tools: list[str] | None = None,
        ) -> None:
            captured["allowed_tools"] = allowed_tools
            captured["denied_tools"] = denied_tools
            captured["approval_tools"] = approval_tools

    with patch(
        "nion.guardrails.builtin.AllowlistProvider",
        CapturingAllowlistProvider,
    ):
        build_lead_runtime_middlewares(surface="workspace", lazy_init=True)

    assert "codepilot_cli_tools_install" in (captured["approval_tools"] or [])
    assert "codepilot_cli_tools_update" in (captured["approval_tools"] or [])
