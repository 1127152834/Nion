from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from nion.capability_bridge_actions import build_capability_bridge_actions, execute_capability_bridge_action

router = APIRouter(prefix="/api/capabilities", tags=["capabilities"])


class CapabilityActionExecuteRequest(BaseModel):
    action_id: str
    payload: dict


@router.get("/actions")
async def list_capability_actions() -> dict:
    return {"actions": build_capability_bridge_actions()}


@router.post("/actions/execute")
async def execute_capability_action(request: CapabilityActionExecuteRequest) -> dict:
    return execute_capability_bridge_action(request.action_id, request.payload)
