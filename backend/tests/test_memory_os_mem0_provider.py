import nion.memory_os.mem0_provider as mem0_provider
from nion.memory_os.providers import MemoryOSState, ProviderInstanceConfig
from nion.memory_os.service import MemoryOSService


def test_mem0_provider_supports_memory_runtime_contract(tmp_path):
    provider_cls = getattr(mem0_provider, "Mem0MemoryProvider", None)

    assert provider_cls is not None

    provider = provider_cls(base_dir=tmp_path, config={"mode": "managed"})

    payload = provider.get_memory()

    assert payload["version"] == "1.0"
    assert isinstance(provider.status(), dict)
    assert isinstance(provider.usage(), dict)


def test_mem0_provider_persists_payload_and_reports_compatibility_status(tmp_path):
    provider = mem0_provider.Mem0MemoryProvider(
        base_dir=tmp_path,
        config={"mode": "managed", "api_key": "test-key"},
    )

    payload = provider.get_memory()
    payload["facts"] = [{"id": "fact-1", "text": "hello mem0"}]

    assert provider.save_memory(payload) is True

    reloaded = provider.get_memory()
    status = provider.status()
    usage = provider.usage()

    assert reloaded["facts"] == [{"id": "fact-1", "text": "hello mem0"}]
    assert status["provider"] == "mem0"
    assert status["runtime_mode"] == "managed"
    assert status["storage_kind"] == "local_compatibility"
    assert status["health"] == "degraded"
    assert usage["provider"] == "mem0"
    assert usage["count"] == 1
    assert usage["estimated_storage_bytes"] > 0


def test_mem0_provider_exposes_explicit_unsupported_compact_and_rebuild(tmp_path):
    provider = mem0_provider.Mem0MemoryProvider(base_dir=tmp_path, config={"mode": "managed"})

    compact_result = provider.compact(ratio=0.5)
    rebuild_result = provider.rebuild()

    assert compact_result == {
        "provider": "mem0",
        "supported": False,
        "operation": "compact",
        "reason": "Mem0 compatibility runtime does not support compaction.",
    }
    assert rebuild_result == {
        "provider": "mem0",
        "supported": False,
        "operation": "rebuild",
        "reason": "Mem0 compatibility runtime does not support rebuild.",
    }


def test_memory_os_service_resolves_mem0_runtime_provider_without_not_implemented(
    tmp_path,
):
    service = MemoryOSService()
    service.update_state(
        MemoryOSState(
            active_provider_family="mem0",
            active_provider_id="mem0-managed",
            providers=[
                ProviderInstanceConfig(
                    id="mem0-managed",
                    family="mem0",
                    name="Managed Mem0",
                    config={"mode": "managed"},
                )
            ],
        ),
        base_dir=tmp_path,
    )

    provider = service.resolve_active_memory_provider(base_dir=tmp_path)
    payload = service.get_memory_payload(base_dir=tmp_path)
    status = service.get_memory_runtime_status(base_dir=tmp_path)
    usage = service.get_memory_usage(base_dir=tmp_path)
    compact_result = service.compact_memory(ratio=0.2, base_dir=tmp_path)
    rebuild_result = service.rebuild_memory(base_dir=tmp_path)

    assert provider.__class__.__name__ == "Mem0MemoryProvider"
    assert payload["version"] == "1.0"
    assert status["provider"] == "mem0"
    assert usage["provider"] == "mem0"
    assert compact_result["supported"] is False
    assert rebuild_result["supported"] is False
