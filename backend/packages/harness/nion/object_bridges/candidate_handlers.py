from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime
from typing import Any, Protocol

from .models import BridgeCandidateRecord


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


class CandidateApplyHandler(Protocol):
    candidate_type: str
    target_object_type: str

    def apply(self, candidate: BridgeCandidateRecord) -> dict[str, Any]: ...


class _BaseCandidateApplyHandler:
    candidate_type = ""
    target_object_type = ""

    def apply(self, candidate: BridgeCandidateRecord) -> dict[str, Any]:
        candidate_payload = _candidate_payload(candidate)
        self._validate_execution(candidate_payload)
        target_object_id = candidate_payload.get("id") or candidate.id
        return {
            "target_object_type": self.target_object_type,
            "target_object_id": str(target_object_id),
            "title": candidate.title,
        }

    def _validate_execution(self, candidate_payload: dict[str, Any]) -> None:
        return None


class ProjectDraftApplyHandler(_BaseCandidateApplyHandler):
    candidate_type = "project_draft"
    target_object_type = "project"

    def _validate_execution(self, candidate_payload: dict[str, Any]) -> None:
        if not str(candidate_payload.get("name", "")).strip():
            raise RuntimeError("project draft name is required")


class NotebookDraftApplyHandler(_BaseCandidateApplyHandler):
    candidate_type = "notebook_draft"
    target_object_type = "notebook"

    def _validate_execution(self, candidate_payload: dict[str, Any]) -> None:
        if not str(candidate_payload.get("title", "")).strip():
            raise RuntimeError("notebook draft title is required")


class MemoryEntryApplyHandler(_BaseCandidateApplyHandler):
    candidate_type = "memory_entry"
    target_object_type = "memory"

    def _validate_execution(self, candidate_payload: dict[str, Any]) -> None:
        if not str(candidate_payload.get("content", "")).strip():
            raise RuntimeError("memory entry content is required")


class ProjectConstraintApplyHandler(_BaseCandidateApplyHandler):
    candidate_type = "project_constraint"
    target_object_type = "project"

    def _validate_execution(self, candidate_payload: dict[str, Any]) -> None:
        if not str(candidate_payload.get("content", "")).strip():
            raise RuntimeError("project constraint content is required")


APPLY_HANDLER_REGISTRY: dict[str, CandidateApplyHandler] = {
    "project_draft": ProjectDraftApplyHandler(),
    "notebook_draft": NotebookDraftApplyHandler(),
    "memory_entry": MemoryEntryApplyHandler(),
    "project_constraint": ProjectConstraintApplyHandler(),
}


def get_apply_handler(candidate_type: str) -> CandidateApplyHandler | None:
    return APPLY_HANDLER_REGISTRY.get(candidate_type)


def candidate_actions(candidate: BridgeCandidateRecord) -> list[str]:
    if candidate.status != "ready":
        return []
    actions = ["dismiss", "defer"]
    if get_apply_handler(candidate.candidate_type) is not None:
        actions.insert(0, "apply")
    return actions


def with_candidate_actions(candidate: BridgeCandidateRecord) -> BridgeCandidateRecord:
    return replace(candidate, available_actions=candidate_actions(candidate))


def compute_guard_state(candidate: BridgeCandidateRecord) -> dict[str, Any]:
    candidate_payload = _candidate_payload(candidate)
    reasons: list[str] = []

    if candidate.candidate_type == "project_draft":
        if not str(candidate_payload.get("name", "")).strip():
            reasons.append("missing_project_name")
    elif candidate.candidate_type == "notebook_draft":
        if candidate_payload.get("source_project_id") is None:
            reasons.append("missing_source_project_id")
    elif candidate.candidate_type == "memory_entry":
        if not str(candidate_payload.get("category", "")).strip():
            reasons.append("missing_memory_category")
    elif candidate.candidate_type == "project_constraint":
        if not str(candidate_payload.get("project_id", "")).strip():
            reasons.append("missing_project_id")

    return {
        "is_applicable": not reasons,
        "reasons": reasons,
        "checked_at": _now_iso(),
    }


def source_summary(candidate: BridgeCandidateRecord) -> dict[str, Any]:
    provenance = candidate.provenance[0] if candidate.provenance else None
    source = provenance.source_objects[0] if provenance and provenance.source_objects else None
    return {
        "source_object_type": source.source_object_type if source is not None else None,
        "source_object_id": source.source_object_id if source is not None else None,
        "action_name": provenance.action_name if provenance is not None else None,
    }


def target_summary(candidate: BridgeCandidateRecord) -> dict[str, Any]:
    candidate_payload = _candidate_payload(candidate)
    target_object_type = get_target_object_type(candidate.candidate_type)
    target_object_id = candidate_payload.get("project_id") or candidate_payload.get(
        "source_project_id"
    )
    target_title = candidate_payload.get("title") or candidate_payload.get("name")
    return {
        "target_object_type": target_object_type,
        "target_object_id": target_object_id,
        "title": target_title,
    }


def get_target_object_type(candidate_type: str) -> str | None:
    handler = get_apply_handler(candidate_type)
    if handler is not None:
        return handler.target_object_type
    if candidate_type == "skill_candidate":
        return "skill"
    return None


def _candidate_payload(candidate: BridgeCandidateRecord) -> dict[str, Any]:
    raw_candidate = candidate.payload.get("candidate")
    if isinstance(raw_candidate, dict):
        return raw_candidate
    return {}
