from datetime import datetime, timezone


def test_utcnow_z_returns_iso8601_utc_string():
    from nion.memory_os.clock import utcnow_z

    timestamp = utcnow_z()

    assert timestamp.endswith("Z")
    parsed = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    assert parsed.tzinfo == timezone.utc
