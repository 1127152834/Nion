from __future__ import annotations

from dataclasses import dataclass

from nion.local_actions.models import (
    LocalActionApprovalStatus,
    LocalActionPermissionMode,
)


LocalActionDecisionStatus = str


@dataclass(slots=True, frozen=True)
class LocalActionExecutionDecision:
    status: LocalActionDecisionStatus
    requires_review: bool
    approval_status: LocalActionApprovalStatus


def decide_local_action_execution(
    *,
    permission_mode: LocalActionPermissionMode,
    has_irreversible_action: bool,
) -> LocalActionExecutionDecision:
    del has_irreversible_action

    if permission_mode == "disabled":
        return LocalActionExecutionDecision(
            status="blocked",
            requires_review=False,
            approval_status="not_required",
        )
    if permission_mode == "review_required":
        return LocalActionExecutionDecision(
            status="awaiting_review",
            requires_review=True,
            approval_status="pending",
        )
    return LocalActionExecutionDecision(
        status="ready_to_execute",
        requires_review=False,
        approval_status="not_required",
    )
