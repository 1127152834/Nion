import sqlite3
from collections.abc import Iterable
from pathlib import Path

from nion.automation.models import (
    AutomationApproval,
    AutomationAuditEvent,
    AutomationJob,
    AutomationRun,
    AutomationTemplate,
)


class AutomationRepository:
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
                CREATE TABLE IF NOT EXISTS automation_jobs (
                    id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS automation_runs (
                    id TEXT PRIMARY KEY,
                    job_id TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    started_at TEXT NOT NULL,
                    finished_at TEXT,
                    status TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS automation_job_claims (
                    job_id TEXT PRIMARY KEY,
                    run_id TEXT NOT NULL,
                    claimed_at TEXT NOT NULL,
                    claimed_until TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS automation_templates (
                    id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL,
                    scope TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS automation_approvals (
                    id TEXT PRIMARY KEY,
                    job_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    payload TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS automation_audit_events (
                    id TEXT PRIMARY KEY,
                    job_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    payload TEXT NOT NULL
                )
                """
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_automation_runs_job_id ON automation_runs(job_id)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_automation_runs_started_at ON automation_runs(started_at)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_automation_job_claims_claimed_until ON automation_job_claims(claimed_until)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_automation_templates_scope ON automation_templates(scope)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_automation_approvals_job_id ON automation_approvals(job_id)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_automation_audit_events_job_id ON automation_audit_events(job_id)"
            )

    @staticmethod
    def _serialize(model: AutomationJob | AutomationRun | AutomationTemplate | AutomationApproval | AutomationAuditEvent) -> str:
        return model.model_dump_json()

    @staticmethod
    def _deserialize_job(payload: str) -> AutomationJob:
        return AutomationJob.model_validate_json(payload)

    @staticmethod
    def _deserialize_run(payload: str) -> AutomationRun:
        return AutomationRun.model_validate_json(payload)

    @staticmethod
    def _deserialize_template(payload: str) -> AutomationTemplate:
        return AutomationTemplate.model_validate_json(payload)

    @staticmethod
    def _deserialize_approval(payload: str) -> AutomationApproval:
        return AutomationApproval.model_validate_json(payload)

    @staticmethod
    def _deserialize_audit_event(payload: str) -> AutomationAuditEvent:
        return AutomationAuditEvent.model_validate_json(payload)

    def save_job(self, job: AutomationJob) -> AutomationJob:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO automation_jobs (id, payload, created_at, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    payload = excluded.payload,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at
                """,
                (job.id, self._serialize(job), job.created_at, job.updated_at),
            )
        return job

    def get_job(self, job_id: str) -> AutomationJob | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload FROM automation_jobs WHERE id = ?",
                (job_id,),
            ).fetchone()
        if row is None:
            return None
        return self._deserialize_job(row["payload"])

    def list_jobs(self) -> list[AutomationJob]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT payload FROM automation_jobs ORDER BY created_at ASC, id ASC"
            ).fetchall()
        return [self._deserialize_job(row["payload"]) for row in rows]

    def delete_job(self, job_id: str) -> bool:
        with self._connect() as connection:
            cursor = connection.execute(
                "DELETE FROM automation_jobs WHERE id = ?",
                (job_id,),
            )
        return cursor.rowcount > 0

    def save_run(self, run: AutomationRun) -> AutomationRun:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO automation_runs (id, job_id, payload, started_at, finished_at, status)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    job_id = excluded.job_id,
                    payload = excluded.payload,
                    started_at = excluded.started_at,
                    finished_at = excluded.finished_at,
                    status = excluded.status
                """,
                (
                    run.id,
                    run.job_id,
                    self._serialize(run),
                    run.started_at,
                    run.finished_at,
                    run.status,
                ),
            )
        return run

    def get_run(self, run_id: str) -> AutomationRun | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload FROM automation_runs WHERE id = ?",
                (run_id,),
            ).fetchone()
        if row is None:
            return None
        return self._deserialize_run(row["payload"])

    def list_runs(self, *, job_id: str | None = None) -> list[AutomationRun]:
        query = "SELECT payload FROM automation_runs"
        params: tuple[str, ...] = ()
        if job_id is not None:
            query += " WHERE job_id = ?"
            params = (job_id,)
        query += " ORDER BY started_at DESC, id DESC"
        with self._connect() as connection:
            rows = connection.execute(query, params).fetchall()
        return [self._deserialize_run(row["payload"]) for row in rows]

    def save_jobs(self, jobs: Iterable[AutomationJob]) -> list[AutomationJob]:
        saved = []
        for job in jobs:
            saved.append(self.save_job(job))
        return saved

    def claim_job(
        self,
        job_id: str,
        *,
        run_id: str,
        claimed_at: str,
        claimed_until: str,
    ) -> bool:
        with self._connect() as connection:
            connection.execute(
                "DELETE FROM automation_job_claims WHERE job_id = ? AND claimed_until <= ?",
                (job_id, claimed_at),
            )
            cursor = connection.execute(
                """
                INSERT OR IGNORE INTO automation_job_claims (job_id, run_id, claimed_at, claimed_until)
                VALUES (?, ?, ?, ?)
                """,
                (job_id, run_id, claimed_at, claimed_until),
            )
        return cursor.rowcount > 0

    def release_job_claim(self, job_id: str) -> None:
        with self._connect() as connection:
            connection.execute(
                "DELETE FROM automation_job_claims WHERE job_id = ?",
                (job_id,),
            )

    def save_template(self, template: AutomationTemplate) -> AutomationTemplate:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO automation_templates (id, payload, scope)
                VALUES (?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    payload = excluded.payload,
                    scope = excluded.scope
                """,
                (template.id, self._serialize(template), template.scope),
            )
        return template

    def list_templates(self, *, scope: str | None = None) -> list[AutomationTemplate]:
        query = "SELECT payload FROM automation_templates"
        params: tuple[str, ...] = ()
        if scope is not None:
            query += " WHERE scope = ?"
            params = (scope,)
        query += " ORDER BY id ASC"
        with self._connect() as connection:
            rows = connection.execute(query, params).fetchall()
        return [self._deserialize_template(row["payload"]) for row in rows]

    def get_template(self, template_id: str) -> AutomationTemplate | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload FROM automation_templates WHERE id = ?",
                (template_id,),
            ).fetchone()
        if row is None:
            return None
        return self._deserialize_template(row["payload"])

    def save_approval(self, approval: AutomationApproval) -> AutomationApproval:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO automation_approvals (id, job_id, status, payload)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    job_id = excluded.job_id,
                    status = excluded.status,
                    payload = excluded.payload
                """,
                (approval.id, approval.job_id, approval.status, self._serialize(approval)),
            )
        return approval

    def get_approval(self, approval_id: str) -> AutomationApproval | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload FROM automation_approvals WHERE id = ?",
                (approval_id,),
            ).fetchone()
        if row is None:
            return None
        return self._deserialize_approval(row["payload"])

    def list_approvals(self) -> list[AutomationApproval]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT payload FROM automation_approvals ORDER BY id ASC"
            ).fetchall()
        return [self._deserialize_approval(row["payload"]) for row in rows]

    def save_audit_event(self, event: AutomationAuditEvent) -> AutomationAuditEvent:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO automation_audit_events (id, job_id, action, created_at, payload)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    job_id = excluded.job_id,
                    action = excluded.action,
                    created_at = excluded.created_at,
                    payload = excluded.payload
                """,
                (event.id, event.job_id, event.action, event.created_at, self._serialize(event)),
            )
        return event

    def list_audit_events(self) -> list[AutomationAuditEvent]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT payload FROM automation_audit_events ORDER BY created_at ASC, id ASC"
            ).fetchall()
        return [self._deserialize_audit_event(row["payload"]) for row in rows]
