import nion.memory_os.mem0_provider as mem0_provider


def test_mem0_provider_supports_memory_runtime_contract(tmp_path):
    provider_cls = getattr(mem0_provider, "Mem0MemoryProvider", None)

    assert provider_cls is not None

    provider = provider_cls(base_dir=tmp_path, config={"mode": "managed"})

    payload = provider.get_memory()

    assert payload["version"] == "1.0"
    assert isinstance(provider.status(), dict)
    assert isinstance(provider.usage(), dict)
