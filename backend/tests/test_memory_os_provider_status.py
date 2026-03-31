from nion.memory_os.config_state import load_memory_os_state
from nion.memory_os.providers import MemoryOSState, ProviderInstanceConfig
from nion.memory_os.service import MemoryOSService


def test_memory_os_state_round_trip_persists_provider_configuration_only(tmp_path):
    service = MemoryOSService()

    updated = service.update_state(
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

    provider = updated.model_dump()["providers"][0]
    persisted = load_memory_os_state(tmp_path).model_dump()["providers"][0]

    assert persisted == {
        "id": "ov-embedded",
        "family": "openviking",
        "name": "Embedded OpenViking",
        "config": {"mode": "embedded"},
    }
    assert provider["runtime_mode"] == "embedded"
    assert provider["health"] == "healthy"
    assert provider["capabilities"]["memory_crud"] == "supported"
