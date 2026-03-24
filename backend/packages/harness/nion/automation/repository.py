import sqlite3
from collections.abc import Iterable
from pathlib import Path

from nion.automation.models import AutomationJob, AutomationRun


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
                "CREATE INDEX IF NOT EXISTS idx_automation_runs_job_id ON automation_runs(job_id)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_automation_runs_started_at ON automation_runs(started_at)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_automation_job_claims_claimed_until ON automation_job_claims(claimed_until)"
            )

    @staticmethod
    def _serialize(model: AutomationJob | AutomationRun) -> str:
        return model.model_dump_json()

    @staticmethod
    def _deserialize_job(payload: str) -> AutomationJob:
        return AutomationJob.model_validate_json(payload)

    @staticmethod
    def _deserialize_run(payload: str) -> AutomationRun:
        return AutomationRun.model_validate_json(payload)

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
