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
    assert result.plan.actions[0].action_type == "organize_downloads"
    assert result.execution.has_irreversible_action is True


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
    assert result.plan.actions[0].action_type == "capture_active_window"


def test_service_allows_direct_execution_and_marks_goal_executing(tmp_path) -> None:
    repo = LocalActionsRepository(tmp_path / "local_actions.db")
    service = LocalActionsService(repo=repo, permission_mode="allow_all")

    result = service.plan_goal(
        source_surface="bridge",
        source_channel="telegram",
        user_input="Capture a screenshot of the current window",
    )

    assert result.goal.status == "executing"
    assert result.plan.requires_review is False
    assert result.execution.approval_status == "not_required"
    assert result.execution.has_irreversible_action is False


def test_service_plans_low_risk_file_browse_and_open_actions(tmp_path) -> None:
    repo = LocalActionsRepository(tmp_path / "local_actions.db")
    service = LocalActionsService(repo=repo, permission_mode="allow_all")

    list_result = service.plan_goal(
        source_surface="bridge",
        source_channel="telegram",
        user_input="List my Downloads folder",
    )
    open_result = service.plan_goal(
        source_surface="bridge",
        source_channel="telegram",
        user_input="Open my Downloads folder",
    )

    assert list_result.plan.actions[0].action_type == "list_directory"
    assert list_result.plan.actions[0].risk_level == "low"
    assert open_result.plan.actions[0].action_type == "open_directory"
    assert open_result.execution.has_irreversible_action is False


def test_service_records_execution_result_and_closes_goal(tmp_path) -> None:
    repo = LocalActionsRepository(tmp_path / "local_actions.db")
    service = LocalActionsService(repo=repo, permission_mode="allow_all")
    result = service.plan_goal(
        source_surface="bridge",
        source_channel="telegram",
        user_input="Capture a screenshot of the current window",
    )

    updated = service.record_execution_result(
        execution_id=result.execution.execution_id,
        executed_actions=[
            result.plan.actions[0].model_copy(
                update={
                    "status": "succeeded",
                    "result_summary": "Captured active window to /tmp/window.png",
                }
            )
        ],
    )

    assert updated.goal.status == "completed"
    assert updated.execution.finished_at is not None
    assert updated.execution.executed_actions[0].status == "succeeded"
    assert "1 succeeded" in updated.execution.audit_summary


def test_service_rejects_pending_execution(tmp_path) -> None:
    repo = LocalActionsRepository(tmp_path / "local_actions.db")
    service = LocalActionsService(repo=repo, permission_mode="review_required")
    result = service.plan_goal(
        source_surface="bridge",
        source_channel="telegram",
        user_input="Organize my Downloads folder",
    )

    rejected = service.reject_execution(result.execution.execution_id)

    assert rejected.goal.status == "blocked"
    assert rejected.execution.approval_status == "rejected"
    assert rejected.execution.finished_at is not None
