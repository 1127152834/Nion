from __future__ import annotations

from pathlib import Path

from nion.memory_os.openviking_models import OpenVikingProviderConfig
from nion.memory_os.openviking_remote_client import OpenVikingRemoteClient


class OpenVikingMemoryProviderFamily:
    family = "openviking"


class OpenVikingMemoryProvider:
    def __init__(self, *, config: dict | None = None, base_dir=None):
        self._config = OpenVikingProviderConfig(**(config or {"mode": "embedded"}))
        self._base_dir = base_dir

    def get_memory(self) -> dict:
        if self._config.mode == "remote" and self._config.base_url:
            return OpenVikingRemoteClient(
                base_url=self._config.base_url,
                api_key=self._config.api_key,
            ).get_memory()
        return self._create_empty_memory()

    def supported_domains(self) -> list[str]:
        return [
            "notebook",
            "user_memory",
            "agent_memory",
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

    def _create_empty_memory(self):
        from nion.agents.memory.storage import create_empty_memory

        return create_empty_memory()
