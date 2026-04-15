from __future__ import annotations

from dataclasses import dataclass
from uuid import uuid4

from nion.local_actions.models import (
    LocalActionExecutionRecord,
    LocalActionGoal,
    LocalActionItem,
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

    def list_history(self, *, limit: int = 20) -> list[LocalActionsPlanningResult]:
        results: list[LocalActionsPlanningResult] = []
        for execution in self._repo.list_recent_executions(limit=limit):
            goal = self._repo.get_goal(execution.goal_id)
            plan = self._repo.get_plan(execution.plan_id)
            if goal is None or plan is None:
                continue
            results.append(
                LocalActionsPlanningResult(
                    goal=goal,
                    plan=plan,
                    execution=execution,
                )
            )
        return results

    def record_execution_result(
        self,
        *,
        execution_id: str,
        executed_actions: list[LocalActionItem],
    ) -> LocalActionsPlanningResult:
        execution = self._repo.get_execution(execution_id)
        if execution is None:
            raise ValueError(f"Unknown local action execution: {execution_id}")
        goal = self._repo.get_goal(execution.goal_id)
        plan = self._repo.get_plan(execution.plan_id)
        if goal is None or plan is None:
            raise ValueError(f"Missing local action goal/plan for execution: {execution_id}")

        success_count = sum(
            1 for action in executed_actions if getattr(action, "status", None) == "succeeded"
        )
        failure_count = sum(
            1 for action in executed_actions if getattr(action, "status", None) == "failed"
        )
        goal_status = "failed" if failure_count > 0 else "completed"
        updated_goal = goal.model_copy(update={"status": goal_status})
        updated_execution = execution.model_copy(
            update={
                "executed_actions": executed_actions,
                "finished_at": utcnow_z(),
                "audit_summary": f"{success_count} succeeded, {failure_count} failed",
            }
        )
        self._repo.save_goal(updated_goal)
        self._repo.save_execution(updated_execution)
        return LocalActionsPlanningResult(
            goal=updated_goal,
            plan=plan,
            execution=updated_execution,
        )

    def reject_execution(self, execution_id: str) -> LocalActionsPlanningResult:
        execution = self._repo.get_execution(execution_id)
        if execution is None:
            raise ValueError(f"Unknown local action execution: {execution_id}")
        goal = self._repo.get_goal(execution.goal_id)
        plan = self._repo.get_plan(execution.plan_id)
        if goal is None or plan is None:
            raise ValueError(f"Missing local action goal/plan for execution: {execution_id}")

        updated_goal = goal.model_copy(update={"status": "blocked"})
        updated_execution = execution.model_copy(
            update={
                "approval_status": "rejected",
                "finished_at": utcnow_z(),
                "audit_summary": "Execution rejected by user review",
            }
        )
        self._repo.save_goal(updated_goal)
        self._repo.save_execution(updated_execution)
        return LocalActionsPlanningResult(
            goal=updated_goal,
            plan=plan,
            execution=updated_execution,
        )

    def approve_execution(self, execution_id: str) -> LocalActionsPlanningResult:
        execution = self._repo.get_execution(execution_id)
        if execution is None:
            raise ValueError(f"Unknown local action execution: {execution_id}")
        goal = self._repo.get_goal(execution.goal_id)
        plan = self._repo.get_plan(execution.plan_id)
        if goal is None or plan is None:
            raise ValueError(f"Missing local action goal/plan for execution: {execution_id}")

        updated_goal = goal.model_copy(update={"status": "executing"})
        updated_execution = execution.model_copy(
            update={
                "approval_status": "approved",
                "audit_summary": "Execution approved and ready to run",
            }
        )
        self._repo.save_goal(updated_goal)
        self._repo.save_execution(updated_execution)
        return LocalActionsPlanningResult(
            goal=updated_goal,
            plan=plan,
            execution=updated_execution,
        )
