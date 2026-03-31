from nion.memory_os.service import MemoryOSService


COMMON_CAPABILITY_KEYS = {
    "supports_memory_runtime",
    "supports_runtime_status",
    "supports_usage_reporting",
    "supports_compaction",
    "supports_rebuild",
}


def test_memory_os_provider_capability_matrix_has_common_runtime_keys():
    service = MemoryOSService()

    for family in service.list_provider_families():
        capabilities = family.model_dump().get("capabilities")

        assert isinstance(capabilities, dict)
        assert COMMON_CAPABILITY_KEYS.issubset(capabilities.keys())


def test_openviking_family_capability_matrix_marks_extended_resource_support():
    families = {
        family.family: family.model_dump().get("capabilities")
        for family in MemoryOSService().list_provider_families()
    }

    assert families["openviking"]["supports_notebook_resources"] is True
    assert families["openviking"]["supports_autodream_entries"] is True
