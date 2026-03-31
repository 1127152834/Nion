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
