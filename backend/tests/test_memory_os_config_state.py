from nion.memory_os.config_state import load_memory_os_state, save_memory_os_state
from nion.memory_os.providers import MemoryOSState, ProviderInstanceConfig


def test_load_memory_os_state_returns_default_builtin_binding_when_empty(tmp_path):
    state = load_memory_os_state(base_dir=tmp_path)

    assert state.active_provider_family == "builtin"
    assert state.active_provider_id is None
    assert state.providers == []


def test_save_and_reload_memory_os_state_round_trips_provider_instances(tmp_path):
    save_memory_os_state(
        MemoryOSState(
            active_provider_family="openviking",
            active_provider_id="provider-1",
            providers=[
                ProviderInstanceConfig(
                    id="provider-1",
                    family="openviking",
                    name="Embedded OpenViking",
                    config={"mode": "embedded"},
                )
            ],
        ),
        base_dir=tmp_path,
    )

    reloaded = load_memory_os_state(base_dir=tmp_path)

    assert reloaded.active_provider_family == "openviking"
    assert reloaded.active_provider_id == "provider-1"
    assert reloaded.providers[0].config == {"mode": "embedded"}
