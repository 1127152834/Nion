from nion.memory_os.registry import build_memory_os_registry


def test_registry_contains_builtin_mem0_and_openviking_families():
    registry = build_memory_os_registry()

    assert sorted(registry.keys()) == ["builtin", "mem0", "openviking"]
