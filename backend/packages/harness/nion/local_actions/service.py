from __future__ import annotations

from dataclasses import dataclass
from uuid import uuid4

from nion.local_actions.models import (
    LocalActionExecutionRecord,
    LocalActionGoal,
    LocalActionPermissionMode,
    LocalActionPlan,
)
from nion.local_actions.planner import build_local_action_plan
from nion.local_actions.policy import decide_local_action_execution
from nion.local_actions.repository import LocalActionsRepository
from nion.memory_os.clock import utcnow_z


@dataclass(slots=True, frozen=True)
class LocalActionsPlanningResult:
    goal: LocalActionGoal
    plan: LocalActionPlan
    execution: LocalActionExecutionRecord


class LocalActionsService:
    def __init__(
        self,
        *,
        repo: LocalActionsRepository,
        permission_mode: LocalActionPermissionMode,
    ) -> None:
        self._repo = repo
        self._permission_mode = permission_mode

    def plan_goal(
        self,
        *,
        source_surface: str,
        source_channel: str | None,
        user_input: str,
    ) -> LocalActionsPlanningResult:
        draft = build_local_action_plan(
            source_surface=source_surface,
            source_channel=source_channel,
            user_input=user_input,
        )
        has_irreversible_action = any(
            not action.reversible for action in draft.plan.actions
        )
        decision = decide_local_action_execution(
            permission_mode=self._permission_mode,
            has_irreversible_action=has_irreversible_action,
        )

        goal_status = (
            "executing"
            if decision.status == "ready_to_execute"
            else decision.status
        )
        goal = draft.goal.model_copy(update={"status": goal_status})
        plan = draft.plan.model_copy(
            update={
                "requires_review": decision.requires_review,
                "risk_level": "high" if has_irreversible_action else draft.plan.risk_level,
            }
        )
        execution = LocalActionExecutionRecord(
            execution_id=f"exec_{uuid4().hex}",
            goal_id=goal.goal_id,
            plan_id=plan.plan_id,
            permission_mode=self._permission_mode,
            approval_status=decision.approval_status,
            executed_actions=[],
            has_irreversible_action=has_irreversible_action,
            audit_summary=plan.summary,
            started_at=utcnow_z(),
            finished_at=None,
        )

        self._repo.save_goal(goal)
        self._repo.save_plan(plan)
        self._repo.save_execution(execution)
        return LocalActionsPlanningResult(goal=goal, plan=plan, execution=execution)
