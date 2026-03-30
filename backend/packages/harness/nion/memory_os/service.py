from __future__ import annotations

import json
from pathlib import Path

from nion.memory_os.builtin_provider import BuiltinMemoryProvider
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

    def get_memory_payload(self, *, agent_name=None, base_dir=None) -> dict:
        provider = self.resolve_active_memory_provider(base_dir=base_dir)
        return provider.get_memory()  # type: ignore[no-any-return]

    def reload_memory_payload(self, *, agent_name=None, base_dir=None) -> dict:
        provider = self.resolve_active_memory_provider(base_dir=base_dir)
        return provider.get_memory()  # type: ignore[no-any-return]

    def clear_memory_payload(self, *, agent_name=None, base_dir=None) -> dict:
        provider = self.resolve_active_memory_provider(base_dir=base_dir)
        return provider.clear_memory()  # type: ignore[no-any-return]

    def delete_memory_fact(
        self,
        fact_id: str,
        *,
        agent_name=None,
        base_dir=None,
    ) -> dict:
        provider = self.resolve_active_memory_provider(base_dir=base_dir)
        return provider.delete_fact(fact_id)  # type: ignore[no-any-return]

    def resolve_active_memory_provider(self, *, base_dir=None):
        if base_dir is None:
            from nion.config.paths import get_paths

            base_dir = get_paths().base_dir
        state = self.get_state(base_dir=base_dir)
        if state.active_provider_family == "builtin":
            return BuiltinMemoryProvider(base_dir=base_dir)
        return BuiltinMemoryProvider(base_dir=base_dir)

    def import_legacy_memory_file(self, *, base_dir=None) -> bool:
        if base_dir is None:
            from nion.config.paths import get_paths

            base_dir = get_paths().base_dir

        legacy_path = Path(base_dir) / "memory.json"
        if not legacy_path.exists():
            return False

        payload = json.loads(legacy_path.read_text(encoding="utf-8"))
        provider = self.resolve_active_memory_provider(base_dir=base_dir)
        provider.save_memory(payload)
        return True


def resolve_active_memory_provider(*, base_dir=None):
    return MemoryOSService().resolve_active_memory_provider(base_dir=base_dir)
