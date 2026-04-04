from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from nion.config.paths import get_paths
from nion.memory_os.governance import GOVERNANCE_ACTION_FREEZE, GOVERNANCE_ACTION_REJECT
from nion.memory_os.learning import create_learning_topic
from nion.memory_os.repository import MemoryOSRepository

router = APIRouter(prefix="/api/memory/growth", tags=["memory-growth"])


class LearningCreateRequest(BaseModel):
    title: str
    summary: str


def _repo() -> MemoryOSRepository:
    return MemoryOSRepository(get_paths().memory_os_index_db_file)


@router.get("")
async def get_memory_growth():
    repo = _repo()
    return {
        "learning": repo.list_memory_records(domain="learning"),
        "procedures": repo.list_memory_records(domain="procedure"),
        "soul_proposals": repo.list_memory_records(domain="soul"),
    }


@router.get("/user-model")
async def list_user_model_items():
    repo = _repo()
    return {
        "items": repo.list_memory_records(domain="user_model"),
    }


@router.post("/learning")
async def create_learning(request: LearningCreateRequest):
    item = create_learning_topic(_repo(), title=request.title, summary=request.summary)
    return {"item": item}


@router.post("/{memory_id}/freeze")
async def freeze_growth_item(memory_id: str):
    repo = _repo()
    repo.update_memory_status(memory_id, "archived")
    return {"memory_id": memory_id, "action": GOVERNANCE_ACTION_FREEZE}


@router.post("/{memory_id}/reject")
async def reject_growth_item(memory_id: str):
    repo = _repo()
    repo.update_memory_status(memory_id, "invalidated")
    return {"memory_id": memory_id, "action": GOVERNANCE_ACTION_REJECT}


@router.post("/user-model/{memory_id}/freeze")
async def freeze_user_model_item(memory_id: str):
    repo = _repo()
    record = next(
        (item for item in repo.list_memory_records(domain="user_model") if item["memory_id"] == memory_id),
        None,
    )
    if record is None:
        raise HTTPException(status_code=404, detail=f"Memory item {memory_id} not found")
    repo.update_memory_status(memory_id, "archived")
    return {"memory_id": memory_id, "action": GOVERNANCE_ACTION_FREEZE}


@router.post("/user-model/{memory_id}/forget")
async def forget_user_model_item(memory_id: str):
    repo = _repo()
    record = next(
        (item for item in repo.list_memory_records(domain="user_model") if item["memory_id"] == memory_id),
        None,
    )
    if record is None:
        raise HTTPException(status_code=404, detail=f"Memory item {memory_id} not found")
    repo.update_memory_status(memory_id, "invalidated")
    return {"memory_id": memory_id, "action": "forget_request"}
