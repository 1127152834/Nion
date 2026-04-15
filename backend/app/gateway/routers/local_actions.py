from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from nion.config import get_app_config, get_paths
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


def get_local_actions_service() -> LocalActionsService:
    repo = LocalActionsRepository(get_paths().base_dir / "local_actions.sqlite3")
    permission_mode = get_app_config().daemon.local_actions_permission_mode
    return LocalActionsService(repo=repo, permission_mode=permission_mode)


def _serialize_result(result: LocalActionsPlanningResult) -> LocalActionsPlanResponse:
    return LocalActionsPlanResponse(
        goal=result.goal.model_dump(mode="json"),
        plan=result.plan.model_dump(mode="json"),
        execution=result.execution.model_dump(mode="json"),
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
