from nion.local_actions.models import (
    LocalActionExecutionRecord,
    LocalActionGoal,
    LocalActionItem,
    LocalActionPlan,
)
from nion.local_actions.repository import LocalActionsRepository


def test_local_actions_repository_roundtrips_goal_plan_and_execution(tmp_path):
    repo = LocalActionsRepository(tmp_path / "local_actions.db")
    goal = LocalActionGoal(
        goal_id="goal_1",
        source_surface="bridge",
        source_channel="telegram",
        user_input="Organize my Downloads folder",
        status="planned",
        created_at="2026-04-15T00:00:00Z",
    )
    plan = LocalActionPlan(
        plan_id="plan_1",
        goal_id="goal_1",
        summary="Organize downloads and delete temp files",
        risk_level="high",
        requires_review=True,
        actions=[
            LocalActionItem(
                action_id="action_1",
                action_type="move_file",
                target="~/Downloads",
                parameters={"destination": "~/Downloads/archive"},
                reversible=True,
                risk_level="medium",
            ),
            LocalActionItem(
                action_id="action_2",
                action_type="delete_file",
                target="~/Downloads/tmp.txt",
                parameters={},
                reversible=False,
                risk_level="high",
            ),
        ],
        created_at="2026-04-15T00:00:00Z",
    )
    execution = LocalActionExecutionRecord(
        execution_id="exec_1",
        goal_id="goal_1",
        plan_id="plan_1",
        permission_mode="review_required",
        approval_status="pending",
        executed_actions=[
            LocalActionItem(
                action_id="action_1",
                action_type="move_file",
                target="~/Downloads",
                parameters={"destination": "~/Downloads/archive"},
                reversible=True,
                risk_level="medium",
                status="succeeded",
                result_summary="Moved file into archive folder",
            )
        ],
        has_irreversible_action=True,
        audit_summary="Awaiting review",
        started_at="2026-04-15T00:00:00Z",
        finished_at=None,
    )

    repo.save_goal(goal)
    repo.save_plan(plan)
    repo.save_execution(execution)

    assert repo.get_goal("goal_1") == goal
    assert repo.get_plan("plan_1") == plan
    assert repo.get_execution("exec_1") == execution
