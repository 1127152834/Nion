from __future__ import annotations

from dataclasses import asdict, is_dataclass
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from nion.object_bridges.service import ObjectBridgeService

router = APIRouter(prefix="/api/object-candidates", tags=["object-candidates"])


def get_object_bridge_service() -> ObjectBridgeService:
    return ObjectBridgeService()


class ObjectCandidateListResponse(BaseModel):
    items: list[dict[str, Any]] = Field(default_factory=list)
    next_cursor: str | None = None


class ObjectCandidateDetailResponse(BaseModel):
    candidate: dict[str, Any]
    provenance: list[dict[str, Any]] = Field(default_factory=list)
    action_history: list[dict[str, Any]] = Field(default_factory=list)
    guard_state: dict[str, Any]
    source_summary: dict[str, Any]
    target_summary: dict[str, Any]


class ObjectCandidateActionResponse(BaseModel):
    candidate: dict[str, Any]


class ObjectCandidateApplyResponse(BaseModel):
    candidate: dict[str, Any]
    applied_target: dict[str, Any]
    applied_at: str


class ObjectCandidateDismissRequest(BaseModel):
    reason: str


class ObjectCandidateDeferRequest(BaseModel):
    deferred_until: str
    reason: str


def _dump(value: Any) -> Any:
    if is_dataclass(value):
        return asdict(value)
    return value


@router.get("", response_model=ObjectCandidateListResponse)
async def list_object_candidates(
    status: str | None = None,
    candidate_type: str | None = None,
    service: ObjectBridgeService = Depends(get_object_bridge_service),
) -> ObjectCandidateListResponse:
    items = [_dump(candidate) for candidate in service.list_candidates(status=status, candidate_type=candidate_type)]
    return ObjectCandidateListResponse(items=items, next_cursor=None)


@router.get("/{candidate_id}", response_model=ObjectCandidateDetailResponse)
async def get_object_candidate(
    candidate_id: str,
    service: ObjectBridgeService = Depends(get_object_bridge_service),
) -> ObjectCandidateDetailResponse:
    try:
        detail = service.get_candidate_detail(candidate_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Candidate not found") from exc
    return ObjectCandidateDetailResponse(
        candidate=_dump(detail["candidate"]),
        provenance=[_dump(item) for item in detail["provenance"]],
        action_history=[_dump(item) for item in detail["action_history"]],
        guard_state=detail["guard_state"],
        source_summary=detail["source_summary"],
        target_summary=detail["target_summary"],
    )


@router.post("/{candidate_id}/apply", response_model=ObjectCandidateApplyResponse)
async def apply_object_candidate(
    candidate_id: str,
    service: ObjectBridgeService = Depends(get_object_bridge_service),
) -> ObjectCandidateApplyResponse:
    try:
        result = service.apply_candidate(candidate_id, actor_type="user")
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Candidate not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return ObjectCandidateApplyResponse(
        candidate=_dump(result["candidate"]),
        applied_target=result["applied_target"],
        applied_at=result["applied_at"],
    )


@router.post("/{candidate_id}/dismiss", response_model=ObjectCandidateActionResponse)
async def dismiss_object_candidate(
    candidate_id: str,
    payload: ObjectCandidateDismissRequest,
    service: ObjectBridgeService = Depends(get_object_bridge_service),
) -> ObjectCandidateActionResponse:
    try:
        candidate = service.dismiss_candidate(
            candidate_id,
            actor_type="user",
            reason=payload.reason,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Candidate not found") from exc
    return ObjectCandidateActionResponse(candidate=_dump(candidate))


@router.post("/{candidate_id}/defer", response_model=ObjectCandidateActionResponse)
async def defer_object_candidate(
    candidate_id: str,
    payload: ObjectCandidateDeferRequest,
    service: ObjectBridgeService = Depends(get_object_bridge_service),
) -> ObjectCandidateActionResponse:
    try:
        candidate = service.defer_candidate(
            candidate_id,
            actor_type="user",
            deferred_until=payload.deferred_until,
            reason=payload.reason,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Candidate not found") from exc
    return ObjectCandidateActionResponse(candidate=_dump(candidate))
