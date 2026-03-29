from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from nion.threads.repository import ThreadRepository

from .models import (
    ExecutionPlan,
    ExecutionPlanStatus,
    ManagedArtifact,
    ManagedArtifactVersion,
    ProjectDecisionRequest,
    ProjectMemoryCategory,
    ProjectMemoryEntry,
    ProjectPhaseSnapshot,
    ProjectThreadLink,
)
from .repository import ProjectRepository, _new_id


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


class ProjectService:
    def __init__(
        self,
        *,
        repository: ProjectRepository | None = None,
        thread_repository: ThreadRepository | None = None,
    ) -> None:
        self._repository = repository or ProjectRepository()
        self._thread_repository = thread_repository or ThreadRepository()

    def list_projects(self) -> dict[str, Any]:
        items = []
        for project in self._repository.list_projects():
            dashboard = self._repository.build_project_dashboard(project.id)
            items.append(
                {
                    "id": project.id,
                    "name": project.name,
                    "goal": project.goal,
                    "lifecycle_status": project.lifecycle_status,
                    "current_phase": project.current_phase,
                    "progress": dashboard["progress"],
                    "current_primary_plan": dashboard["current_primary_plan"],
                    "stats": dashboard["stats"],
                    "last_active_at": project.updated_at,
                }
            )
        return {"items": items, "next_cursor": None}

    def create_project(self, *, name: str, description: str = "", goal: str = "") -> dict[str, Any]:
        project = self._repository.create_project(name=name, description=description, goal=goal)
        return project.model_dump(mode="json")

    def get_dashboard(self, project_id: str) -> dict[str, Any]:
        return self._repository.build_project_dashboard(project_id)

    def update_project(self, project_id: str, *, name: str | None = None, description: str | None = None, goal: str | None = None) -> dict[str, Any]:
        return self._repository.update_project(project_id, name=name, description=description, goal=goal).model_dump(mode="json")

    def list_plans(self, project_id: str) -> dict[str, Any]:
        return {"items": [plan.model_dump(mode="json") for plan in self._repository.list_plans(project_id)]}

    def create_plan(self, project_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        plan = self._repository.create_plan(
            project_id=project_id,
            phase=payload.get("phase", "计划"),
            title=payload["title"],
            description=payload.get("description", ""),
            execution_mode=payload.get("execution_mode", "manual"),
            plan_type=payload.get("plan_type", "normal"),
            depends_on_plan_ids=list(payload.get("depends_on_plan_ids", []) or []),
            is_gate_plan=bool(payload.get("is_gate_plan", False)),
            rework_of_plan_id=payload.get("rework_of_plan_id"),
            derived_from_outcome_id=payload.get("derived_from_outcome_id"),
        )
        existing = self._repository.list_plans(project_id)
        should_be_primary = bool(payload.get("is_primary")) or len(existing) == 1
        if should_be_primary:
            plan = self._repository.set_primary_plan(project_id, plan.id)
        return plan.model_dump(mode="json")

    def get_plan(self, project_id: str, plan_id: str) -> dict[str, Any]:
        plan = self._repository.get_plan(project_id, plan_id)
        if plan is None:
            raise KeyError(plan_id)
        threads = [
            thread.model_dump(mode="json")
            for thread in self._repository.list_threads(project_id)
            if plan_id in thread.linked_plan_ids
        ]
        artifacts = [
            artifact.model_dump(mode="json")
            for artifact in self._repository.list_artifacts(project_id)
            if artifact.primary_plan_id == plan_id or plan_id in artifact.linked_plan_ids
        ]
        return {
            "plan": plan.model_dump(mode="json"),
            "primary_thread": self._repository.get_thread_link(project_id, plan.primary_thread_id).model_dump(mode="json")
            if plan.primary_thread_id and self._repository.get_thread_link(project_id, plan.primary_thread_id)
            else None,
            "linked_threads": threads,
            "artifacts": artifacts,
        }

    def update_plan(self, project_id: str, plan_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        plan = self._repository.get_plan(project_id, plan_id)
        if plan is None:
            raise KeyError(plan_id)
        changes = {}
        for key in ["title", "description", "execution_mode", "is_gate_plan", "depends_on_plan_ids", "branch_routes", "sort_order"]:
            if key in payload:
                changes[key] = payload[key]
        updated = self._repository.update_plan(project_id, plan_id, **changes)
        return updated.model_dump(mode="json")

    def set_primary_plan(self, project_id: str, plan_id: str) -> dict[str, Any]:
        return self._repository.set_primary_plan(project_id, plan_id).model_dump(mode="json")

    def start_plan(self, project_id: str, plan_id: str) -> dict[str, Any]:
        plan = self._repository.get_plan(project_id, plan_id)
        if plan is None:
            raise KeyError(plan_id)
        if plan.depends_on_plan_ids:
            plans = {item.id: item for item in self._repository.list_plans(project_id)}
            unresolved = [
                dependency
                for dependency in plan.depends_on_plan_ids
                if dependency not in plans or plans[dependency].status.lifecycle_status != "completed"
            ]
            if unresolved:
                raise ValueError("Plan dependencies are not completed")
        status = plan.status.model_copy(
            update={
                "lifecycle_status": "running",
                "queue_status": "dispatched",
                "hold_status": "none",
                "hold_reason": None,
            }
        )
        updated = self._repository.update_plan(project_id, plan_id, status=status, started_at=_now_iso())
        self._repository.save_timeline_event(
            self._make_timeline_event(
                project_id=project_id,
                event_type="plan_started",
                title="已启动实施计划",
                summary=updated.title,
                phase=updated.phase,
                related_plan_id=updated.id,
            )
        )
        self._repository.set_primary_plan(project_id, plan_id)
        return updated.model_dump(mode="json")

    def pause_plan(self, project_id: str, plan_id: str, *, reason: str = "manual") -> dict[str, Any]:
        plan = self._repository.get_plan(project_id, plan_id)
        if plan is None:
            raise KeyError(plan_id)
        status = plan.status.model_copy(
            update={
                "hold_status": "paused",
                "hold_reason": reason if reason in {"rate_limited", "dependency", "manual", "missing_input", "tool_error", "human_decision"} else "manual",
            }
        )
        updated = self._repository.update_plan(project_id, plan_id, status=status)
        self._repository.save_timeline_event(
            self._make_timeline_event(
                project_id=project_id,
                event_type="plan_paused",
                title="实施计划已暂停",
                summary=updated.title,
                phase=updated.phase,
                related_plan_id=updated.id,
                payload={"reason": updated.status.hold_reason},
            )
        )
        return updated.model_dump(mode="json")

    def resume_plan(self, project_id: str, plan_id: str) -> dict[str, Any]:
        plan = self._repository.get_plan(project_id, plan_id)
        if plan is None:
            raise KeyError(plan_id)
        if plan.execution_mode == "manual":
            status = plan.status.model_copy(update={"hold_status": "waiting_manual_start", "hold_reason": "manual"})
        else:
            status = plan.status.model_copy(update={"hold_status": "none", "hold_reason": None, "queue_status": "queued"})
        updated = self._repository.update_plan(project_id, plan_id, status=status)
        return updated.model_dump(mode="json")

    def confirm_plan_outcome(self, project_id: str, plan_id: str, *, outcome_status: str, outcome_summary: str = "", selected_next_plan_id: str | None = None) -> dict[str, Any]:
        plan = self._repository.get_plan(project_id, plan_id)
        if plan is None:
            raise KeyError(plan_id)
        status = plan.status.model_copy(update={"lifecycle_status": "completed", "hold_status": "none", "hold_reason": None, "queue_status": "not_queued"})
        updated = self._repository.update_plan(
            project_id,
            plan_id,
            status=status,
            outcome_status=outcome_status,
            outcome_summary=outcome_summary or plan.outcome_summary,
            completed_at=_now_iso(),
        )
        self._repository.set_primary_plan(project_id, updated.id)
        self._repository.save_timeline_event(
            self._make_timeline_event(
                project_id=project_id,
                event_type="plan_outcome_confirmed",
                title="已确认计划结果",
                summary=updated.outcome_summary or updated.title,
                phase=updated.phase,
                related_plan_id=updated.id,
                payload={"outcome_status": outcome_status, "selected_next_plan_id": selected_next_plan_id},
            )
        )
        self._write_memory_entry(
            project_id=project_id,
            category="handoff",
            title=f"{updated.title} 结果确认",
            content=updated.outcome_summary or updated.title,
            source_event_type="plan_outcome_confirmed",
            source_plan_id=updated.id,
        )
        next_plan = self._repository.get_plan(project_id, selected_next_plan_id) if selected_next_plan_id else None
        if next_plan and next_plan.execution_mode == "auto":
            next_status = next_plan.status.model_copy(update={"lifecycle_status": "ready", "queue_status": "queued", "hold_status": "none", "hold_reason": None})
            self._repository.update_plan(project_id, next_plan.id, status=next_status)
        return updated.model_dump(mode="json")

    def create_rework_plan(self, project_id: str, plan_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        plan = self._repository.get_plan(project_id, plan_id)
        if plan is None:
            raise KeyError(plan_id)
        rework = self._repository.create_plan(
            project_id=project_id,
            phase="计划" if plan.phase == "完成" else plan.phase,
            title=payload["title"],
            description=payload.get("description", ""),
            execution_mode=payload.get("execution_mode", "manual"),
            plan_type="rework",
            rework_of_plan_id=plan.id,
            derived_from_outcome_id=plan.id,
        )
        project = self._repository.get_project(project_id)
        if project and project.current_phase == "完成":
            self._regress_project_phase(project_id, to_phase="实施", reason="新建返工计划后从完成阶段回退")
        self._write_memory_entry(
            project_id=project_id,
            category="learnings",
            title=f"{plan.title} 返工",
            content=payload.get("description") or f"基于 {plan.title} 新建返工计划",
            source_event_type="rework_plan_created",
            source_plan_id=rework.id,
        )
        return rework.model_dump(mode="json")

    def list_threads(self, project_id: str) -> dict[str, Any]:
        return {"items": [link.model_dump(mode="json") for link in self._repository.list_threads(project_id)]}

    def create_thread(self, project_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        thread_id = payload.get("thread_id") or _new_id("thread")
        title = payload.get("title") or "Untitled"
        role = payload.get("role", "temporary")
        linked_plan_ids = list(payload.get("linked_plan_ids", []) or [])
        inherit_project_context = bool(payload.get("inherit_project_context", True))
        project = self._repository.get_project(project_id)
        if project is None:
            raise KeyError(project_id)
        additional_values = {
            "project": {
                "source": "project",
                "project_id": project_id,
                "project_name": project.name,
                "project_phase": project.current_phase,
                "primary_plan_id": project.current_primary_plan_id,
                "inherit_project_context": inherit_project_context,
            }
        }
        self._thread_repository.upsert_thread(thread_id, title=title, values=additional_values)
        existing = self._repository.list_threads(project_id)
        is_primary = len(existing) == 0
        link = self._repository.create_thread_link(
            project_id=project_id,
            thread_id=thread_id,
            role="primary" if is_primary else role,
            linked_plan_ids=linked_plan_ids,
            is_primary_thread=is_primary,
        )
        self._repository.save_timeline_event(
            self._make_timeline_event(
                project_id=project_id,
                event_type="thread_linked",
                title="已创建项目会话",
                summary=title,
                phase=project.current_phase,
                related_thread_id=thread_id,
            )
        )
        return link.model_dump(mode="json")

    def set_primary_thread(self, project_id: str, thread_id: str) -> dict[str, Any]:
        return self._repository.set_primary_thread(project_id, thread_id).model_dump(mode="json")

    def link_plan_to_thread(self, project_id: str, thread_id: str, *, plan_id: str, as_primary_for_plan: bool = False) -> dict[str, Any]:
        link = self._repository.get_thread_link(project_id, thread_id)
        if link is None:
            raise KeyError(thread_id)
        linked_plan_ids = list(dict.fromkeys([*link.linked_plan_ids, plan_id]))
        updated_link = link.model_copy(update={"linked_plan_ids": linked_plan_ids, "updated_at": _now_iso(), "last_active_at": _now_iso()})
        self._repository.save_thread_link(updated_link)
        if as_primary_for_plan:
            plan = self._repository.get_plan(project_id, plan_id)
            if plan is None:
                raise KeyError(plan_id)
            self._repository.update_plan(project_id, plan_id, primary_thread_id=thread_id)
        return updated_link.model_dump(mode="json")

    def list_thread_mention_candidates(self, project_id: str, thread_id: str) -> dict[str, Any]:
        items = [
            link.model_dump(mode="json")
            for link in self._repository.list_threads(project_id)
            if link.thread_id != thread_id
        ]
        return {"items": items}

    def import_thread_snapshot(self, project_id: str, thread_id: str, *, source_thread_id: str) -> dict[str, Any]:
        if self._repository.get_thread_link(project_id, source_thread_id) is None:
            raise ValueError("Source thread is not part of this project")
        source = self._thread_repository.get_thread(source_thread_id)
        target = self._thread_repository.get_thread(thread_id)
        if source is None or target is None:
            raise KeyError(source_thread_id if source is None else thread_id)
        summary = {
            "source_thread_id": source_thread_id,
            "source_title": source.values.title,
            "message_count": len(source.values.messages),
            "summary": f"来自会话 {source.values.title} 的一次性快照",
        }
        imports = target.values.model_dump().get("project_imports", [])
        imports.append(summary)
        updated = self._thread_repository.update_state(thread_id, {"project_imports": imports})
        self._repository.save_timeline_event(
            self._make_timeline_event(
                project_id=project_id,
                event_type="thread_snapshot_imported",
                title="已导入会话快照",
                summary=source.values.title,
                related_thread_id=thread_id,
                payload={"source_thread_id": source_thread_id},
            )
        )
        return updated.model_dump(mode="json")

    def list_timeline(self, project_id: str) -> dict[str, Any]:
        return {"items": [event.model_dump(mode="json") for event in self._repository.list_timeline_events(project_id)], "next_cursor": None}

    def get_timeline_event(self, project_id: str, event_id: str) -> dict[str, Any]:
        events = {event.id: event for event in self._repository.list_timeline_events(project_id, limit=500)}
        event = events.get(event_id)
        if event is None:
            raise KeyError(event_id)
        return {"event": event.model_dump(mode="json")}

    def list_artifacts(self, project_id: str) -> dict[str, Any]:
        return {"items": [artifact.model_dump(mode="json") for artifact in self._repository.list_artifacts(project_id)]}

    def get_artifact(self, project_id: str, artifact_id: str) -> dict[str, Any]:
        artifact = self._repository.get_artifact(project_id, artifact_id)
        if artifact is None:
            raise KeyError(artifact_id)
        versions = self._repository.list_artifact_versions(artifact_id)
        return {
            "artifact": artifact.model_dump(mode="json"),
            "versions": [version.model_dump(mode="json") for version in versions],
        }

    def restore_artifact(self, project_id: str, artifact_id: str, *, version_id: str, restore_reason: str = "") -> dict[str, Any]:
        artifact = self._repository.get_artifact(project_id, artifact_id)
        if artifact is None:
            raise KeyError(artifact_id)
        versions = self._repository.list_artifact_versions(artifact_id)
        source = next((version for version in versions if version.id == version_id), None)
        if source is None:
            raise KeyError(version_id)
        next_number = max((version.version_number for version in versions), default=0) + 1
        restored = ManagedArtifactVersion(
            id=_new_id("artver"),
            artifact_id=artifact_id,
            version_number=next_number,
            created_at=_now_iso(),
            created_by="user",
            change_type="restore",
            summary=source.summary or artifact.title,
            content_ref=source.content_ref,
            diff_ref=source.diff_ref,
            related_plan_id=artifact.primary_plan_id,
            restored_from_version_id=source.id,
            restore_reason=restore_reason,
        )
        self._repository.save_artifact_version(restored)
        updated_artifact = artifact.model_copy(update={"current_version_id": restored.id, "updated_at": _now_iso()})
        self._repository.save_artifact(updated_artifact)
        self._repository.save_timeline_event(
            self._make_timeline_event(
                project_id=project_id,
                event_type="artifact_restored",
                title="已恢复受管产物版本",
                summary=artifact.title,
                related_artifact_id=artifact_id,
                related_plan_id=artifact.primary_plan_id,
                payload={"version_id": version_id},
            )
        )
        if artifact.primary_plan_id:
            plan = self._repository.get_plan(project_id, artifact.primary_plan_id)
            if plan and plan.status.lifecycle_status == "completed":
                self._create_decision(
                    project_id=project_id,
                    decision_type="create_rework_plan",
                    title="恢复版本后建议新建返工计划",
                    summary=f"{artifact.title} 来自已完成计划，是否基于本次恢复新建返工计划？",
                    related_plan_id=plan.id,
                    payload={"artifact_id": artifact_id, "version_id": version_id},
                )
        return restored.model_dump(mode="json")

    def link_artifact_to_plan(self, project_id: str, artifact_id: str, *, plan_id: str, as_primary: bool = False) -> dict[str, Any]:
        artifact = self._repository.get_artifact(project_id, artifact_id)
        if artifact is None:
            raise KeyError(artifact_id)
        linked_plan_ids = list(dict.fromkeys([*artifact.linked_plan_ids, plan_id]))
        updated = artifact.model_copy(
            update={
                "linked_plan_ids": linked_plan_ids,
                "primary_plan_id": plan_id if as_primary or artifact.primary_plan_id is None else artifact.primary_plan_id,
                "updated_at": _now_iso(),
            }
        )
        self._repository.save_artifact(updated)
        return updated.model_dump(mode="json")

    def get_memory(self, project_id: str) -> dict[str, Any]:
        entries = self._repository.list_memory_entries(project_id)
        summary: dict[ProjectMemoryCategory, list[str]] = {
            "brief": [],
            "decisions": [],
            "constraints": [],
            "learnings": [],
            "handoff": [],
        }
        for entry in entries:
            summary[entry.category].append(entry.content)
        return {
            "summary": summary,
            "entries": [entry.model_dump(mode="json") for entry in entries],
        }

    def extract_memory(self, project_id: str, *, source_type: str, source_id: str, category: str) -> dict[str, Any]:
        if source_type == "plan":
            plan = self._repository.get_plan(project_id, source_id)
            if plan is None:
                raise KeyError(source_id)
            entry = self._write_memory_entry(
                project_id=project_id,
                category=category if category in {"brief", "decisions", "constraints", "learnings", "handoff"} else "learnings",
                title=f"{plan.title} 提炼",
                content=plan.outcome_summary or plan.description or plan.title,
                source_event_type="user_explicit_extract",
                source_plan_id=plan.id,
            )
            return entry.model_dump(mode="json")
        raise ValueError("Unsupported source_type")

    def list_decisions(self, project_id: str) -> dict[str, Any]:
        return {"items": [decision.model_dump(mode="json") for decision in self._repository.list_decisions(project_id, status="pending")]}

    def resolve_decision(self, project_id: str, decision_id: str, *, action_id: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        decision = self._repository.resolve_decision(project_id, decision_id, action_id=action_id, payload=payload)
        if decision.type == "create_rework_plan" and action_id == "approve":
            related_plan_id = decision.related_plan_id
            if related_plan_id is not None:
                title = str((payload or {}).get("title") or "返工计划")
                description = str((payload or {}).get("description") or decision.summary)
                self.create_rework_plan(
                    project_id,
                    related_plan_id,
                    {"title": title, "description": description, "execution_mode": "manual"},
                )
        elif decision.type == "confirm_plan_outcome" and action_id in {"approve", "rework", "blocked"}:
            if decision.related_plan_id is not None:
                outcome = "done" if action_id == "approve" else "needs_revision" if action_id == "rework" else "blocked"
                self.confirm_plan_outcome(
                    project_id,
                    decision.related_plan_id,
                    outcome_status=outcome,
                    outcome_summary=str((payload or {}).get("outcome_summary") or decision.summary),
                    selected_next_plan_id=(payload or {}).get("selected_next_plan_id"),
                )
        elif decision.type == "extract_long_term_memory" and action_id == "approve":
            self._repository.save_timeline_event(
                self._make_timeline_event(
                    project_id=project_id,
                    event_type="memory_extracted",
                    title="已确认提炼长期记忆",
                    summary=decision.summary,
                    related_plan_id=decision.related_plan_id,
                )
            )
        elif decision.type == "extract_skill" and action_id == "approve":
            self._repository.save_timeline_event(
                self._make_timeline_event(
                    project_id=project_id,
                    event_type="skill_extracted",
                    title="已确认生成 Skill 候选",
                    summary=decision.summary,
                    related_plan_id=decision.related_plan_id,
                )
            )
        elif decision.type == "complete_project" and action_id == "approve":
            self._mark_project_completed(project_id)
        return decision.model_dump(mode="json")

    def create_seed_artifact(self, project_id: str, *, title: str, path: str, primary_plan_id: str | None = None) -> dict[str, Any]:
        now = _now_iso()
        artifact = ManagedArtifact(
            id=_new_id("artifact"),
            project_id=project_id,
            artifact_type="document",
            title=title,
            path=path,
            primary_plan_id=primary_plan_id,
            linked_plan_ids=[primary_plan_id] if primary_plan_id else [],
            created_by="system",
            created_at=now,
            updated_at=now,
        )
        self._repository.save_artifact(artifact)
        version = ManagedArtifactVersion(
            id=_new_id("artver"),
            artifact_id=artifact.id,
            version_number=1,
            created_at=now,
            created_by="system",
            change_type="create",
            summary=title,
            content_ref=path,
            related_plan_id=primary_plan_id,
        )
        self._repository.save_artifact_version(version)
        updated = artifact.model_copy(update={"current_version_id": version.id, "updated_at": _now_iso()})
        self._repository.save_artifact(updated)
        return updated.model_dump(mode="json")

    def _mark_project_completed(self, project_id: str) -> None:
        project = self._repository.get_project(project_id)
        if project is None:
            raise KeyError(project_id)
        now = _now_iso()
        updated = project.model_copy(update={"lifecycle_status": "completed", "current_phase": "完成", "completed_at": now, "updated_at": now})
        self._repository.save_project(updated)
        self._repository.save_timeline_event(
            self._make_timeline_event(
                project_id=project_id,
                event_type="project_completed",
                title="项目已完成",
                summary=updated.name,
                phase="完成",
            )
        )
        self._create_decision(
            project_id=project_id,
            decision_type="extract_long_term_memory",
            title="建议提炼长期记忆",
            summary=f"项目 {updated.name} 已完成，是否提炼跨项目稳定偏好和经验？",
        )
        self._create_decision(
            project_id=project_id,
            decision_type="extract_skill",
            title="建议提炼 Skill 候选",
            summary=f"项目 {updated.name} 已完成，是否提炼可复用方法模板？",
        )

    def _regress_project_phase(self, project_id: str, *, to_phase: str, reason: str) -> None:
        project = self._repository.get_project(project_id)
        if project is None:
            raise KeyError(project_id)
        now = _now_iso()
        phase_history = self._repository.list_phase_snapshots(project_id)
        if phase_history:
            latest = phase_history[0]
            if latest.exited_at is None:
                self._repository.save_phase_snapshot(latest.model_copy(update={"exited_at": now}))
        next_snapshot = ProjectPhaseSnapshot(
            id=_new_id("phase"),
            project_id=project_id,
            phase=to_phase,  # type: ignore[arg-type]
            entered_at=now,
            entered_by="system",
            transition_reason=reason,
            summary="",
            next_action="继续推进返工主线",
            status_at_time=project.lifecycle_status,
        )
        self._repository.save_phase_snapshot(next_snapshot)
        self._repository.save_project(
            project.model_copy(
                update={
                    "current_phase": to_phase,
                    "active_phase_snapshot_id": next_snapshot.id,
                    "lifecycle_status": "active",
                    "updated_at": now,
                }
            )
        )
        self._repository.save_timeline_event(
            self._make_timeline_event(
                project_id=project_id,
                event_type="phase_regressed",
                title="项目阶段已回退",
                summary=reason,
                phase=to_phase,
            )
        )

    def _write_memory_entry(
        self,
        *,
        project_id: str,
        category: str,
        title: str,
        content: str,
        source_event_type: str,
        source_plan_id: str | None = None,
    ) -> ProjectMemoryEntry:
        now = _now_iso()
        entry = ProjectMemoryEntry(
            id=_new_id("mem"),
            project_id=project_id,
            category=category if category in {"brief", "decisions", "constraints", "learnings", "handoff"} else "learnings",
            title=title,
            content=content,
            confidence=1.0,
            source_event_type=source_event_type,
            source_plan_id=source_plan_id,
            created_at=now,
            updated_at=now,
        )
        self._repository.save_memory_entry(entry)
        project = self._repository.get_project(project_id)
        if project is not None:
            summary = project.project_memory_summary.model_copy()
            values = getattr(summary, entry.category)
            if content not in values:
                values.append(content)
            self._repository.save_project(project.model_copy(update={"project_memory_summary": summary, "updated_at": now}))
        return entry

    def _make_timeline_event(
        self,
        *,
        project_id: str,
        event_type: str,
        title: str,
        summary: str,
        phase: str | None = None,
        related_plan_id: str | None = None,
        related_thread_id: str | None = None,
        related_artifact_id: str | None = None,
        payload: dict[str, Any] | None = None,
    ):
        from .models import ProjectTimelineEvent

        return ProjectTimelineEvent(
            id=_new_id("evt"),
            project_id=project_id,
            event_type=event_type,
            title=title,
            summary=summary,
            phase=phase,
            related_plan_id=related_plan_id,
            related_thread_id=related_thread_id,
            related_artifact_id=related_artifact_id,
            created_at=_now_iso(),
            payload=payload or {},
        )

    def _create_decision(
        self,
        *,
        project_id: str,
        decision_type: str,
        title: str,
        summary: str,
        related_plan_id: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> ProjectDecisionRequest:
        decision = ProjectDecisionRequest(
            id=_new_id("decision"),
            project_id=project_id,
            type=decision_type,  # type: ignore[arg-type]
            title=title,
            summary=summary,
            related_plan_id=related_plan_id,
            payload=payload or {},
            actions=self._repository.create_default_decision_actions(decision_type),
            created_at=_now_iso(),
        )
        return self._repository.save_decision(decision)


_project_service: ProjectService | None = None


def create_default_project_service() -> ProjectService:
    global _project_service
    if _project_service is None:
        _project_service = ProjectService()
    return _project_service
