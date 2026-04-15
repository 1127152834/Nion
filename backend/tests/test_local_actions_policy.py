from nion.local_actions.policy import decide_local_action_execution


def test_policy_blocks_execution_when_mode_is_disabled() -> None:
    decision = decide_local_action_execution(
        permission_mode="disabled",
        has_irreversible_action=False,
    )

    assert decision.status == "blocked"
    assert decision.requires_review is False
    assert decision.approval_status == "not_required"


def test_policy_requires_review_when_mode_is_review_required() -> None:
    decision = decide_local_action_execution(
        permission_mode="review_required",
        has_irreversible_action=True,
    )

    assert decision.status == "awaiting_review"
    assert decision.requires_review is True
    assert decision.approval_status == "pending"


def test_policy_allows_direct_execution_when_mode_is_allow_all() -> None:
    decision = decide_local_action_execution(
        permission_mode="allow_all",
        has_irreversible_action=True,
    )

    assert decision.status == "ready_to_execute"
    assert decision.requires_review is False
    assert decision.approval_status == "not_required"
