from __future__ import annotations

import json
from collections.abc import Mapping
from pathlib import Path
from typing import Any

from nion.memory_payloads import create_empty_memory_payload


class Mem0MemoryProviderFamily:
    family = "mem0"


class Mem0MemoryProvider:
    def __init__(self, *, config: dict | None = None, base_dir=None):
        self._base_dir = Path(base_dir) if base_dir is not None else None
        self._config = dict(config or {"mode": "managed"})

    def get_memory(self) -> dict:
        if self._base_dir is None:
            return self._create_empty_memory()
        if not self._memory_file().exists():
            return self._create_empty_memory()

        try:
            payload = json.loads(self._memory_file().read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return self._create_empty_memory()

        return self._normalize_memory_payload(payload)

    def save_memory(self, payload: dict) -> bool:
        if self._base_dir is None:
            return False

        try:
            normalized = self._normalize_memory_payload(payload)
            self._memory_file().parent.mkdir(parents=True, exist_ok=True)
            self._memory_file().write_text(
                json.dumps(normalized, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            return True
        except OSError:
            return False

    def clear_memory(self) -> dict:
        payload = self._create_empty_memory()
        self.save_memory(payload)
        return payload

    def delete_fact(self, fact_id: str) -> dict:
        payload = self.get_memory()
        payload["facts"] = [
            fact for fact in payload.get("facts", []) if fact.get("id") != fact_id
        ]
        self.save_memory(payload)
        return payload

    def status(self) -> dict:
        payload = self.get_memory()
        fact_count = len(payload.get("facts", []))
        return {
            "provider": "mem0",
            "runtime_mode": str(self._config.get("mode", "managed")),
            "health": "degraded",
            "storage_kind": "local_compatibility",
            "facts_count": fact_count,
            "summary": (
                "Mem0 compatibility runtime is active using local file storage."
            ),
            "capabilities": {
                "compact": "unsupported",
                "rebuild": "unsupported",
            },
        }

    def usage(self) -> dict:
        payload = self.get_memory()
        serialized = json.dumps(payload, ensure_ascii=False)
        return {
            "provider": "mem0",
            "count": len(payload.get("facts", [])),
            "estimated_storage_bytes": len(serialized.encode("utf-8")),
            "storage_kind": "local_compatibility",
            "summary": "Usage estimated from local compatibility storage.",
        }

    def compact(self, *, ratio: float, decay_days: int = 0) -> dict:
        return {
            "provider": "mem0",
            "supported": False,
            "operation": "compact",
            "reason": "Mem0 compatibility runtime does not support compaction.",
        }

    def rebuild(self) -> dict:
        return {
            "provider": "mem0",
            "supported": False,
            "operation": "rebuild",
            "reason": "Mem0 compatibility runtime does not support rebuild.",
        }

    def _memory_file(self) -> Path:
        assert self._base_dir is not None
        return self._base_dir / "mem0-memory.json"

    def _create_empty_memory(self) -> dict[str, Any]:
        return create_empty_memory_payload()

    def _normalize_memory_payload(self, payload: Any) -> dict[str, Any]:
        normalized = self._create_empty_memory()
        if not isinstance(payload, Mapping):
            return normalized

        if isinstance(payload.get("version"), str):
            normalized["version"] = payload["version"]
        if isinstance(payload.get("lastUpdated"), str):
            normalized["lastUpdated"] = payload["lastUpdated"]

        for section in ("user", "history"):
            section_payload = payload.get(section)
            if not isinstance(section_payload, Mapping):
                continue
            for key, default_value in normalized[section].items():
                candidate = section_payload.get(key)
                if not isinstance(candidate, Mapping):
                    continue
                normalized[section][key] = {
                    "summary": str(candidate.get("summary", default_value["summary"])),
                    "updatedAt": str(
                        candidate.get("updatedAt", default_value["updatedAt"])
                    ),
                }

        facts = payload.get("facts")
        normalized["facts"] = facts if isinstance(facts, list) else []
        return normalized
