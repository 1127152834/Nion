from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from nion.config import get_app_config, get_paths
from nion.local_actions.models import LocalActionItem
from nion.local_actions.repository import LocalActionsRepository
from nion.local_actions.service import LocalActionsPlanningResult, LocalActionsService

router = APIRouter(prefix="/api/local-actions", tags=["local-actions"])


class LocalActionsPlanRequest(BaseModel):
    source_surface: str
    source_channel: str | None = None
    user_input: str


class LocalActionsPlanResponse(BaseModel):
    goal: dict
    plan: dict
    execution: dict
    approval_request: dict | None = None


class LocalActionsHistoryResponse(BaseModel):
    items: list[LocalActionsPlanResponse]


class LocalActionExecutionResultRequest(BaseModel):
    executed_actions: list[dict]


def get_local_actions_service() -> LocalActionsService:
    repo = LocalActionsRepository(get_paths().base_dir / "local_actions.sqlite3")
    permission_mode = get_app_config().daemon.local_actions_permission_mode
    return LocalActionsService(repo=repo, permission_mode=permission_mode)


def _serialize_result(result: LocalActionsPlanningResult) -> LocalActionsPlanResponse:
    irreversible_count = sum(1 for action in result.plan.actions if not action.reversible)
    actions = [action.model_dump(mode="json") for action in result.plan.actions]
    approval_request: dict[str, Any] | None = None
    if result.execution.approval_status == "pending":
        approval_request = {
            "id": f"approval_{result.execution.execution_id}",
            "approval_kind": "local_action_plan",
            "local_action_result": {
                "goal_id": result.goal.goal_id,
                "plan_id": result.plan.plan_id,
                "execution_id": result.execution.execution_id,
                "summary": result.plan.summary,
                "risk_level": result.plan.risk_level,
                "irreversible_action_count": irreversible_count,
                "actions": actions,
            },
            "local_action_payload": {
                "goal_id": result.goal.goal_id,
                "plan_id": result.plan.plan_id,
                "execution_id": result.execution.execution_id,
                "summary": result.plan.summary,
                "risk_level": result.plan.risk_level,
                "irreversible_action_count": irreversible_count,
                "actions": actions,
            },
        }
    return LocalActionsPlanResponse(
        goal=result.goal.model_dump(mode="json"),
        plan=result.plan.model_dump(mode="json"),
        execution=result.execution.model_dump(mode="json"),
        approval_request=approval_request,
    )


@router.post("/plan", response_model=LocalActionsPlanResponse, status_code=201)
def create_local_actions_plan(
    request: LocalActionsPlanRequest,
    service: LocalActionsService = Depends(get_local_actions_service),
) -> LocalActionsPlanResponse:
    result = service.plan_goal(
        source_surface=request.source_surface,
        source_channel=request.source_channel,
        user_input=request.user_input,
    )
    return _serialize_result(result)


@router.get("/history", response_model=LocalActionsHistoryResponse)
def list_local_actions_history(
    limit: int = 20,
    service: LocalActionsService = Depends(get_local_actions_service),
) -> LocalActionsHistoryResponse:
    return LocalActionsHistoryResponse(
        items=[_serialize_result(result) for result in service.list_history(limit=limit)]
    )


@router.post(
    "/executions/{execution_id}/result",
    response_model=LocalActionsPlanResponse,
)
def record_local_action_execution_result(
    execution_id: str,
    request: LocalActionExecutionResultRequest,
    service: LocalActionsService = Depends(get_local_actions_service),
) -> LocalActionsPlanResponse:
    try:
        result = service.record_execution_result(
            execution_id=execution_id,
            executed_actions=[
                LocalActionItem.model_validate(action)
                for action in request.executed_actions
            ],
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return _serialize_result(result)


@router.post(
    "/executions/{execution_id}/approve",
    response_model=LocalActionsPlanResponse,
)
def approve_local_action_execution(
    execution_id: str,
    service: LocalActionsService = Depends(get_local_actions_service),
) -> LocalActionsPlanResponse:
    try:
        result = service.approve_execution(execution_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return _serialize_result(result)


@router.post(
    "/executions/{execution_id}/reject",
    response_model=LocalActionsPlanResponse,
)
def reject_local_action_execution(
    execution_id: str,
    service: LocalActionsService = Depends(get_local_actions_service),
) -> LocalActionsPlanResponse:
    try:
        result = service.reject_execution(execution_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return _serialize_result(result)
