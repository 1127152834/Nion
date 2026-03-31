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

    assert provider == {
        "id": "ov-embedded",
        "family": "openviking",
        "name": "Embedded OpenViking",
        "config": {"mode": "embedded"},
    }
