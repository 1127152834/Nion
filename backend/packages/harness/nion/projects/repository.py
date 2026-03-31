from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable
from uuid import uuid4

from nion.config.paths import Paths, get_paths

from .models import (
    ExecutionPlan,
    ExecutionPlanStatus,
    ManagedArtifact,
    ManagedArtifactVersion,
    Project,
    ProjectDecisionAction,
    ProjectDecisionRequest,
    ProjectMemoryEntry,
    ProjectMemorySummary,
    ProjectPhase,
    ProjectPhaseSnapshot,
    ProjectThreadLink,
    ProjectTimelineEvent,
)


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex}"


class ProjectRepository:
    def __init__(self, base_dir: str | Path | None = None):
        self._paths = Paths(base_dir=base_dir) if base_dir is not None else get_paths()
        self._db_path = self._paths.base_dir / "projects.sqlite3"
        self._ensure_schema()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _ensure_schema(self) -> None:
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS project_phase_snapshots (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS execution_plans (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS project_thread_links (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    thread_id TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS managed_artifacts (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS managed_artifact_versions (
                    id TEXT PRIMARY KEY,
                    artifact_id TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS project_memory_entries (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS project_timeline_events (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS project_decision_requests (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_project_phase_snapshots_project_id
                    ON project_phase_snapshots(project_id);
                CREATE INDEX IF NOT EXISTS idx_execution_plans_project_id
                    ON execution_plans(project_id);
                CREATE INDEX IF NOT EXISTS idx_project_thread_links_project_id
                    ON project_thread_links(project_id);
                CREATE INDEX IF NOT EXISTS idx_project_thread_links_thread_id
                    ON project_thread_links(thread_id);
                CREATE INDEX IF NOT EXISTS idx_managed_artifacts_project_id
                    ON managed_artifacts(project_id);
                CREATE INDEX IF NOT EXISTS idx_project_memory_entries_project_id
                    ON project_memory_entries(project_id);
                CREATE INDEX IF NOT EXISTS idx_project_timeline_events_project_id
                    ON project_timeline_events(project_id);
                CREATE INDEX IF NOT EXISTS idx_project_decision_requests_project_id
                    ON project_decision_requests(project_id);
                """
            )

    @staticmethod
    def _load_rows(rows: Iterable[sqlite3.Row], model: type[Any]) -> list[Any]:
        return [model.model_validate_json(str(row["payload"])) for row in rows]

    def list_projects(self) -> list[Project]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT payload FROM projects ORDER BY json_extract(payload, '$.updated_at') DESC"
            ).fetchall()
        return self._load_rows(rows, Project)

    def get_project(self, project_id: str) -> Project | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload FROM projects WHERE id = ?",
                (project_id,),
            ).fetchone()
        if row is None:
            return None
        return Project.model_validate_json(str(row["payload"]))

    def save_project(self, project: Project) -> Project:
        with self._connect() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO projects (id, payload) VALUES (?, ?)",
                (project.id, project.model_dump_json()),
            )
        return project

    def create_project(self, *, name: str, description: str = "", goal: str = "") -> Project:
        now = _now_iso()
        project_id = _new_id("proj")
        phase_snapshot = ProjectPhaseSnapshot(
            id=_new_id("phase"),
            project_id=project_id,
            phase="头脑风暴",
            entered_at=now,
            entered_by="system",
            transition_reason="项目创建后默认进入头脑风暴阶段",
            summary="",
            next_action="继续澄清目标与约束",
            status_at_time="active",
        )
        project = Project(
            id=project_id,
            name=name,
            description=description,
            goal=goal,
            current_phase="头脑风暴",
            active_phase_snapshot_id=phase_snapshot.id,
            created_at=now,
            updated_at=now,
            project_memory_summary=ProjectMemorySummary(
                brief=[goal] if goal else [],
            ),
        )
        self.save_project(project)
        self.save_phase_snapshot(phase_snapshot)
        self.save_timeline_event(
            ProjectTimelineEvent(
                id=_new_id("evt"),
                project_id=project_id,
                event_type="project_created",
                title="项目已创建",
                summary=f"已创建项目 {name}",
                phase="头脑风暴",
                created_at=now,
            )
        )
        return project

    def update_project(self, project_id: str, *, name: str | None = None, description: str | None = None, goal: str | None = None) -> Project:
        project = self.get_project(project_id)
        if project is None:
            raise KeyError(project_id)
        update: dict[str, Any] = {"updated_at": _now_iso()}
        if name is not None:
            update["name"] = name
        if description is not None:
            update["description"] = description
        if goal is not None:
            update["goal"] = goal
            summary = project.project_memory_summary.model_copy()
            summary.brief = [goal] if goal else []
            update["project_memory_summary"] = summary
        updated = project.model_copy(update=update)
        return self.save_project(updated)

    def list_phase_snapshots(self, project_id: str) -> list[ProjectPhaseSnapshot]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT payload FROM project_phase_snapshots WHERE project_id = ? ORDER BY json_extract(payload, '$.entered_at') DESC",
                (project_id,),
            ).fetchall()
        return self._load_rows(rows, ProjectPhaseSnapshot)

    def save_phase_snapshot(self, snapshot: ProjectPhaseSnapshot) -> ProjectPhaseSnapshot:
        with self._connect() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO project_phase_snapshots (id, project_id, payload) VALUES (?, ?, ?)",
                (snapshot.id, snapshot.project_id, snapshot.model_dump_json()),
            )
        return snapshot

    def list_plans(self, project_id: str) -> list[ExecutionPlan]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT payload FROM execution_plans WHERE project_id = ? ORDER BY json_extract(payload, '$.sort_order') ASC, json_extract(payload, '$.created_at') ASC",
                (project_id,),
            ).fetchall()
        return self._load_rows(rows, ExecutionPlan)

    def get_plan(self, project_id: str, plan_id: str) -> ExecutionPlan | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload FROM execution_plans WHERE id = ? AND project_id = ?",
                (plan_id, project_id),
            ).fetchone()
        if row is None:
            return None
        return ExecutionPlan.model_validate_json(str(row["payload"]))

    def save_plan(self, plan: ExecutionPlan) -> ExecutionPlan:
        with self._connect() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO execution_plans (id, project_id, payload) VALUES (?, ?, ?)",
                (plan.id, plan.project_id, plan.model_dump_json()),
            )
        return plan

    def create_plan(
        self,
        *,
        project_id: str,
        phase: ProjectPhase,
        title: str,
        description: str = "",
        execution_mode: str = "manual",
        plan_type: str = "normal",
        depends_on_plan_ids: list[str] | None = None,
        is_gate_plan: bool = False,
        rework_of_plan_id: str | None = None,
        derived_from_outcome_id: str | None = None,
    ) -> ExecutionPlan:
        now = _now_iso()
        existing = self.list_plans(project_id)
        sort_order = len(existing)
        plan = ExecutionPlan(
            id=_new_id("plan"),
            project_id=project_id,
            phase=phase,
            title=title,
            description=description,
            execution_mode="auto" if execution_mode == "auto" else "manual",
            plan_type=plan_type if plan_type in {"normal", "rework", "review", "completion"} else "normal",
            is_gate_plan=is_gate_plan,
            sort_order=sort_order,
            status=ExecutionPlanStatus(
                lifecycle_status="ready" if not depends_on_plan_ids else "draft",
                hold_status="none" if not depends_on_plan_ids else "blocked",
                hold_reason=None if not depends_on_plan_ids else "dependency",
            ),
            depends_on_plan_ids=depends_on_plan_ids or [],
            rework_of_plan_id=rework_of_plan_id,
            derived_from_outcome_id=derived_from_outcome_id,
            created_at=now,
            updated_at=now,
        )
        self.save_plan(plan)
        self.save_timeline_event(
            ProjectTimelineEvent(
                id=_new_id("evt"),
                project_id=project_id,
                event_type="rework_plan_created" if rework_of_plan_id else "plan_created",
                title="已新建返工计划" if rework_of_plan_id else "已新建实施计划",
                summary=title,
                phase=phase,
                related_plan_id=plan.id,
                created_at=now,
                payload={"rework_of_plan_id": rework_of_plan_id},
            )
        )
        return plan

    def update_plan(self, project_id: str, plan_id: str, **changes: Any) -> ExecutionPlan:
        plan = self.get_plan(project_id, plan_id)
        if plan is None:
            raise KeyError(plan_id)
        updated = plan.model_copy(update={**changes, "updated_at": _now_iso()})
        return self.save_plan(updated)

    def set_primary_plan(self, project_id: str, plan_id: str) -> ExecutionPlan:
        target = self.get_plan(project_id, plan_id)
        if target is None:
            raise KeyError(plan_id)
        for plan in self.list_plans(project_id):
            if plan.phase == target.phase and plan.is_primary and plan.id != plan_id:
                self.save_plan(plan.model_copy(update={"is_primary": False, "updated_at": _now_iso()}))
        target = target.model_copy(update={"is_primary": True, "updated_at": _now_iso()})
        self.save_plan(target)
        project = self.get_project(project_id)
        if project is not None:
            self.save_project(project.model_copy(update={"current_primary_plan_id": plan_id, "updated_at": _now_iso()}))
        return target

    def list_threads(self, project_id: str) -> list[ProjectThreadLink]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT payload FROM project_thread_links WHERE project_id = ? ORDER BY json_extract(payload, '$.last_active_at') DESC, json_extract(payload, '$.created_at') DESC",
                (project_id,),
            ).fetchall()
        return self._load_rows(rows, ProjectThreadLink)

    def save_thread_link(self, link: ProjectThreadLink) -> ProjectThreadLink:
        with self._connect() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO project_thread_links (id, project_id, thread_id, payload) VALUES (?, ?, ?, ?)",
                (link.id, link.project_id, link.thread_id, link.model_dump_json()),
            )
        return link

    def get_thread_link(self, project_id: str, thread_id: str) -> ProjectThreadLink | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload FROM project_thread_links WHERE project_id = ? AND thread_id = ?",
                (project_id, thread_id),
            ).fetchone()
        if row is None:
            return None
        return ProjectThreadLink.model_validate_json(str(row["payload"]))

    def create_thread_link(
        self,
        *,
        project_id: str,
        thread_id: str,
        role: str = "temporary",
        linked_plan_ids: list[str] | None = None,
        is_primary_thread: bool = False,
    ) -> ProjectThreadLink:
        now = _now_iso()
        if is_primary_thread:
            self._clear_primary_thread(project_id)
        link = ProjectThreadLink(
            id=_new_id("pth"),
            project_id=project_id,
            thread_id=thread_id,
            role=role if role in {"primary", "exploration", "implementation", "review", "temporary"} else "temporary",
            linked_plan_ids=linked_plan_ids or [],
            is_primary_thread=is_primary_thread,
            created_at=now,
            updated_at=now,
            last_active_at=now,
        )
        self.save_thread_link(link)
        if is_primary_thread:
            project = self.get_project(project_id)
            if project is not None:
                self.save_project(project.model_copy(update={"current_primary_thread_id": thread_id, "updated_at": now}))
        return link

    def _clear_primary_thread(self, project_id: str) -> None:
        for link in self.list_threads(project_id):
            if link.is_primary_thread:
                self.save_thread_link(link.model_copy(update={"is_primary_thread": False, "updated_at": _now_iso()}))

    def set_primary_thread(self, project_id: str, thread_id: str) -> ProjectThreadLink:
        link = self.get_thread_link(project_id, thread_id)
        if link is None:
            raise KeyError(thread_id)
        self._clear_primary_thread(project_id)
        link = link.model_copy(update={"is_primary_thread": True, "updated_at": _now_iso(), "last_active_at": _now_iso()})
        self.save_thread_link(link)
        project = self.get_project(project_id)
        if project is not None:
            self.save_project(project.model_copy(update={"current_primary_thread_id": thread_id, "updated_at": _now_iso()}))
        return link

    def save_artifact(self, artifact: ManagedArtifact) -> ManagedArtifact:
        with self._connect() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO managed_artifacts (id, project_id, payload) VALUES (?, ?, ?)",
                (artifact.id, artifact.project_id, artifact.model_dump_json()),
            )
        return artifact

    def list_artifacts(self, project_id: str) -> list[ManagedArtifact]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT payload FROM managed_artifacts WHERE project_id = ? ORDER BY json_extract(payload, '$.updated_at') DESC",
                (project_id,),
            ).fetchall()
        return self._load_rows(rows, ManagedArtifact)

    def get_artifact(self, project_id: str, artifact_id: str) -> ManagedArtifact | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload FROM managed_artifacts WHERE id = ? AND project_id = ?",
                (artifact_id, project_id),
            ).fetchone()
        if row is None:
            return None
        return ManagedArtifact.model_validate_json(str(row["payload"]))

    def save_artifact_version(self, version: ManagedArtifactVersion) -> ManagedArtifactVersion:
        with self._connect() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO managed_artifact_versions (id, artifact_id, payload) VALUES (?, ?, ?)",
                (version.id, version.artifact_id, version.model_dump_json()),
            )
        return version

    def list_artifact_versions(self, artifact_id: str) -> list[ManagedArtifactVersion]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT payload FROM managed_artifact_versions WHERE artifact_id = ? ORDER BY json_extract(payload, '$.version_number') DESC",
                (artifact_id,),
            ).fetchall()
        return self._load_rows(rows, ManagedArtifactVersion)

    def save_memory_entry(self, entry: ProjectMemoryEntry) -> ProjectMemoryEntry:
        with self._connect() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO project_memory_entries (id, project_id, payload) VALUES (?, ?, ?)",
                (entry.id, entry.project_id, entry.model_dump_json()),
            )
        return entry

    def list_memory_entries(self, project_id: str) -> list[ProjectMemoryEntry]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT payload FROM project_memory_entries WHERE project_id = ? ORDER BY json_extract(payload, '$.updated_at') DESC",
                (project_id,),
            ).fetchall()
        return self._load_rows(rows, ProjectMemoryEntry)

    def save_timeline_event(self, event: ProjectTimelineEvent) -> ProjectTimelineEvent:
        with self._connect() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO project_timeline_events (id, project_id, payload) VALUES (?, ?, ?)",
                (event.id, event.project_id, event.model_dump_json()),
            )
        return event

    def list_timeline_events(self, project_id: str, *, limit: int = 20) -> list[ProjectTimelineEvent]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT payload FROM project_timeline_events WHERE project_id = ? ORDER BY json_extract(payload, '$.created_at') DESC LIMIT ?",
                (project_id, limit),
            ).fetchall()
        return self._load_rows(rows, ProjectTimelineEvent)

    def save_decision(self, decision: ProjectDecisionRequest) -> ProjectDecisionRequest:
        with self._connect() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO project_decision_requests (id, project_id, payload) VALUES (?, ?, ?)",
                (decision.id, decision.project_id, decision.model_dump_json()),
            )
        return decision

    def list_decisions(self, project_id: str, *, status: str | None = "pending") -> list[ProjectDecisionRequest]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT payload FROM project_decision_requests WHERE project_id = ? ORDER BY json_extract(payload, '$.created_at') DESC",
                (project_id,),
            ).fetchall()
        decisions = self._load_rows(rows, ProjectDecisionRequest)
        if status is None:
            return decisions
        return [decision for decision in decisions if decision.status == status]

    def get_decision(self, project_id: str, decision_id: str) -> ProjectDecisionRequest | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload FROM project_decision_requests WHERE id = ? AND project_id = ?",
                (decision_id, project_id),
            ).fetchone()
        if row is None:
            return None
        return ProjectDecisionRequest.model_validate_json(str(row["payload"]))

    def resolve_decision(self, project_id: str, decision_id: str, *, action_id: str, payload: dict[str, Any] | None = None) -> ProjectDecisionRequest:
        decision = self.get_decision(project_id, decision_id)
        if decision is None:
            raise KeyError(decision_id)
        resolved = decision.model_copy(
            update={
                "status": "resolved",
                "resolved_at": _now_iso(),
                "resolution": {"action_id": action_id, "payload": payload or {}},
            }
        )
        return self.save_decision(resolved)

    def build_project_dashboard(self, project_id: str) -> dict[str, Any]:
        project = self.get_project(project_id)
        if project is None:
            raise KeyError(project_id)
        plans = self.list_plans(project_id)
        phase_order: list[ProjectPhase] = ["头脑风暴", "设计", "计划", "实施", "完成"]
        current_index = phase_order.index(project.current_phase) if project.current_phase in phase_order else 0
        phase_track = [
            {"phase": phase, "status": "completed" if index < current_index else "current" if index == current_index else "pending"}
            for index, phase in enumerate(phase_order)
        ]
        plan_total = len(plans)
        plan_active = len(
            [
                plan
                for plan in plans
                if plan.status.lifecycle_status in {"ready", "running"}
            ]
        )
        current_primary_plan = next((plan for plan in plans if plan.id == project.current_primary_plan_id), None)
        recent_threads = self.list_threads(project_id)[:5]
        recent_timeline = self.list_timeline_events(project_id, limit=10)
        artifacts = self.list_artifacts(project_id)
        percent = int((current_index / max(len(phase_order) - 1, 1)) * 100)
        blockers = [
            {
                "plan_id": plan.id,
                "title": plan.title,
                "reason": plan.status.hold_reason or "blocked",
            }
            for plan in plans
            if plan.status.hold_status in {"blocked", "paused", "waiting_manual_start"}
        ][:5]
        pending_decisions = self.list_decisions(project_id, status="pending")
        next_action: dict[str, str] | None
        if project.current_primary_thread_id:
            next_action = {"type": "continue_primary_thread", "label": "继续当前主会话"}
        elif current_primary_plan is not None:
            next_action = {"type": "open_primary_plan", "label": "打开当前主实施计划"}
        else:
            next_action = {"type": "create_thread", "label": "新建项目会话"}
        return {
            "project": project.model_dump(mode="json"),
            "progress": {
                "phase_index": current_index + 1,
                "phase_count": len(phase_order),
                "percent": percent,
                "phase_track": phase_track,
            },
            "current_primary_plan": current_primary_plan.model_dump(mode="json") if current_primary_plan else None,
            "next_action": next_action,
            "blockers": blockers,
            "pending_confirmations": [decision.model_dump(mode="json") for decision in pending_decisions],
            "recent_threads": [thread.model_dump(mode="json") for thread in recent_threads],
            "recent_timeline": [event.model_dump(mode="json") for event in recent_timeline],
            "stats": {
                "plan_total": plan_total,
                "plan_active": plan_active,
                "thread_total": len(self.list_threads(project_id)),
                "managed_artifact_total": len(artifacts),
            },
        }

    def create_default_decision_actions(self, decision_type: str) -> list[ProjectDecisionAction]:
        mapping = {
            "confirm_plan_outcome": [
                ProjectDecisionAction(id="approve", label="确认完成"),
                ProjectDecisionAction(id="rework", label="转入返工"),
                ProjectDecisionAction(id="blocked", label="标记阻塞"),
            ],
            "create_rework_plan": [
                ProjectDecisionAction(id="approve", label="新建返工计划"),
                ProjectDecisionAction(id="dismiss", label="暂不处理"),
            ],
            "extract_long_term_memory": [
                ProjectDecisionAction(id="approve", label="写入长期记忆"),
                ProjectDecisionAction(id="dismiss", label="暂不提炼"),
            ],
            "extract_skill": [
                ProjectDecisionAction(id="approve", label="生成 Skill 候选"),
                ProjectDecisionAction(id="dismiss", label="暂不提炼"),
            ],
            "complete_project": [
                ProjectDecisionAction(id="approve", label="标记项目完成"),
                ProjectDecisionAction(id="dismiss", label="继续保持活跃"),
            ],
        }
        return mapping.get(decision_type, [ProjectDecisionAction(id="approve", label="确认"), ProjectDecisionAction(id="dismiss", label="取消")])

