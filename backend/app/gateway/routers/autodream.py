from __future__ import annotations

from fastapi import APIRouter
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
