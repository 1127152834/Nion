from __future__ import annotations

from dataclasses import asdict
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from nion.object_bridges.service import ObjectBridgeService
from nion.projects import ProjectService, create_default_project_service

router = APIRouter(prefix="/api/projects", tags=["projects"])


def get_project_service() -> ProjectService:
    return create_default_project_service()


class ProjectCreateRequest(BaseModel):
    name: str
    description: str = ""
    goal: str = ""


class ProjectUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    goal: str | None = None


class PlanCreateRequest(BaseModel):
    phase: str = "计划"
    title: str
    description: str = ""
    plan_type: str = "normal"
    execution_mode: str = "manual"
    depends_on_plan_ids: list[str] = Field(default_factory=list)
    is_gate_plan: bool = False
    is_primary: bool = False
    rework_of_plan_id: str | None = None
    derived_from_outcome_id: str | None = None


class PlanUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    execution_mode: str | None = None
    is_gate_plan: bool | None = None
    depends_on_plan_ids: list[str] | None = None
    branch_routes: dict[str, str] | None = None
    sort_order: int | None = None


class PlanPauseRequest(BaseModel):
    reason: str = "manual"


class PlanOutcomeConfirmRequest(BaseModel):
    outcome_status: str
    outcome_summary: str = ""
    selected_next_plan_id: str | None = None


class ReworkPlanCreateRequest(BaseModel):
    title: str
    description: str = ""
    execution_mode: str = "manual"


class ProjectThreadCreateRequest(BaseModel):
    thread_id: str | None = None
    title: str | None = None
    role: str = "temporary"
    linked_plan_ids: list[str] = Field(default_factory=list)
    inherit_project_context: bool = True


class ProjectThreadLinkPlanRequest(BaseModel):
    plan_id: str
    as_primary_for_plan: bool = False


class ProjectThreadImportRequest(BaseModel):
    source_thread_id: str


class ArtifactRestoreRequest(BaseModel):
    version_id: str
    restore_reason: str = ""


class ArtifactLinkPlanRequest(BaseModel):
    plan_id: str
    as_primary: bool = False


class MemoryExtractRequest(BaseModel):
    source_type: str
    source_id: str
    category: str


class DecisionResolveRequest(BaseModel):
    action_id: str
    payload: dict[str, Any] = Field(default_factory=dict)


class ProjectBridgeNotebookDraftRequest(BaseModel):
    kind: Literal["summary", "retro", "decision_log"]
    scope: Literal["current_phase", "whole_project"]
    target_directory: str


class ProjectBridgeMemoryCandidateRequest(BaseModel):
    kind: Literal["long_term_memory", "promote_constraint"]
    scope: Literal["current_phase", "whole_project"] | None = None
    project_memory_entry_id: str | None = None


class ProjectBridgeSkillCandidateRequest(BaseModel):
    scope: Literal["current_phase", "whole_project"]


class ProjectNotebookReferenceRequest(BaseModel):
    note_id: str
    fragment_id: str | None = None
    relation: str


class BridgeCandidateEnvelope(BaseModel):
    candidate: dict[str, Any]


class ProjectReferenceEnvelope(BaseModel):
    link: dict[str, Any]


def get_object_bridge_service() -> ObjectBridgeService:
    return ObjectBridgeService()


@router.get("")
async def list_projects(service: ProjectService = Depends(get_project_service)) -> dict[str, Any]:
    return service.list_projects()


@router.post("")
async def create_project(
    payload: ProjectCreateRequest,
    service: ProjectService = Depends(get_project_service),
) -> dict[str, Any]:
    return service.create_project(
        name=payload.name,
        description=payload.description,
        goal=payload.goal,
    )


