from collections.abc import Mapping
from typing import Any

from nion.config.automation_config import get_automation_config

AUTOMATION_SESSION_MODE = "automation"


def build_automation_session_policy(overrides: Mapping[str, Any] | None = None) -> dict[str, Any]:
    policy = dict(get_automation_config().default_session_policy)
    if overrides:
        policy.update(dict(overrides))

    # V1 automation runs always force these guardrails.
    policy["session_mode"] = AUTOMATION_SESSION_MODE
    policy["subagent_enabled"] = False
    policy["is_plan_mode"] = False
    return policy


def is_automation_runtime(context: Mapping[str, Any] | None) -> bool:
    if not context:
        return False
    return context.get("session_mode") == AUTOMATION_SESSION_MODE


def automation_tool_enabled(context: Mapping[str, Any] | None) -> bool:
    return not is_automation_runtime(context)


def is_recursive_schedule_blocked(context: Mapping[str, Any] | None) -> bool:
    return is_automation_runtime(context)
