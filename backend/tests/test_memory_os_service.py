from nion.memory_os.service import MemoryOSService


def test_memory_os_service_lists_three_provider_families():
    service = MemoryOSService()

    families = service.list_provider_families()

    assert [family.family for family in families] == [
        "builtin",
        "mem0",
        "openviking",
    ]


def test_every_provider_family_exposes_full_memory_os_domains():
    service = MemoryOSService()

    for family in service.list_provider_families():
        assert family.supported_domains == [
            "notebook",
            "user_memory",
            "agent_memory",
            "self_maintenance_journal",
            "autodream_journal",
            "identity",
            "soul",
        ]


def test_openviking_family_exposes_embedded_and_remote_modes():
    family = next(
        item
        for item in MemoryOSService().list_provider_families()
        if item.family == "openviking"
    )

    assert family.supported_modes == ["embedded", "remote"]


def test_memory_os_provider_families_expose_capability_matrix():
    service = MemoryOSService()

    families = {family.family: family for family in service.list_provider_families()}

    assert "capabilities" in families["builtin"].model_dump()
    assert "capabilities" in families["openviking"].model_dump()
    assert "capabilities" in families["mem0"].model_dump()
