from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
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
    normalized_input = user_input.strip()
    lowered_input = normalized_input.lower()
    if "download" in lowered_input:
        action = LocalActionItem(
            action_id=f"action_{uuid4().hex}",
            action_type="organize_downloads",
            target=str(Path.home() / "Downloads"),
            parameters={"strategy": "archive-and-trash-temp"},
            reversible=False,
            risk_level="high",
            status="pending",
        )
        summary = "Organize the Downloads folder and trash temporary leftovers"
        risk_level = "high"
    elif "screenshot" in lowered_input or "screen shot" in lowered_input:
        action = LocalActionItem(
            action_id=f"action_{uuid4().hex}",
            action_type="capture_active_window",
            target="active_window",
            parameters={"format": "png"},
            reversible=True,
            risk_level="low",
            status="pending",
        )
        summary = "Capture a screenshot of the active window"
        risk_level = "low"
    else:
        action = LocalActionItem(
            action_id=f"action_{uuid4().hex}",
            action_type="analyze_goal",
            target="",
            parameters={"user_input": user_input},
            reversible=True,
            risk_level="low",
            status="pending",
        )
        summary = normalized_input or "Local action goal"
        risk_level = "low"
    plan = LocalActionPlan(
        plan_id=f"plan_{uuid4().hex}",
        goal_id=goal_id,
        summary=summary,
        risk_level=risk_level,
        requires_review=False,
        actions=[action],
        created_at=created_at,
    )
    return LocalActionPlanningDraft(goal=goal, plan=plan)
