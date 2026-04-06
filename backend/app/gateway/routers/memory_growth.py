from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from nion.config.paths import get_paths
from nion.memory_os.governance import GOVERNANCE_ACTION_FREEZE, GOVERNANCE_ACTION_REJECT
from nion.memory_os.learning import create_learning_topic
from nion.memory_os.relationship_soul import build_relationship_soul_summary
from nion.memory_os.repository import MemoryOSRepository
from nion.memory_os.soul_governance import (
    accept_soul_proposal,
    reject_soul_proposal,
    rollback_soul_overlay,
)

router = APIRouter(prefix="/api/memory/growth", tags=["memory-growth"])


class LearningCreateRequest(BaseModel):
    title: str
    summary: str


class UserModelCorrectRequest(BaseModel):
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


@router.get("/soul")
async def get_soul_summary():
    repo = _repo()
    current_soul = next(
        (
            item
            for item in repo.list_memory_records(domain="soul")
            if item["memory_id"] == "soul_overlay_active_main"
        ),
        None,
    )
    core_soul = next(
        (
            item
            for item in repo.list_memory_records(domain="soul")
            if item["memory_id"] == "soul_core_main"
        ),
        None,
    )
    return {
        "current_soul": current_soul,
        "core_soul": core_soul,
        "summary": {
            "baseline": core_soul["summary"] if core_soul else None,
            "relationship": build_relationship_soul_summary(repo),
            "current": current_soul["summary"] if current_soul else None,
        },
    }


@router.get("/soul/proposals")
async def list_soul_proposals():
    repo = _repo()
    return {
        "proposals": [
            item
            for item in repo.list_memory_records(domain="soul")
            if item["subtype"] == "proposal"
        ],
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


@router.post("/{memory_id}/resume")
async def resume_growth_item(memory_id: str):
    repo = _repo()
    repo.update_memory_status(memory_id, "active")
    return {"memory_id": memory_id, "action": "resume"}


@router.post("/{memory_id}/accept")
async def accept_growth_item(memory_id: str):
    repo = _repo()
    repo.update_memory_status(memory_id, "active")
    return {"memory_id": memory_id, "action": "accept"}


@router.post("/soul/proposals/{memory_id}/accept")
async def accept_soul_item(memory_id: str):
    return accept_soul_proposal(_repo(), memory_id, created_at="2026-04-06T00:00:00Z")


@router.post("/soul/proposals/{memory_id}/reject")
async def reject_soul_item(memory_id: str):
    return reject_soul_proposal(_repo(), memory_id)


@router.post("/soul/overlay/rollback")
async def rollback_soul():
    return rollback_soul_overlay(_repo())


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


@router.post("/user-model/{memory_id}/reject")
async def reject_user_model_item(memory_id: str):
    repo = _repo()
    record = next(
        (item for item in repo.list_memory_records(domain="user_model") if item["memory_id"] == memory_id),
        None,
    )
    if record is None:
        raise HTTPException(status_code=404, detail=f"Memory item {memory_id} not found")
    repo.update_memory_status(memory_id, "invalidated")
    return {"memory_id": memory_id, "action": GOVERNANCE_ACTION_REJECT}


@router.post("/user-model/{memory_id}/correct")
async def correct_user_model_item(memory_id: str, request: UserModelCorrectRequest):
    repo = _repo()
    record = next(
        (item for item in repo.list_memory_records(domain="user_model") if item["memory_id"] == memory_id),
        None,
    )
    if record is None:
        raise HTTPException(status_code=404, detail=f"Memory item {memory_id} not found")
    corrected = dict(record)
    corrected["summary"] = request.summary.strip() or corrected["summary"]
    corrected["updated_at"] = "2026-04-05T00:00:00Z"
    repo.save_memory_record(corrected)
    return {"item": corrected, "action": "correct"}
