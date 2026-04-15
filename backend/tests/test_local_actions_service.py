from nion.local_actions.repository import LocalActionsRepository
from nion.local_actions.service import LocalActionsService


def test_service_creates_plan_and_audit_record(tmp_path) -> None:
    repo = LocalActionsRepository(tmp_path / "local_actions.db")
    service = LocalActionsService(repo=repo, permission_mode="review_required")

    result = service.plan_goal(
        source_surface="bridge",
        source_channel="telegram",
        user_input="Organize my Downloads folder",
    )

    assert result.goal.status == "awaiting_review"
    assert result.plan.requires_review is True
    assert result.execution.approval_status == "pending"
    assert repo.get_goal(result.goal.goal_id) == result.goal
    assert repo.get_plan(result.plan.plan_id) == result.plan
    assert repo.get_execution(result.execution.execution_id) == result.execution


def test_service_marks_goal_blocked_when_permission_mode_is_disabled(tmp_path) -> None:
    repo = LocalActionsRepository(tmp_path / "local_actions.db")
    service = LocalActionsService(repo=repo, permission_mode="disabled")

    result = service.plan_goal(
        source_surface="bridge",
        source_channel="telegram",
        user_input="Capture a screenshot of the current window",
    )

    assert result.goal.status == "blocked"
    assert result.plan.requires_review is False
    assert result.execution.approval_status == "not_required"
