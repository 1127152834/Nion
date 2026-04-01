from __future__ import annotations

from dataclasses import asdict
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from .models import (
    BridgeActionProvenance,
    BridgeCandidateRecord,
    MemoryEntryCandidate,
    NotebookDraftCandidate,
    ObjectProvenance,
    ProjectConstraintCandidate,
    ProjectDraftCandidate,
    SkillCandidateDraft,
)


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _candidate_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex}"


class ObjectBridgeService:
    def __init__(self, *, base_dir: str | Path | None = None) -> None:
        self._base_dir = Path(base_dir) if base_dir is not None else None

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
        return BridgeCandidateRecord(
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
        return BridgeCandidateRecord(
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
        return BridgeCandidateRecord(
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
        return BridgeCandidateRecord(
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
        return BridgeCandidateRecord(
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
        return BridgeCandidateRecord(
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
        return BridgeCandidateRecord(
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
