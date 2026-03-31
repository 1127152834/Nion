from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from nion.memory_os.builtin_provider import BuiltinMemoryProvider
from nion.memory_os.config_state import load_memory_os_state, save_memory_os_state
from nion.memory_os.contracts import (
    ProviderCapabilityMatrix,
    ProviderFamilyMeta,
    ProviderHealth,
)
from nion.memory_os.mem0_provider import Mem0MemoryProvider
from nion.memory_os.openviking_provider import OpenVikingMemoryProvider
from nion.memory_os.providers import (
    MemoryOSRuntimeState,
    MemoryOSState,
    ProviderInstanceConfig,
    ProviderInstanceState,
)

SUPPORTED_DOMAINS = [
    "notebook",
    "user_memory",
    "agent_memory",
    "self_maintenance_journal",
    "autodream_journal",
    "identity",
    "soul",
]

FAMILY_METADATA: dict[str, ProviderFamilyMeta] = {
    "builtin": ProviderFamilyMeta(
        family="builtin",
        display_name="Built-in",
        supported_domains=SUPPORTED_DOMAINS,
        supported_modes=["off", "sparse", "dense"],
        capabilities=ProviderCapabilityMatrix(
            memory_crud="supported",
            memory_search="partial",
            compact="supported",
            rebuild="supported",
            usage="supported",
            runtime_status="supported",
        ),
    ),
    "mem0": ProviderFamilyMeta(
        family="mem0",
        display_name="Mem0",
        supported_domains=SUPPORTED_DOMAINS,
        supported_modes=["managed"],
        capabilities=ProviderCapabilityMatrix(
            memory_crud="partial",
            memory_search="partial",
            compact="unsupported",
            rebuild="unsupported",
            usage="supported",
            runtime_status="supported",
        ),
    ),
    "openviking": ProviderFamilyMeta(
        family="openviking",
        display_name="OpenViking",
        supported_domains=SUPPORTED_DOMAINS,
        supported_modes=["embedded", "remote"],
        capabilities=ProviderCapabilityMatrix(
            memory_crud="supported",
            memory_search="partial",
            compact="supported",
            rebuild="supported",
            usage="supported",
            runtime_status="supported",
            notebook_resources="supported",
            autodream_entries="supported",
        ),
    ),
}


