from __future__ import annotations


class BuiltinMemoryProviderFamily:
    family = "builtin"


class BuiltinMemoryProvider:
    def __init__(self, base_dir=None):
        self._base_dir = base_dir

    def get_memory(self) -> dict:
        if self._base_dir is None:
            return self._storage().load()
        return self._load_from_base_dir()

    def save_memory(self, payload: dict) -> bool:
        if self._base_dir is None:
            return self._storage().save(payload)
        return self._save_to_base_dir(payload)

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

    def on_after_chat(self, *, thread_id, messages, agent_name=None):
        from nion.agents.memory.queue import get_memory_queue

        queue = get_memory_queue()
        queue.add(thread_id=thread_id, messages=messages, agent_name=agent_name)

    def _memory_file(self):
        from pathlib import Path

        return Path(self._base_dir) / "memory.json"

    def _load_from_base_dir(self) -> dict:
        import json

        file_path = self._memory_file()
        if not file_path.exists():
            return self._create_empty_memory()
        try:
            with open(file_path, encoding="utf-8") as handle:
                return json.load(handle)
        except (json.JSONDecodeError, OSError):
            return self._create_empty_memory()

    def _save_to_base_dir(self, payload: dict) -> bool:
        import json
        from datetime import datetime

        file_path = self._memory_file()
        try:
            file_path.parent.mkdir(parents=True, exist_ok=True)
            payload["lastUpdated"] = datetime.utcnow().isoformat() + "Z"
            temp_path = file_path.with_suffix(".tmp")
            with open(temp_path, "w", encoding="utf-8") as handle:
                json.dump(payload, handle, indent=2, ensure_ascii=False)
            temp_path.replace(file_path)
            return True
        except OSError:
            return False

    def _storage(self):
        from nion.agents.memory.storage import FileMemoryStorage

        return FileMemoryStorage()

    def _create_empty_memory(self):
        from nion.agents.memory.storage import create_empty_memory

        return create_empty_memory()
