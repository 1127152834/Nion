from nion.self_maintenance.models import ReflectiveRunState
from nion.self_maintenance.store import SelfMaintenanceStore


def test_self_maintenance_store_round_trips_log_and_state(tmp_path):
    store = SelfMaintenanceStore(base_dir=tmp_path)
    store.save_state(
        ReflectiveRunState(
            last_run_at="2026-03-31T10:00:00Z",
            session_count_since_last_run=2,
            last_run_status="succeeded",
            last_run_summary="Reviewed recent memory drift.",
        )
    )
    store.append_log(
        trigger="manual",
        status="succeeded",
        summary="Reviewed recent memory drift.",
        memory_update_proposals=["Merge duplicate onboarding preference facts."],
    )

    state = store.load_state()
    logs = store.list_logs(limit=10, offset=0)

    assert state.last_run_status == "succeeded"
    assert logs[0].trigger == "manual"
    assert logs[0].memory_update_proposals == [
        "Merge duplicate onboarding preference facts."
    ]
