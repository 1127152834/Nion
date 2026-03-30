from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from nion.compaction.models import CompactionResult, MemoryUsageResponse
from nion.compaction.store import CompactionStore
from nion.config.paths import Paths
from nion.memory_payloads import create_empty_memory_payload
from nion.memory_os.builtin_provider import BuiltinMemoryProvider


class CompactionService:
    def __init__(self, *, base_dir: str | Path | None = None) -> None:
        self._paths = Paths(base_dir=base_dir)
        self._store = CompactionStore(self._paths.telemetry_db_file)
        self._memory_provider = BuiltinMemoryProvider(base_dir=base_dir)

    def compact(self, *, ratio: float, decay_days: int = 0) -> dict[str, object]:
        payload = self._memory_provider.get_memory()
        facts = payload.get("facts", [])

        seen: set[str] = set()
        compacted_facts = []
        for fact in facts:
            content = str(fact.get("content", "")).strip()
            if not content:
                continue
            if content in seen:
                continue
            seen.add(content)
            compacted_facts.append(fact)

        compacted_count = len(facts) - len(compacted_facts)
        payload["facts"] = compacted_facts
        self._memory_provider.save_memory(payload)

        now = datetime.now(UTC).isoformat()
        summary = (
            f"Compacted {compacted_count} duplicate facts"
            if compacted_count > 0
            else "Compaction completed with no duplicate facts removed"
        )
        self._store.append_log(
            status="succeeded",
            summary=summary,
            message_count=len(facts),
            started_at=now,
            completed_at=now,
            usage={"ratio_basis": int(ratio * 100), "decay_days": decay_days},
        )

        return CompactionResult(
            status="succeeded",
            summary=summary,
            compacted_fact_count=compacted_count,
        ).model_dump()

    def list_logs(self, *, limit: int = 50, offset: int = 0):
        return self._store.list_logs(limit=limit, offset=offset)

    def delete_logs(self) -> None:
        self._store.delete_logs()

    def usage(self) -> dict[str, object]:
        payload = self._memory_provider.get_memory()
        facts = payload.get("facts", [])
        total_text_bytes = sum(len(str(item.get("content", "")).encode("utf-8")) for item in facts)
        count = len(facts)
        return MemoryUsageResponse(
            count=count,
            total_text_bytes=total_text_bytes,
            estimated_storage_bytes=total_text_bytes,
            avg_text_bytes=(total_text_bytes // count) if count else 0,
        ).model_dump()

    def status(self) -> dict[str, object]:
        payload = self._memory_provider.get_memory()
        facts = payload.get("facts", [])
        logs = self._store.count_logs()
        return {
            "provider": "builtin",
            "facts_count": len(facts),
            "compaction_logs_count": logs,
        }
