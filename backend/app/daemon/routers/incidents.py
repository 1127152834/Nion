from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field, model_validator

from app.daemon.service import LocalDaemonService
from nion.incidents.playbooks import diagnose_incident as run_incident_playbook
from nion.telemetry.models import IncidentRecord

router = APIRouter(prefix="/api/daemon/incidents", tags=["daemon"])


class IncidentResponse(BaseModel):
    incident_id: str
    created_at: str | None = None
    updated_at: str | None = None
    source: str
    incident_type: str
    severity: str
    status: str
    summary: str
    user_visible_explanation: str
    root_cause_hypothesis: str | None = None
    confidence: float | None = None
    thread_id: str | None = None
    run_id: str | None = None
    recommended_actions: list[dict] = Field(default_factory=list)
    executed_actions: list[dict] = Field(default_factory=list)
    evidence: dict = Field(default_factory=dict)
    resolution_note: str | None = None


class IncidentListResponse(BaseModel):
    incidents: list[IncidentResponse] = Field(default_factory=list)


class DiagnoseIncidentRequest(BaseModel):
    source: Literal["chat", "desktop_button", "automatic"]
    incident_type_hint: Literal["agent_execution", "daemon_runtime", "auto"] = "auto"
    include_recommended_actions: bool = True
    thread_id: str | None = None
    run_id: str | None = None

    @model_validator(mode="after")
    def validate_scope(self) -> DiagnoseIncidentRequest:
        if not self.thread_id and not self.run_id:
            raise ValueError("thread_id or run_id is required")
        return self


def get_daemon_service(request: Request) -> LocalDaemonService:
    return request.app.state.daemon_service


def _get_store(service: LocalDaemonService):
    store = service.telemetry_store
    if store is None:
        raise HTTPException(status_code=503, detail="telemetry store unavailable")
    return store


def _to_response(record: IncidentRecord) -> IncidentResponse:
    return IncidentResponse(
        incident_id=record.incident_id,
        created_at=record.created_at,
        updated_at=record.updated_at,
        source=record.source,
        incident_type=record.incident_type,
        severity=record.severity,
        status=record.status,
        summary=record.summary,
        user_visible_explanation=record.user_visible_explanation,
        root_cause_hypothesis=record.root_cause_hypothesis,
        confidence=record.confidence,
        thread_id=record.thread_id,
        run_id=record.run_id,
        recommended_actions=record.recommended_actions,
        executed_actions=record.executed_actions,
        evidence=record.evidence,
        resolution_note=record.resolution_note,
    )


@router.get("", response_model=IncidentListResponse)
async def list_incidents(
    request: Request,
    incident_type: str | None = None,
    status: str | None = None,
    thread_id: str | None = None,
    run_id: str | None = None,
    limit: int = Query(default=50, ge=1, le=500),
) -> IncidentListResponse:
    service = get_daemon_service(request)
    store = _get_store(service)
    incidents = store.list_incidents(
        limit=limit,
        incident_type=incident_type,
        status=status,
        thread_id=thread_id,
        run_id=run_id,
    )
    return IncidentListResponse(incidents=[_to_response(record) for record in incidents])


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(incident_id: str, request: Request) -> IncidentResponse:
    service = get_daemon_service(request)
    store = _get_store(service)
    try:
        record = store.get_incident(incident_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return _to_response(record)


@router.post("/{incident_id}/dismiss", response_model=IncidentResponse)
async def dismiss_incident(incident_id: str, request: Request) -> IncidentResponse:
    service = get_daemon_service(request)
    store = _get_store(service)
    try:
        store.dismiss_incident(incident_id)
        record = store.get_incident(incident_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return _to_response(record)


@router.post("/diagnose", response_model=IncidentResponse)
async def diagnose_incident(payload: DiagnoseIncidentRequest, request: Request) -> IncidentResponse:
    service = get_daemon_service(request)
    store = _get_store(service)
    record = run_incident_playbook(
        store=store,
        source=payload.source,
        thread_id=payload.thread_id,
        run_id=payload.run_id,
        incident_type_hint=payload.incident_type_hint,
        include_recommended_actions=payload.include_recommended_actions,
    )
    store.record_incident(record)
    persisted = store.get_incident(record.incident_id)
    return _to_response(persisted)
