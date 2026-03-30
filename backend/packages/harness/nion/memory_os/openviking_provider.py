from __future__ import annotations

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

    def _create_empty_memory(self):
        from nion.agents.memory.storage import create_empty_memory

        return create_empty_memory()
