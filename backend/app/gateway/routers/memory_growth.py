from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from nion.config.paths import get_paths
from nion.memory_os.compat import (
    correct_legacy_user_model_item,
    list_legacy_growth_view,
    list_legacy_user_model_items,
    update_legacy_growth_item_status,
)
from nion.memory_os.governance import GOVERNANCE_ACTION_FREEZE, GOVERNANCE_ACTION_REJECT
from nion.memory_os.learning import create_learning_topic
from nion.memory_os.relationship_soul import build_relationship_soul_summary
from nion.memory_os.repository import MemoryOSRepository
from nion.memory_os.soul_governance import (
    accept_soul_proposal,
    list_soul_events,
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
    return list_legacy_growth_view(_repo())


@router.get("/user-model")
async def list_user_model_items():
    return {
        "items": list_legacy_user_model_items(_repo()),
        "source_mode": "memory_os",
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
    staged_identity_narrative = next(
        (
            item
            for item in repo.list_memory_records(domain="agent_self")
            if item["memory_id"] == "agent_self_narrative_staged_main"
        ),
        None,
    )
    return {
        "current_soul": current_soul,
        "core_soul": core_soul,
        "staged_identity_narrative": staged_identity_narrative,
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


@router.get("/soul/events")
async def get_soul_events():
    return {"events": list_soul_events(_repo())}


@router.post("/learning")
async def create_learning(request: LearningCreateRequest):
    item = create_learning_topic(_repo(), title=request.title, summary=request.summary)
    return {"item": item}


@router.post("/{memory_id}/freeze")
async def freeze_growth_item(memory_id: str):
    try:
        update_legacy_growth_item_status(memory_id=memory_id, status="archived", repository=_repo())
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Memory item {memory_id} not found") from exc
    return {"memory_id": memory_id, "action": GOVERNANCE_ACTION_FREEZE}


@router.post("/{memory_id}/reject")
async def reject_growth_item(memory_id: str):
    try:
        update_legacy_growth_item_status(memory_id=memory_id, status="invalidated", repository=_repo())
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Memory item {memory_id} not found") from exc
    return {"memory_id": memory_id, "action": GOVERNANCE_ACTION_REJECT}


@router.post("/{memory_id}/resume")
async def resume_growth_item(memory_id: str):
    try:
        update_legacy_growth_item_status(memory_id=memory_id, status="active", repository=_repo())
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Memory item {memory_id} not found") from exc
    return {"memory_id": memory_id, "action": "resume"}


@router.post("/{memory_id}/accept")
async def accept_growth_item(memory_id: str):
    try:
        update_legacy_growth_item_status(memory_id=memory_id, status="active", repository=_repo())
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Memory item {memory_id} not found") from exc
    return {"memory_id": memory_id, "action": "accept"}


@router.post("/soul/proposals/{memory_id}/accept")
async def accept_soul_item(memory_id: str):
    return accept_soul_proposal(_repo(), memory_id)


@router.post("/soul/proposals/{memory_id}/reject")
async def reject_soul_item(memory_id: str):
    return reject_soul_proposal(_repo(), memory_id)


@router.post("/soul/overlay/rollback")
async def rollback_soul():
    return rollback_soul_overlay(_repo())


@router.post("/user-model/{memory_id}/freeze")
async def freeze_user_model_item(memory_id: str):
    try:
        update_legacy_growth_item_status(
            memory_id=memory_id,
            status="archived",
            expected_domain="user_model",
            repository=_repo(),
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Memory item {memory_id} not found")
    except Exception as exc:  # pragma: no cover - defensive boundary
        raise HTTPException(status_code=500, detail="Failed to freeze memory item") from exc
    return {"memory_id": memory_id, "action": GOVERNANCE_ACTION_FREEZE}


@router.post("/user-model/{memory_id}/forget")
async def forget_user_model_item(memory_id: str):
    try:
        update_legacy_growth_item_status(
            memory_id=memory_id,
            status="invalidated",
            expected_domain="user_model",
            repository=_repo(),
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Memory item {memory_id} not found")
    except Exception as exc:  # pragma: no cover - defensive boundary
        raise HTTPException(status_code=500, detail="Failed to forget memory item") from exc
    return {"memory_id": memory_id, "action": "forget_request"}


@router.post("/user-model/{memory_id}/reject")
async def reject_user_model_item(memory_id: str):
    try:
        update_legacy_growth_item_status(
            memory_id=memory_id,
            status="invalidated",
            expected_domain="user_model",
            repository=_repo(),
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Memory item {memory_id} not found")
    except Exception as exc:  # pragma: no cover - defensive boundary
        raise HTTPException(status_code=500, detail="Failed to reject memory item") from exc
    return {"memory_id": memory_id, "action": GOVERNANCE_ACTION_REJECT}


@router.post("/user-model/{memory_id}/correct")
async def correct_user_model_item(memory_id: str, request: UserModelCorrectRequest):
    try:
        item = correct_legacy_user_model_item(
            memory_id=memory_id,
            summary=request.summary,
            repository=_repo(),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Memory item summary cannot be empty") from exc
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Memory item {memory_id} not found") from exc
    except Exception as exc:  # pragma: no cover - defensive boundary
        raise HTTPException(status_code=500, detail="Failed to correct memory item") from exc
    return {"item": item, "action": "correct"}
