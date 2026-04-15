import sqlite3
from pathlib import Path
from typing import TypeVar

from pydantic import BaseModel

from nion.local_actions.models import (
    LocalActionExecutionRecord,
    LocalActionGoal,
    LocalActionPlan,
)

T = TypeVar("T", bound=BaseModel)


class LocalActionsRepository:
    def __init__(self, db_path: str | Path):
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    @property
    def db_path(self) -> Path:
        return self._db_path

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS local_action_goals (
                    goal_id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    status TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS local_action_plans (
                    plan_id TEXT PRIMARY KEY,
                    goal_id TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    risk_level TEXT NOT NULL,
                    requires_review INTEGER NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS local_action_executions (
                    execution_id TEXT PRIMARY KEY,
                    goal_id TEXT NOT NULL,
                    plan_id TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    started_at TEXT NOT NULL,
                    finished_at TEXT,
                    permission_mode TEXT NOT NULL,
                    approval_status TEXT NOT NULL
                )
                """
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_local_action_plans_goal_id ON local_action_plans(goal_id)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_local_action_executions_goal_id ON local_action_executions(goal_id)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_local_action_executions_plan_id ON local_action_executions(plan_id)"
            )

    @staticmethod
    def _serialize(model: BaseModel) -> str:
        return model.model_dump_json()

    @staticmethod
    def _deserialize(payload: str, model_type: type[T]) -> T | None:
        return model_type.model_validate_json(payload)

    def save_goal(self, goal: LocalActionGoal) -> LocalActionGoal:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO local_action_goals (goal_id, payload, created_at, status)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(goal_id) DO UPDATE SET
                    payload = excluded.payload,
                    created_at = excluded.created_at,
                    status = excluded.status
                """,
                (goal.goal_id, self._serialize(goal), goal.created_at, goal.status),
            )
        return goal

    def get_goal(self, goal_id: str) -> LocalActionGoal | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload FROM local_action_goals WHERE goal_id = ?",
                (goal_id,),
            ).fetchone()
        if row is None:
            return None
        return self._deserialize(row["payload"], LocalActionGoal)

    def save_plan(self, plan: LocalActionPlan) -> LocalActionPlan:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO local_action_plans (plan_id, goal_id, payload, created_at, risk_level, requires_review)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(plan_id) DO UPDATE SET
                    goal_id = excluded.goal_id,
                    payload = excluded.payload,
                    created_at = excluded.created_at,
                    risk_level = excluded.risk_level,
                    requires_review = excluded.requires_review
                """,
                (
                    plan.plan_id,
                    plan.goal_id,
                    self._serialize(plan),
                    plan.created_at,
                    plan.risk_level,
                    int(plan.requires_review),
                ),
            )
        return plan

    def get_plan(self, plan_id: str) -> LocalActionPlan | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload FROM local_action_plans WHERE plan_id = ?",
                (plan_id,),
            ).fetchone()
        if row is None:
            return None
        return self._deserialize(row["payload"], LocalActionPlan)

    def save_execution(
        self, execution: LocalActionExecutionRecord
    ) -> LocalActionExecutionRecord:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO local_action_executions (
                    execution_id,
                    goal_id,
                    plan_id,
                    payload,
                    started_at,
                    finished_at,
                    permission_mode,
                    approval_status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(execution_id) DO UPDATE SET
                    goal_id = excluded.goal_id,
                    plan_id = excluded.plan_id,
                    payload = excluded.payload,
                    started_at = excluded.started_at,
                    finished_at = excluded.finished_at,
                    permission_mode = excluded.permission_mode,
                    approval_status = excluded.approval_status
                """,
                (
                    execution.execution_id,
                    execution.goal_id,
                    execution.plan_id,
                    self._serialize(execution),
                    execution.started_at,
                    execution.finished_at,
                    execution.permission_mode,
                    execution.approval_status,
                ),
            )
        return execution

    def get_execution(self, execution_id: str) -> LocalActionExecutionRecord | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload FROM local_action_executions WHERE execution_id = ?",
                (execution_id,),
            ).fetchone()
        if row is None:
            return None
        return self._deserialize(row["payload"], LocalActionExecutionRecord)

    def list_recent_executions(
        self,
        *,
        limit: int = 20,
    ) -> list[LocalActionExecutionRecord]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT payload
                FROM local_action_executions
                ORDER BY started_at DESC, execution_id DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [
            self._deserialize(row["payload"], LocalActionExecutionRecord)
            for row in rows
        ]
