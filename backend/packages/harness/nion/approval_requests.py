from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

ApprovalRequestKind = Literal["tool_permission", "local_action_plan"]
ApprovalDecision = Literal["allow", "allow_session", "deny"]


@dataclass
class ThreadApprovalRequestRecord:
    id: str
    thread_id: str
    approval_kind: ApprovalRequestKind
    original_message_text: str
    replay_payload: dict[str, Any]
    status: str
    created_at: str
    tool_name: str | None = None
    tool_input: dict[str, Any] | None = None
    local_action_payload: dict[str, Any] | None = None
    resolved_at: str | None = None
    consumed: bool = False


def normalize_approval_kind(
    raw: Any,
    *,
    tool_name: str | None = None,
) -> ApprovalRequestKind:
    if raw == "local_action_plan":
        return "local_action_plan"
    if raw == "tool_permission":
        return "tool_permission"
    if tool_name == "local_actions_review":
        return "local_action_plan"
    return "tool_permission"
