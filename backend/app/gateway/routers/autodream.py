from __future__ import annotations

from fastapi import APIRouter, Request
from pydantic import BaseModel

from nion.openviking.autodream_service import AutoDreamService

router = APIRouter(prefix="/api/autodream", tags=["autodream"])


class AutoDreamRunRequest(BaseModel):
    query: str


class AutoDreamRunResponse(BaseModel):
    entry: dict
    entry_path: str
    agent_memory_updates: list[str]
    user_memory_candidates: list[str]
    action_proposals: list[str]


class AutoDreamStatusResponse(BaseModel):
    running: bool
    last_run_at: str | None = None
    last_run_status: str | None = None
    last_run_summary: str | None = None
    session_count_since_last_run: int
    next_eligibility_hint: str


@router.post("/run", response_model=AutoDreamRunResponse)
async def run_autodream(payload: AutoDreamRunRequest) -> AutoDreamRunResponse:
    result = AutoDreamService().run(query=payload.query, manual=True)
    return AutoDreamRunResponse(
        entry=result.entry.model_dump(),
        entry_path=str(result.entry_path),
        agent_memory_updates=result.agent_memory_updates,
        user_memory_candidates=result.user_memory_candidates,
        action_proposals=result.action_proposals,
    )


@router.get("/status", response_model=AutoDreamStatusResponse)
async def get_autodream_status(request: Request) -> AutoDreamStatusResponse:
    daemon_service = getattr(request.app.state, "daemon_service", None)
    if daemon_service is None:
        return AutoDreamStatusResponse(
            running=False,
            last_run_at=None,
            last_run_status=None,
            last_run_summary=None,
            session_count_since_last_run=0,
            next_eligibility_hint="AutoDream compatibility status is not attached to this runtime surface.",
        )
    return AutoDreamStatusResponse.model_validate(daemon_service.autodream_status())
