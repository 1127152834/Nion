import pytest
from pydantic import ValidationError

from app.daemon.routers.runtime import GuardianModeRuntimeInfo
from app.daemon.service import LocalDaemonService


def test_runtime_info_exposes_busy_guardian_status_when_runtime_work_exists() -> None:
    service = LocalDaemonService(
        host="127.0.0.1",
        port=43115,
        allow_background_running=True,
        shutdown_grace_period_seconds=3,
    )

    service.record_thread_event(
        level="info",
        event_type="thread_stream_started",
        thread_id="thread-1",
        message="Thread stream started",
    )

    payload = service.runtime_info()

    assert payload["guardian_mode"] == {
        "enabled": True,
        "window_required": False,
        "status": "busy",
    }
    assert payload["bridge_runtime"] == {
        "available": True,
        "running": None,
    }


def test_guardian_runtime_info_rejects_unknown_status() -> None:
    with pytest.raises(ValidationError):
        GuardianModeRuntimeInfo.model_validate(
            {
                "enabled": True,
                "window_required": False,
                "status": "unexpected",
            }
        )
