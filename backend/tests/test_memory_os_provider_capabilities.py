from nion.memory_os.providers import MemoryOSState, ProviderInstanceConfig
from nion.memory_os.service import MemoryOSService


COMMON_CAPABILITY_KEYS = {
    "memory_crud",
    "memory_search",
    "compact",
    "rebuild",
    "usage",
    "runtime_status",
}
CAPABILITY_STATES = {"supported", "partial", "unsupported"}


def test_memory_os_provider_capability_matrix_uses_explicit_state_fields():
    service = MemoryOSService()

    for family in service.list_provider_families():
        capabilities = family.model_dump().get("capabilities")

        assert isinstance(capabilities, dict)
        assert set(capabilities.keys()) >= COMMON_CAPABILITY_KEYS
        assert set(capabilities.values()).issubset(CAPABILITY_STATES)


def test_openviking_family_capability_matrix_uses_stateful_extension_fields():
    families = {
        family.family: family.model_dump().get("capabilities")
        for family in MemoryOSService().list_provider_families()
    }

    assert families["openviking"]["notebook_resources"] in CAPABILITY_STATES
    assert families["openviking"]["autodream_entries"] in CAPABILITY_STATES


def test_memory_os_runtime_state_projects_active_provider_status_and_usage(tmp_path):
    service = MemoryOSService()
    service.update_state(
        MemoryOSState(
            active_provider_family="openviking",
            active_provider_id="ov-embedded",
            providers=[
                ProviderInstanceConfig(
                    id="ov-embedded",
                    family="openviking",
                    name="Embedded OpenViking",
                    config={"mode": "embedded"},
                )
            ],
        ),
        base_dir=tmp_path,
    )

    provider = service.get_state(base_dir=tmp_path).model_dump()["providers"][0]

    assert provider["runtime_mode"] == "embedded"
    assert provider["health"] == "healthy"
    assert provider["capabilities"]["runtime_status"] == "supported"
    assert provider["status"]["provider"] == "openviking"
    assert provider["status_summary"]["provider"] == "openviking"
    assert "count" in provider["usage_summary"]


def test_memory_os_runtime_state_leaves_inactive_provider_health_unknown(tmp_path):
    service = MemoryOSService()
    service.update_state(
        MemoryOSState(
            active_provider_family="builtin",
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

    provider = service.get_state(base_dir=tmp_path).model_dump()["providers"][0]

    assert provider["runtime_mode"] == "managed"
    assert provider["health"] == "unknown"
    assert provider["status"]["health"] == "unknown"
    assert provider["usage_summary"] == {}
