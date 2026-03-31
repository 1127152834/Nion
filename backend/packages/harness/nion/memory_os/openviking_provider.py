from __future__ import annotations

import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

from nion.config.paths import Paths
from nion.memory_os.openviking_models import OpenVikingProviderConfig
from nion.memory_os.openviking_remote_client import OpenVikingRemoteClient
from nion.memory_payloads import create_empty_memory_payload


class OpenVikingMemoryProviderFamily:
    family = "openviking"


def _create_empty_memory() -> dict:
    return create_empty_memory_payload()


def _normalize_memory_payload(payload: dict | None) -> dict:
    normalized = _create_empty_memory()
    if not isinstance(payload, dict):
        return normalized

    normalized["version"] = payload.get("version", normalized["version"])
    normalized["lastUpdated"] = payload.get("lastUpdated", normalized["lastUpdated"])

    for section in ("user", "history"):
        section_payload = payload.get(section, {})
        if not isinstance(section_payload, dict):
            continue
        for key, default_value in normalized[section].items():
            value = section_payload.get(key, {})
            if isinstance(value, dict):
                normalized[section][key] = {
                    "summary": value.get("summary", default_value.get("summary", "")),
                    "updatedAt": value.get("updatedAt", default_value.get("updatedAt", "")),
                }

    facts = payload.get("facts", [])
    normalized["facts"] = facts if isinstance(facts, list) else []
    return normalized


class OpenVikingMemoryProvider:
    def __init__(self, *, config: dict | None = None, base_dir=None):
        self._config = OpenVikingProviderConfig(**(config or {"mode": "embedded"}))
        self._base_dir = base_dir
        self._paths = Paths(base_dir=base_dir)
        self._queue: Any = None

    def get_memory(self) -> dict:
        return self._storage().load()

    def save_memory(self, payload: dict) -> bool:
        return self._storage().save(payload)

    def supported_domains(self) -> list[str]:
        return [
            "notebook",
            "user_memory",
            "agent_memory",
            "self_maintenance_journal",
            "autodream_journal",
        ]

    def list_notebook_resources(self) -> list[dict]:
        from nion.config.paths import Paths
        from nion.openviking.resource_store import OpenVikingResourceStore

        paths = Paths(base_dir=self._base_dir)
        store = OpenVikingResourceStore(paths.openviking_resources_db_file)
        return [item.model_dump() for item in store.list_resources()]

    def list_autodream_entries(self) -> list[dict]:
        from nion.config.paths import Paths

        paths = Paths(base_dir=self._base_dir)
        if not paths.autodream_journal_dir.exists():
            return []

        items: list[dict] = []
        for path in sorted(paths.autodream_journal_dir.rglob("*.md")):
            dream_id = Path(path).stem
            items.append(
                {
                    "dream_id": dream_id,
                    "path": str(path),
                }
            )
        return items

    def clear_memory(self) -> dict:
        from nion.agents.memory.updater import clear_memory_data

        return clear_memory_data(memory_storage=self._storage())

    def delete_fact(self, fact_id: str) -> dict:
        from nion.agents.memory.updater import delete_memory_fact

        return delete_memory_fact(fact_id, memory_storage=self._storage())

    def on_after_chat(self, *, thread_id, messages, agent_name=None):
        queue = self._get_queue()
        queue.add(thread_id=thread_id, messages=messages, agent_name=agent_name)

    def compact(self, *, ratio: float, decay_days: int = 0) -> dict:
        from nion.compaction.service import CompactionService

        return CompactionService(base_dir=self._base_dir).compact(
            ratio=ratio,
            decay_days=decay_days,
        )

    def usage(self) -> dict:
        from nion.compaction.service import CompactionService

        usage = CompactionService(base_dir=self._base_dir).usage()
        usage["provider"] = "openviking"
        return usage

    def status(self) -> dict:
        from nion.compaction.service import CompactionService
        from nion.rebuild.service import RebuildService

        status = CompactionService(base_dir=self._base_dir).status()
        status.update(RebuildService(base_dir=self._base_dir).status())
        status["provider"] = "openviking"
        return status

    def rebuild(self) -> dict:
        from nion.rebuild.service import RebuildService

        result = RebuildService(base_dir=self._base_dir).rebuild()
        result["provider"] = "openviking"
        return result

    def _create_empty_memory(self):
        return _create_empty_memory()

    def _memory_state_file(self) -> Path:
        return self._paths.openviking_dir / "memory-state.json"

    def _storage(self):
        if self._config.mode == "remote" and self._config.base_url:
            return OpenVikingRemoteMemoryStorage(
                client=self._remote_client(),
                normalizer=_normalize_memory_payload,
            )

        return OpenVikingFileMemoryStorage(
            file_path=self._memory_state_file(),
            normalizer=_normalize_memory_payload,
        )

    def _get_queue(self):
        from nion.agents.memory.queue import MemoryUpdateQueue
        from nion.agents.memory.updater import MemoryUpdater

        if self._queue is None:
            self._queue = MemoryUpdateQueue(
                updater_factory=lambda: MemoryUpdater(memory_storage=self._storage())
            )
        return self._queue

    def _remote_client(self) -> OpenVikingRemoteClient:
        return OpenVikingRemoteClient(
            base_url=self._config.base_url or "",
            api_key=self._config.api_key,
        )


class OpenVikingFileMemoryStorage:
    def __init__(self, *, file_path: Path, normalizer: Callable[[dict | None], dict]):
        self._file_path = file_path
        self._normalizer = normalizer

    def load(self, agent_name: str | None = None) -> dict:
        if not self._file_path.exists():
            return self._create_empty_memory()

        try:
            return self._normalizer(json.loads(self._file_path.read_text(encoding="utf-8")))
        except (json.JSONDecodeError, OSError):
            return self._create_empty_memory()

    def reload(self, agent_name: str | None = None) -> dict:
        return self.load(agent_name)

    def save(self, memory_data: dict, agent_name: str | None = None) -> bool:
        try:
            self._file_path.parent.mkdir(parents=True, exist_ok=True)
            payload = self._normalizer(memory_data)
            self._file_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
            return True
        except OSError:
            return False

    def _create_empty_memory(self) -> dict:
        return _create_empty_memory()


class OpenVikingRemoteMemoryStorage:
    def __init__(self, *, client: OpenVikingRemoteClient, normalizer: Callable[[dict | None], dict]):
        self._client = client
        self._normalizer = normalizer

    def load(self, agent_name: str | None = None) -> dict:
        return self._normalizer(self._client.get_memory())

    def reload(self, agent_name: str | None = None) -> dict:
        return self.load(agent_name)

    def save(self, memory_data: dict, agent_name: str | None = None) -> bool:
        return bool(self._client.save_memory(self._normalizer(memory_data)))
