from __future__ import annotations

from dataclasses import dataclass
from uuid import uuid4

from nion.local_actions.models import LocalActionGoal, LocalActionItem, LocalActionPlan
from nion.memory_os.clock import utcnow_z


@dataclass(slots=True, frozen=True)
class LocalActionPlanningDraft:
    goal: LocalActionGoal
    plan: LocalActionPlan


def build_local_action_plan(
    *,
    source_surface: str,
    source_channel: str | None,
    user_input: str,
) -> LocalActionPlanningDraft:
    created_at = utcnow_z()
    goal_id = f"goal_{uuid4().hex}"
    goal = LocalActionGoal(
        goal_id=goal_id,
        source_surface=source_surface,
        source_channel=source_channel,
        user_input=user_input,
        status="planned",
        created_at=created_at,
    )
    plan = LocalActionPlan(
        plan_id=f"plan_{uuid4().hex}",
        goal_id=goal_id,
        summary=user_input.strip() or "Local action goal",
        risk_level="low",
        requires_review=False,
        actions=[
            LocalActionItem(
                action_id=f"action_{uuid4().hex}",
                action_type="analyze_goal",
                target="",
                parameters={"user_input": user_input},
                reversible=True,
                risk_level="low",
                status="pending",
            )
        ],
        created_at=created_at,
    )
    return LocalActionPlanningDraft(goal=goal, plan=plan)
