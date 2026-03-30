from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from nion.config.paths import Paths

from .models import ThreadRecord, ThreadScope, ThreadValues


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


class ThreadRepository:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._paths = Paths(base_dir=base_dir)

    def _metadata_path(self, thread_id: str) -> Path:
        return self._paths.thread_dir(thread_id) / "thread.json"

    def _write(self, record: ThreadRecord) -> ThreadRecord:
        path = self._metadata_path(record.thread_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(record.model_dump_json(indent=2), encoding="utf-8")
        return record

    def _read(self, thread_id: str) -> ThreadRecord | None:
        path = self._metadata_path(thread_id)
        if not path.exists():
            return None
        return ThreadRecord.model_validate_json(path.read_text(encoding="utf-8"))

    def upsert_thread(
        self,
        thread_id: str,
        *,
        title: str | None = None,
        agent_name: str = "lead_agent",
        values: dict[str, Any] | None = None,
    ) -> ThreadRecord:
        existing = self._read(thread_id)
        now = _now_iso()
        merged_values = existing.values.model_dump() if existing else ThreadValues().model_dump()
        if title is not None:
            merged_values["title"] = title
        if values:
            merged_values.update(values)
        record = ThreadRecord(
            thread_id=thread_id,
            agent_name=agent_name if existing is None else existing.agent_name,
            created_at=existing.created_at if existing else now,
            updated_at=now,
            values=ThreadValues.model_validate(merged_values),
            deleted=False,
        )
        return self._write(record)

    def get_thread(self, thread_id: str) -> ThreadRecord | None:
        record = self._read(thread_id)
        if record is None or record.deleted:
            return None
        return record

    def update_state(self, thread_id: str, values: dict[str, Any]) -> ThreadRecord:
        existing = self._read(thread_id)
        if existing is None:
            return self.upsert_thread(thread_id, values=values)
        merged_values = existing.values.model_dump()
        merged_values.update(values)
        updated = existing.model_copy(
            update={
                "updated_at": _now_iso(),
                "values": ThreadValues.model_validate(merged_values),
                "deleted": False,
            }
        )
        return self._write(updated)

    def notebook_assistant_thread_id(self, *, note_id: str, session_id: str) -> str:
        digest = hashlib.sha256(f"{note_id}\0{session_id}".encode("utf-8")).hexdigest()[:16]
        return f"notebook-assistant-{digest}"

    def delete_thread(self, thread_id: str) -> None:
        self._paths.delete_thread_dir(thread_id)

    def search(
        self,
        *,
        thread_id: str | None = None,
        scope: ThreadScope | str = "general",
        limit: int = 50,
        offset: int = 0,
        sort_by: str = "updated_at",
        sort_order: str = "desc",
    ) -> list[dict[str, Any]]:
        if thread_id:
            record = self.get_thread(thread_id)
            if record is None:
                return []
            if scope != "all" and record.values.scope != scope:
                return []
            return [record.model_dump()]

        threads_root = self._paths.base_dir / "threads"
        if not threads_root.exists():
            return []

        records: list[ThreadRecord] = []
        for metadata_path in threads_root.glob("*/thread.json"):
            try:
                record = ThreadRecord.model_validate_json(metadata_path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError, ValueError):
                continue
            if record.deleted:
                continue
            if scope != "all" and record.values.scope != scope:
                continue
            records.append(record)

        reverse = sort_order != "asc"
        if sort_by not in {"updated_at", "created_at"}:
            sort_by = "updated_at"
        records.sort(key=lambda record: getattr(record, sort_by), reverse=reverse)

        sliced = records[offset : offset + limit]
        return [record.model_dump() for record in sliced]
