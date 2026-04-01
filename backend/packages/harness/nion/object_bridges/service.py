from __future__ import annotations

from dataclasses import asdict, replace
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from .candidate_handlers import (
    compute_guard_state,
    get_apply_handler,
    source_summary,
    target_summary,
    with_candidate_actions,
)
from .repository import ObjectBridgeRepository
from .models import (
    BridgeActionProvenance,
    BridgeCandidateRecord,
    MemoryEntryCandidate,
    NotebookDraftCandidate,
    NotebookReferenceLink,
    ObjectProvenance,
    ProjectConstraintCandidate,
    ProjectDraftCandidate,
    ProjectReferenceLink,
    SkillCandidateDraft,
)


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _candidate_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex}"


class ObjectBridgeService:
    def __init__(self, *, base_dir: str | Path | None = None) -> None:
        self._base_dir = Path(base_dir) if base_dir is not None else None
        self._repository = ObjectBridgeRepository(base_dir=self._base_dir)

    @property
    def repository(self) -> ObjectBridgeRepository:
        return self._repository

    def _provenance(
        self,
        *,
        action_name: str,
        source_object_type: str,
        source_object_id: str,
    ) -> list[BridgeActionProvenance]:
        return [
            BridgeActionProvenance(
                action_name=action_name,
                source_objects=[
                    ObjectProvenance(
                        source_object_type=source_object_type,  # type: ignore[arg-type]
                        source_object_id=source_object_id,
                        source_action=action_name,
                        created_at=_now_iso(),
                        created_by="agent",
                    )
                ],
                initiated_by="agent",
                approval_mode="required",
                created_at=_now_iso(),
            )
        ]

    def create_project_from_notebook(
        self,
        *,
        note_ids: list[str],
        fragment_ids: list[str],
    ) -> BridgeCandidateRecord:
        source_note_id = note_ids[0]
        provenance = self._provenance(
            action_name="create_project_from_notebook",
            source_object_type="notebook",
            source_object_id=source_note_id,
        )
        candidate = ProjectDraftCandidate(
            id=_candidate_id("cand_proj"),
            name="Project Draft",
            goal="Generated from notebook",
            description="Generated from notebook note",
            initial_constraints=[],
            provenance=provenance,
        )
        record = BridgeCandidateRecord(
            id=candidate.id,
            candidate_type="project_draft",
            status="draft",
            title=candidate.name,
            summary="基于笔记生成的项目草案",
            requires_confirmation=True,
            payload={"candidate": asdict(candidate), "fragment_ids": fragment_ids},
            provenance=provenance,
            created_at=_now_iso(),
            updated_at=_now_iso(),
        )
        return self._repository.save_candidate(record)

    def mark_candidate_ready(
        self,
        candidate_id: str,
        *,
        actor_type: str,
        reviewed_at: str | None = None,
    ) -> BridgeCandidateRecord:
        candidate = self._repository.mark_candidate_ready(
            candidate_id,
            actor_type=actor_type,
            reviewed_at=reviewed_at,
        )
        return self._save_candidate(candidate)

    def dismiss_candidate(
        self,
        candidate_id: str,
        *,
        actor_type: str,
        reason: str,
    ) -> BridgeCandidateRecord:
        candidate = self._repository.dismiss_candidate(
            candidate_id,
            actor_type=actor_type,
            terminal_reason=reason,
        )
        return self._save_candidate(candidate)

    def defer_candidate(
        self,
        candidate_id: str,
        *,
        actor_type: str,
        deferred_until: str,
        reason: str,
    ) -> BridgeCandidateRecord:
        candidate = self._repository.defer_candidate(
            candidate_id,
            deferred_until=deferred_until,
            deferred_reason=reason,
            actor_type=actor_type,
        )
        return self._save_candidate(candidate)

    def list_candidates(
        self,
        *,
        status: str | None = None,
        candidate_type: str | None = None,
    ) -> list[BridgeCandidateRecord]:
        candidates = self._repository.list_candidates(
            status=status,
            candidate_type=candidate_type,
        )
        return [with_candidate_actions(candidate) for candidate in candidates]

    def get_candidate_detail(self, candidate_id: str) -> dict[str, Any]:
        candidate = self._get_candidate(candidate_id)
        guard_state = candidate.guard_state or compute_guard_state(candidate)
        normalized = replace(
            with_candidate_actions(candidate),
            guard_state=guard_state,
        )
        return {
            "candidate": normalized,
            "provenance": normalized.provenance,
            "action_history": self._repository.list_candidate_events(candidate_id),
            "guard_state": guard_state,
            "source_summary": source_summary(normalized),
            "target_summary": target_summary(normalized),
        }

    def apply_candidate(self, candidate_id: str, *, actor_type: str) -> dict[str, Any]:
        candidate = self._get_candidate(candidate_id)
        if candidate.status != "ready":
            raise ValueError(f"candidate {candidate_id} is not ready")

        handler = get_apply_handler(candidate.candidate_type)
        if handler is None:
            raise ValueError(
                f"no apply handler registered for candidate type: {candidate.candidate_type}"
            )

        guard_state = compute_guard_state(candidate)
        candidate = self._save_candidate(replace(candidate, guard_state=guard_state))
        if not guard_state["is_applicable"]:
            expired = self._repository.expire_candidate(
                candidate_id,
                actor_type=actor_type,
                terminal_reason="guard_rejected",
            )
            self._save_candidate(replace(expired, guard_state=guard_state))
            raise ValueError(f"guard rejected candidate {candidate_id}")

        try:
            applied_target = handler.apply(candidate)
        except RuntimeError as exc:
            failed = self._repository.record_candidate_error(
                candidate_id,
                error_code="apply_failed",
                message=str(exc),
                actor_type=actor_type,
            )
            self._save_candidate(replace(failed, guard_state=guard_state))
            raise RuntimeError(f"apply failed: {exc}") from exc

        applied_at = _now_iso()
        applied = self._repository._transition_candidate(
            candidate_id,
            to_status="applied",
            actor_type=actor_type,
            action="applied",
            field_updates={
                "applied_at": applied_at,
                "applied_by": actor_type,
                "guard_state": guard_state,
            },
            event_payload={
                "applied_target": applied_target,
                "applied_at": applied_at,
            },
            updated_at=applied_at,
        )
        normalized = self._save_candidate(applied)
        return {
            "candidate": normalized,
            "applied_target": applied_target,
            "applied_at": applied_at,
        }

    def _get_candidate(self, candidate_id: str) -> BridgeCandidateRecord:
        candidate = self._repository.get_candidate(candidate_id)
        if candidate is None:
            raise KeyError(candidate_id)
        return self._normalize_candidate(candidate)

    def _save_candidate(self, candidate: BridgeCandidateRecord) -> BridgeCandidateRecord:
        normalized = self._normalize_candidate(candidate)
        return self._repository.save_candidate(with_candidate_actions(normalized))

    def _normalize_candidate(self, candidate: BridgeCandidateRecord) -> BridgeCandidateRecord:
        normalized_provenance: list[BridgeActionProvenance] = []
        for provenance in candidate.provenance:
            if isinstance(provenance, BridgeActionProvenance):
                normalized_provenance.append(provenance)
                continue

            source_objects = [
                source
                if isinstance(source, ObjectProvenance)
                else ObjectProvenance(**source)
                for source in provenance.get("source_objects", [])
            ]
            normalized_provenance.append(
                BridgeActionProvenance(
                    action_name=provenance["action_name"],
                    source_objects=source_objects,
                    initiated_by=provenance["initiated_by"],
                    approval_mode=provenance["approval_mode"],
                    created_at=provenance["created_at"],
                )
            )
        return replace(candidate, provenance=normalized_provenance)

    def create_plan_from_notebook(
        self,
        *,
        project_id: str,
        note_ids: list[str],
        fragment_ids: list[str],
    ) -> BridgeCandidateRecord:
        provenance = self._provenance(
            action_name="create_plan_from_notebook",
            source_object_type="notebook",
            source_object_id=note_ids[0],
        )
        record = BridgeCandidateRecord(
            id=_candidate_id("cand_plan"),
            candidate_type="project_draft",
            status="draft",
            title="Plan Draft",
            summary="基于笔记生成的计划草案",
            requires_confirmation=True,
            payload={
                "project_id": project_id,
                "note_ids": note_ids,
                "fragment_ids": fragment_ids,
            },
            provenance=provenance,
            created_at=_now_iso(),
            updated_at=_now_iso(),
        )
        return self._repository.save_candidate(record)

    def extract_constraints_from_notebook(
        self,
        *,
        project_id: str,
        note_ids: list[str],
        fragment_ids: list[str],
    ) -> BridgeCandidateRecord:
        provenance = self._provenance(
            action_name="extract_constraints_from_notebook",
            source_object_type="notebook",
            source_object_id=note_ids[0],
        )
        candidate = ProjectConstraintCandidate(
            id=_candidate_id("cand_constraint"),
            project_id=project_id,
            title="Constraint Candidate",
            content="Generated constraint",
            provenance=provenance,
        )
        record = BridgeCandidateRecord(
            id=candidate.id,
            candidate_type="project_constraint",
            status="draft",
            title=candidate.title,
            summary="基于笔记提炼的项目约束候选",
            requires_confirmation=True,
            payload={"candidate": asdict(candidate), "fragment_ids": fragment_ids},
            provenance=provenance,
            created_at=_now_iso(),
            updated_at=_now_iso(),
        )
        return self._repository.save_candidate(record)

    def export_project_summary_to_notebook(
        self,
        *,
        project_id: str,
        scope: str,
        target_directory: str,
    ) -> BridgeCandidateRecord:
        provenance = self._provenance(
            action_name="export_project_summary_to_notebook",
            source_object_type="project",
            source_object_id=project_id,
        )
        candidate = NotebookDraftCandidate(
            id=_candidate_id("cand_note"),
            source_project_id=project_id,
            title="项目总结",
            body="Generated project summary",
            target_directory=target_directory,
            requires_confirmation=True,
            provenance=provenance,
        )
        record = BridgeCandidateRecord(
            id=candidate.id,
            candidate_type="notebook_draft",
            status="draft",
            title=candidate.title,
            summary=f"导出 {scope} 范围的项目总结草稿",
            requires_confirmation=True,
            payload={"candidate": asdict(candidate)},
            provenance=provenance,
            created_at=_now_iso(),
            updated_at=_now_iso(),
        )
        return self._repository.save_candidate(record)

    def extract_long_term_memory_from_project(
        self,
        *,
        project_id: str,
        scope: str,
    ) -> BridgeCandidateRecord:
        provenance = self._provenance(
            action_name="extract_long_term_memory_from_project",
            source_object_type="project",
            source_object_id=project_id,
        )
        candidate = MemoryEntryCandidate(
            id=_candidate_id("cand_mem"),
            category="learning",
            title="Project Learning",
            content=f"Generated from {scope}",
            confidence=0.8,
            provenance=provenance,
        )
        record = BridgeCandidateRecord(
            id=candidate.id,
            candidate_type="memory_entry",
            status="draft",
            title=candidate.title,
            summary="从项目提炼长期记忆候选",
            requires_confirmation=True,
            payload={"candidate": asdict(candidate)},
            provenance=provenance,
            created_at=_now_iso(),
            updated_at=_now_iso(),
        )
        return self._repository.save_candidate(record)

    def extract_memory_from_notebook(
        self,
        *,
        note_ids: list[str],
        fragment_ids: list[str],
    ) -> BridgeCandidateRecord:
        provenance = self._provenance(
            action_name="extract_memory_from_notebook",
            source_object_type="notebook",
            source_object_id=note_ids[0],
        )
        candidate = MemoryEntryCandidate(
            id=_candidate_id("cand_mem"),
            category="learning",
            title="Notebook Learning",
            content="Generated from notebook",
            confidence=0.75,
            provenance=provenance,
        )
        record = BridgeCandidateRecord(
            id=candidate.id,
            candidate_type="memory_entry",
            status="draft",
            title=candidate.title,
            summary="从笔记提炼长期记忆候选",
            requires_confirmation=True,
            payload={"candidate": asdict(candidate), "fragment_ids": fragment_ids},
            provenance=provenance,
            created_at=_now_iso(),
            updated_at=_now_iso(),
        )
        return self._repository.save_candidate(record)

    def extract_skill_candidate_from_project(
        self,
        *,
        project_id: str,
        scope: str,
    ) -> BridgeCandidateRecord:
        provenance = self._provenance(
            action_name="extract_skill_candidate_from_project",
            source_object_type="project",
            source_object_id=project_id,
        )
        candidate = SkillCandidateDraft(
            id=_candidate_id("cand_skill"),
            title="Generated Skill Candidate",
            summary=f"Generated from {scope}",
            suggested_scope="project",
            provenance=provenance,
        )
        record = BridgeCandidateRecord(
            id=candidate.id,
            candidate_type="skill_candidate",
            status="draft",
            title=candidate.title,
            summary="从项目提炼 skill candidate",
            requires_confirmation=True,
            payload={"candidate": asdict(candidate)},
            provenance=provenance,
            created_at=_now_iso(),
            updated_at=_now_iso(),
        )
        return self._repository.save_candidate(record)

    def attach_notebook_note_to_project(
        self,
        *,
        project_id: str,
        note_id: str,
        fragment_id: str | None,
        relation: str,
    ) -> ProjectReferenceLink:
        link = ProjectReferenceLink(
            id=_candidate_id("proj_ref"),
            project_id=project_id,
            note_id=note_id,
            fragment_id=fragment_id,
            relation=relation,
            created_at=_now_iso(),
        )
        return self._repository.save_project_reference(link)

    def attach_project_artifact_to_notebook(
        self,
        *,
        note_id: str,
        project_id: str,
        artifact_id: str,
        relation: str,
    ) -> NotebookReferenceLink:
        link = NotebookReferenceLink(
            id=_candidate_id("note_ref"),
            note_id=note_id,
            project_id=project_id,
            artifact_id=artifact_id,
            relation=relation,
            created_at=_now_iso(),
        )
        return self._repository.save_notebook_reference(link)
