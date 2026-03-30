from __future__ import annotations

from nion.memory_os.config_state import load_memory_os_state, save_memory_os_state
from nion.memory_os.contracts import ProviderFamilyMeta
from nion.memory_os.providers import MemoryOSState


class MemoryOSService:
    def list_provider_families(self) -> list[ProviderFamilyMeta]:
        supported_domains = [
            "notebook",
            "user_memory",
            "agent_memory",
            "autodream_journal",
            "identity",
            "soul",
        ]
        return [
            ProviderFamilyMeta(
                family="builtin",
                display_name="Built-in",
                supported_domains=supported_domains,
                supported_modes=["off", "sparse", "dense"],
            ),
            ProviderFamilyMeta(
                family="mem0",
                display_name="Mem0",
                supported_domains=supported_domains,
                supported_modes=["managed"],
            ),
            ProviderFamilyMeta(
                family="openviking",
                display_name="OpenViking",
                supported_domains=supported_domains,
                supported_modes=["embedded", "remote"],
            ),
        ]

    def get_state(self, *, base_dir=None) -> MemoryOSState:
        if base_dir is None:
            from nion.config.paths import get_paths

            return load_memory_os_state(get_paths().base_dir)
        return load_memory_os_state(base_dir)

    def update_state(
        self,
        state: MemoryOSState,
        *,
        base_dir=None,
    ) -> MemoryOSState:
        if base_dir is None:
            from nion.config.paths import get_paths

            base_dir = get_paths().base_dir
        save_memory_os_state(state, base_dir)
        return load_memory_os_state(base_dir)