class MemoryOSService:
    def list_provider_families(self) -> list[ProviderFamilyMeta]:
        return list(FAMILY_METADATA.values())

    def get_state(self, *, base_dir=None) -> MemoryOSRuntimeState:
        if base_dir is None:
            from nion.config.paths import get_paths

            base_dir = get_paths().base_dir

        stored_state = load_memory_os_state(base_dir)
        return MemoryOSRuntimeState(
            active_provider_family=stored_state.active_provider_family,
            active_provider_id=stored_state.active_provider_id,
            providers=[
                self._build_provider_instance_state(
                    provider,
                    is_active=(
                        provider.family == stored_state.active_provider_family
                        and provider.id == stored_state.active_provider_id
                    ),
                    base_dir=base_dir,
                )
                for provider in stored_state.providers
            ],
        )

    def update_state(
        self,
        state: MemoryOSState | MemoryOSRuntimeState,
        *,
        base_dir=None,
    ) -> MemoryOSRuntimeState:
        if base_dir is None:
            from nion.config.paths import get_paths

            base_dir = get_paths().base_dir

        persisted = MemoryOSState(
            active_provider_family=state.active_provider_family,
            active_provider_id=state.active_provider_id,
            providers=[
                ProviderInstanceConfig.model_validate(provider)
                for provider in state.providers
            ],
        )
        save_memory_os_state(persisted, base_dir)
        return self.get_state(base_dir=base_dir)

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

    def compact_memory(
        self,
        *,
        ratio: float,
        decay_days: int = 0,
        agent_name=None,
        base_dir=None,
    ) -> dict:
        provider = self.resolve_active_memory_provider(base_dir=base_dir)
        if not hasattr(provider, "compact"):
            raise NotImplementedError(
                "Active memory provider does not support compaction."
            )
        return provider.compact(ratio=ratio, decay_days=decay_days)  # type: ignore[no-any-return]

    def get_memory_usage(self, *, agent_name=None, base_dir=None) -> dict:
        provider = self.resolve_active_memory_provider(base_dir=base_dir)
        if not hasattr(provider, "usage"):
            raise NotImplementedError(
                "Active memory provider does not support usage reporting."
            )
        return provider.usage()  # type: ignore[no-any-return]

    def get_memory_runtime_status(self, *, agent_name=None, base_dir=None) -> dict:
        provider = self.resolve_active_memory_provider(base_dir=base_dir)
        if not hasattr(provider, "status"):
            raise NotImplementedError(
                "Active memory provider does not support runtime status."
            )
        return provider.status()  # type: ignore[no-any-return]

    def rebuild_memory(self, *, agent_name=None, base_dir=None) -> dict:
        provider = self.resolve_active_memory_provider(base_dir=base_dir)
        if not hasattr(provider, "rebuild"):
            raise NotImplementedError(
                "Active memory provider does not support rebuild."
            )
        return provider.rebuild()  # type: ignore[no-any-return]

    def resolve_active_memory_provider(self, *, base_dir=None):
        if base_dir is None:
            from nion.config.paths import get_paths

            base_dir = get_paths().base_dir

        state = load_memory_os_state(base_dir)
        provider_config = {}
        if state.active_provider_id:
            for provider in state.providers:
                if provider.id == state.active_provider_id:
                    provider_config = provider.config
                    break
        if state.active_provider_family == "builtin":
            return BuiltinMemoryProvider(base_dir=base_dir)
        if state.active_provider_family == "openviking":
            return OpenVikingMemoryProvider(
                base_dir=base_dir,
                config=provider_config or {"mode": "embedded"},
            )
        if state.active_provider_family == "mem0":
            return Mem0MemoryProvider(
                base_dir=base_dir,
                config=provider_config or {"mode": "managed"},
            )
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

    def _build_provider_instance_state(
        self,
        provider: ProviderInstanceConfig,
        *,
        is_active: bool,
        base_dir,
    ) -> ProviderInstanceState:
        runtime_mode = str(provider.config.get("mode", "unknown"))
        family_meta = FAMILY_METADATA.get(provider.family, self._fallback_family_meta(provider.family))
        status_payload = self._resolve_runtime_status(
            provider=provider,
            is_active=is_active,
            base_dir=base_dir,
        )
        usage_payload = self._resolve_usage_summary(
            provider=provider,
            is_active=is_active,
            base_dir=base_dir,
        )
        return ProviderInstanceState(
            **provider.model_dump(),
            runtime_mode=runtime_mode,
            health=self._extract_health(status_payload),
            capabilities=family_meta.capabilities.model_copy(),
            status=status_payload,
            status_summary=self._build_status_summary(
                provider=provider,
                runtime_mode=runtime_mode,
                status_payload=status_payload,
            ),
            usage_summary=usage_payload,
        )

    def _resolve_runtime_status(
        self,
        *,
        provider: ProviderInstanceConfig,
        is_active: bool,
        base_dir,
    ) -> dict[str, object]:
        runtime_mode = str(provider.config.get("mode", "unknown"))
        if not is_active:
            return {
                "provider": provider.family,
                "runtime_mode": runtime_mode,
                "health": "unknown",
                "summary": "Runtime status unavailable for inactive provider",
            }

        try:
            runtime_provider = self._instantiate_provider(provider=provider, base_dir=base_dir)
        except NotImplementedError:
            return {
                "provider": provider.family,
                "runtime_mode": runtime_mode,
                "health": "unknown",
                "summary": "Runtime provider is not implemented",
            }

        if not hasattr(runtime_provider, "status"):
            return {
                "provider": provider.family,
                "runtime_mode": runtime_mode,
                "health": "unknown",
                "summary": "Runtime status is not supported",
            }

        payload = dict(runtime_provider.status())  # type: ignore[arg-type]
        payload.setdefault("provider", provider.family)
        payload.setdefault("runtime_mode", runtime_mode)
        payload.setdefault("health", self._infer_health(payload))
        payload.setdefault("summary", self._summarize_status_payload(payload))
        return payload

    def _resolve_usage_summary(
        self,
        *,
        provider: ProviderInstanceConfig,
        is_active: bool,
        base_dir,
    ) -> dict[str, object]:
        if not is_active:
            return {}

        try:
            runtime_provider = self._instantiate_provider(provider=provider, base_dir=base_dir)
        except NotImplementedError:
            return {}

        if not hasattr(runtime_provider, "usage"):
            return {}

        payload = dict(runtime_provider.usage())  # type: ignore[arg-type]
        payload.setdefault("provider", provider.family)
        payload.setdefault("summary", self._summarize_usage_payload(payload))
        return payload

    def _instantiate_provider(self, *, provider: ProviderInstanceConfig, base_dir):
        if provider.family == "builtin":
            return BuiltinMemoryProvider(base_dir=base_dir)
        if provider.family == "openviking":
            return OpenVikingMemoryProvider(base_dir=base_dir, config=provider.config)
        if provider.family == "mem0":
            return Mem0MemoryProvider(base_dir=base_dir, config=provider.config)
        raise NotImplementedError(f"Unknown memory provider family: {provider.family}")

    def _extract_health(self, status_payload: dict[str, object]) -> ProviderHealth:
        health = status_payload.get("health", "unknown")
        if health in {"healthy", "degraded", "error", "unknown"}:
            return health
        return "unknown"

    def _infer_health(self, status_payload: dict[str, object]) -> ProviderHealth:
        if status_payload.get("provider") in {"builtin", "openviking"}:
            return "healthy"
        if status_payload.get("provider") == "mem0":
            return "degraded"
        return "unknown"

    def _summarize_status_payload(self, payload: dict[str, object]) -> str:
        numeric_keys = ("facts_count", "compaction_logs_count", "rebuild_logs_count")
        summary_parts = [f"{key}={payload[key]}" for key in numeric_keys if key in payload]
        if not summary_parts:
            return "Runtime status available"
        return ", ".join(summary_parts)

    def _summarize_usage_payload(self, payload: dict[str, object]) -> str:
        if "count" in payload and "estimated_storage_bytes" in payload:
            return (
                f"count={payload['count']}, "
                f"estimated_storage_bytes={payload['estimated_storage_bytes']}"
            )
        return "Usage summary available"

    def _build_status_summary(
        self,
        *,
        provider: ProviderInstanceConfig,
        runtime_mode: str,
        status_payload: dict[str, object],
    ) -> dict[str, object]:
        return {
            "provider": provider.family,
            "runtime_mode": runtime_mode,
            "health": self._extract_health(status_payload),
            "summary": str(status_payload.get("summary", "")),
        }

    def _fallback_family_meta(self, family: str) -> ProviderFamilyMeta:
        return ProviderFamilyMeta(
            family=family,
            display_name=family,
            supported_domains=[],
            supported_modes=[],
            capabilities=ProviderCapabilityMatrix(
                memory_crud="unsupported",
                memory_search="unsupported",
                compact="unsupported",
                rebuild="unsupported",
                usage="unsupported",
                runtime_status="unsupported",
            ),
        )


def resolve_active_memory_provider(*, base_dir=None):
    return MemoryOSService().resolve_active_memory_provider(base_dir=base_dir)
