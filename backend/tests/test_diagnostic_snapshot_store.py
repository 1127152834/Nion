from nion.telemetry.models import DiagnosticSnapshot
from nion.telemetry.store import TelemetryStore


def test_snapshot_store_upserts_latest_scope_summary(tmp_path) -> None:
    store = TelemetryStore(tmp_path / "telemetry.sqlite3")
    store.upsert_snapshot(
        DiagnosticSnapshot(
            scope_type="daemon",
            scope_id="local",
            status="healthy",
            summary="Daemon is healthy",
            details={},
        )
    )
    store.upsert_snapshot(
        DiagnosticSnapshot(
            scope_type="daemon",
            scope_id="local",
            status="error",
            summary="Last check failed",
            details={"reason": "config"},
        )
    )

    snapshot = store.get_snapshot("daemon", "local")

    assert snapshot.status == "error"
    assert snapshot.summary == "Last check failed"