@router.get("/{project_id}")
async def get_project_dashboard(
    project_id: str,
    service: ProjectService = Depends(get_project_service),
) -> dict[str, Any]:
    try:
        return service.get_dashboard(project_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Project not found") from exc


@router.patch("/{project_id}")
async def update_project(
    project_id: str,
    payload: ProjectUpdateRequest,
    service: ProjectService = Depends(get_project_service),
) -> dict[str, Any]:
    try:
        return service.update_project(
            project_id,
            name=payload.name,
            description=payload.description,
            goal=payload.goal,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Project not found") from exc


@router.post("/{project_id}/complete")
async def request_project_completion(
    project_id: str,
    service: ProjectService = Depends(get_project_service),
) -> dict[str, Any]:
    try:
        return service.request_project_completion(project_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Project not found") from exc


@router.post("/{project_id}/bridge/notebook-drafts", response_model=BridgeCandidateEnvelope)
async def create_project_notebook_draft(
    project_id: str,
    payload: ProjectBridgeNotebookDraftRequest,
    service: ObjectBridgeService = Depends(get_object_bridge_service),
) -> BridgeCandidateEnvelope:
    candidate = service.export_project_summary_to_notebook(
        project_id=project_id,
        scope=payload.scope,
        target_directory=payload.target_directory,
    )
    return BridgeCandidateEnvelope(candidate=asdict(candidate))


@router.post("/{project_id}/bridge/memory-candidates", response_model=BridgeCandidateEnvelope)
async def create_project_memory_candidate(
    project_id: str,
    payload: ProjectBridgeMemoryCandidateRequest,
    service: ObjectBridgeService = Depends(get_object_bridge_service),
) -> BridgeCandidateEnvelope:
    candidate = service.extract_long_term_memory_from_project(
        project_id=project_id,
        scope=payload.scope or "whole_project",
    )
    return BridgeCandidateEnvelope(candidate=asdict(candidate))


@router.post("/{project_id}/bridge/skill-candidates", response_model=BridgeCandidateEnvelope)
async def create_project_skill_candidate(
    project_id: str,
    payload: ProjectBridgeSkillCandidateRequest,
    service: ObjectBridgeService = Depends(get_object_bridge_service),
) -> BridgeCandidateEnvelope:
    candidate = service.extract_skill_candidate_from_project(
        project_id=project_id,
        scope=payload.scope,
    )
    return BridgeCandidateEnvelope(candidate=asdict(candidate))


@router.post("/{project_id}/references/notebook-notes", response_model=ProjectReferenceEnvelope)
async def attach_notebook_note_to_project(
    project_id: str,
    payload: ProjectNotebookReferenceRequest,
    service: ObjectBridgeService = Depends(get_object_bridge_service),
) -> ProjectReferenceEnvelope:
    link = service.attach_notebook_note_to_project(
        project_id=project_id,
        note_id=payload.note_id,
        fragment_id=payload.fragment_id,
        relation=payload.relation,
    )
    return ProjectReferenceEnvelope(link=asdict(link))


@router.get("/{project_id}/plans")
async def list_project_plans(project_id: str, service: ProjectService = Depends(get_project_service)) -> dict[str, Any]:
    return service.list_plans(project_id)


@router.post("/{project_id}/plans")
async def create_project_plan(
    project_id: str,
    payload: PlanCreateRequest,
    service: ProjectService = Depends(get_project_service),
) -> dict[str, Any]:
    try:
        return service.create_plan(project_id, payload.model_dump())
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Project not found") from exc


@router.get("/{project_id}/plans/{plan_id}")
async def get_project_plan(
    project_id: str,
    plan_id: str,
    service: ProjectService = Depends(get_project_service),
) -> dict[str, Any]:
    try:
        return service.get_plan(project_id, plan_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Plan not found") from exc


@router.patch("/{project_id}/plans/{plan_id}")
async def update_project_plan(
    project_id: str,
    plan_id: str,
    payload: PlanUpdateRequest,
    service: ProjectService = Depends(get_project_service),
) -> dict[str, Any]:
    try:
        return service.update_plan(project_id, plan_id, payload.model_dump(exclude_none=True))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Plan not found") from exc


@router.post("/{project_id}/plans/{plan_id}/set-primary")
async def set_primary_plan(
    project_id: str,
    plan_id: str,
    service: ProjectService = Depends(get_project_service),
) -> dict[str, Any]:
    try:
        return service.set_primary_plan(project_id, plan_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Plan not found") from exc


@router.post("/{project_id}/plans/{plan_id}/start")
async def start_plan(
    project_id: str,
    plan_id: str,
    service: ProjectService = Depends(get_project_service),
) -> dict[str, Any]:
    try:
        return service.start_plan(project_id, plan_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Plan not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/{project_id}/plans/{plan_id}/pause")
async def pause_plan(
    project_id: str,
    plan_id: str,
    payload: PlanPauseRequest,
    service: ProjectService = Depends(get_project_service),
) -> dict[str, Any]:
    try:
        return service.pause_plan(project_id, plan_id, reason=payload.reason)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Plan not found") from exc


@router.post("/{project_id}/plans/{plan_id}/resume")
async def resume_plan(
    project_id: str,
    plan_id: str,
    service: ProjectService = Depends(get_project_service),
) -> dict[str, Any]:
    try:
        return service.resume_plan(project_id, plan_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Plan not found") from exc


@router.post("/{project_id}/plans/{plan_id}/confirm-outcome")
async def confirm_plan_outcome(
    project_id: str,
    plan_id: str,
    payload: PlanOutcomeConfirmRequest,
    service: ProjectService = Depends(get_project_service),
) -> dict[str, Any]:
    try:
        return service.confirm_plan_outcome(
            project_id,
            plan_id,
            outcome_status=payload.outcome_status,
            outcome_summary=payload.outcome_summary,
            selected_next_plan_id=payload.selected_next_plan_id,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Plan not found") from exc


@router.post("/{project_id}/plans/{plan_id}/create-rework")
async def create_rework_plan(
    project_id: str,
    plan_id: str,
    payload: ReworkPlanCreateRequest,
    service: ProjectService = Depends(get_project_service),
) -> dict[str, Any]:
    try:
        return service.create_rework_plan(project_id, plan_id, payload.model_dump())
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Plan not found") from exc


@router.get("/{project_id}/threads")
async def list_project_threads(project_id: str, service: ProjectService = Depends(get_project_service)) -> dict[str, Any]:
    return service.list_threads(project_id)


@router.post("/{project_id}/threads")
async def create_project_thread(
    project_id: str,
    payload: ProjectThreadCreateRequest,
    service: ProjectService = Depends(get_project_service),
) -> dict[str, Any]:
    try:
        return service.create_thread(project_id, payload.model_dump())
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Project not found") from exc


@router.post("/{project_id}/threads/{thread_id}/set-primary")
async def set_primary_thread(
    project_id: str,
    thread_id: str,
    service: ProjectService = Depends(get_project_service),
) -> dict[str, Any]:
    try:
        return service.set_primary_thread(project_id, thread_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Thread not found") from exc


@router.post("/{project_id}/threads/{thread_id}/link-plan")
async def link_plan_to_thread(
    project_id: str,
    thread_id: str,
    payload: ProjectThreadLinkPlanRequest,
    service: ProjectService = Depends(get_project_service),
) -> dict[str, Any]:
    try:
        return service.link_plan_to_thread(
            project_id,
            thread_id,
            plan_id=payload.plan_id,
            as_primary_for_plan=payload.as_primary_for_plan,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Resource not found") from exc


@router.get("/{project_id}/threads/{thread_id}/mention-candidates")
async def list_thread_mention_candidates(
    project_id: str,
    thread_id: str,
    service: ProjectService = Depends(get_project_service),
) -> dict[str, Any]:
    return service.list_thread_mention_candidates(project_id, thread_id)


@router.post("/{project_id}/threads/{thread_id}/imports")
async def import_thread_snapshot(
    project_id: str,
    thread_id: str,
    payload: ProjectThreadImportRequest,
    service: ProjectService = Depends(get_project_service),
) -> dict[str, Any]:
    try:
        return service.import_thread_snapshot(
            project_id,
            thread_id,
            source_thread_id=payload.source_thread_id,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Thread not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{project_id}/timeline")
async def list_project_timeline(project_id: str, service: ProjectService = Depends(get_project_service)) -> dict[str, Any]:
    return service.list_timeline(project_id)


@router.get("/{project_id}/timeline/{event_id}")
async def get_project_timeline_event(
    project_id: str,
    event_id: str,
    service: ProjectService = Depends(get_project_service),
) -> dict[str, Any]:
    try:
        return service.get_timeline_event(project_id, event_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Event not found") from exc


@router.get("/{project_id}/artifacts")
async def list_project_artifacts(project_id: str, service: ProjectService = Depends(get_project_service)) -> dict[str, Any]:
    return service.list_artifacts(project_id)


@router.get("/{project_id}/artifacts/{artifact_id}")
async def get_project_artifact(
    project_id: str,
    artifact_id: str,
    service: ProjectService = Depends(get_project_service),
) -> dict[str, Any]:
    try:
        return service.get_artifact(project_id, artifact_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Artifact not found") from exc


@router.post("/{project_id}/artifacts/{artifact_id}/restore")
async def restore_project_artifact(
    project_id: str,
    artifact_id: str,
    payload: ArtifactRestoreRequest,
    service: ProjectService = Depends(get_project_service),
) -> dict[str, Any]:
    try:
        return service.restore_artifact(
            project_id,
            artifact_id,
            version_id=payload.version_id,
            restore_reason=payload.restore_reason,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Artifact or version not found") from exc


@router.post("/{project_id}/artifacts/{artifact_id}/link-plan")
async def link_project_artifact_to_plan(
    project_id: str,
    artifact_id: str,
    payload: ArtifactLinkPlanRequest,
    service: ProjectService = Depends(get_project_service),
) -> dict[str, Any]:
    try:
        return service.link_artifact_to_plan(
            project_id,
            artifact_id,
            plan_id=payload.plan_id,
            as_primary=payload.as_primary,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Artifact not found") from exc


@router.get("/{project_id}/memory")
async def get_project_memory(project_id: str, service: ProjectService = Depends(get_project_service)) -> dict[str, Any]:
    return service.get_memory(project_id)


@router.post("/{project_id}/memory/extract")
async def extract_project_memory(
    project_id: str,
    payload: MemoryExtractRequest,
    service: ProjectService = Depends(get_project_service),
) -> dict[str, Any]:
    try:
        return service.extract_memory(
            project_id,
            source_type=payload.source_type,
            source_id=payload.source_id,
            category=payload.category,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Source not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{project_id}/decisions")
async def list_project_decisions(project_id: str, service: ProjectService = Depends(get_project_service)) -> dict[str, Any]:
    return service.list_decisions(project_id)


@router.post("/{project_id}/decisions/{decision_id}/resolve")
async def resolve_project_decision(
    project_id: str,
    decision_id: str,
    payload: DecisionResolveRequest,
    service: ProjectService = Depends(get_project_service),
) -> dict[str, Any]:
    try:
        return service.resolve_decision(
            project_id,
            decision_id,
            action_id=payload.action_id,
            payload=payload.payload,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Decision not found") from exc
