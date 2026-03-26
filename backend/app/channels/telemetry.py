from __future__ import annotations

from typing import Any, Literal

from nion.config.paths import get_paths
from nion.telemetry.logger import make_event
from nion.telemetry.models import DiagnosticSnapshot
from nion.telemetry.store import TelemetryStore


def _telemetry_store() -> TelemetryStore:
    return TelemetryStore(get_paths().telemetry_db_file)


def _record_channel_event(
    *,
    event_type: str,
    actor: str,
    message: str,
    level: Literal["info", "warning", "error"] = "info",
    channel_name: str | None = None,
    snapshot_status: Literal["healthy", "degraded", "error"] | None = None,
    details: dict[str, Any] | None = None,
) -> None:
    payload = dict(details or {})
    if channel_name is not None:
        payload.setdefault("channel_name", channel_name)

    store = _telemetry_store()
    store.record_event(
        make_event(
            category="channel",
            level=level,
            event_type=event_type,
            actor=actor,
            message=message,
            details=payload,
        )
    )

    if channel_name is None or snapshot_status is None:
        return

    store.upsert_snapshot(
        DiagnosticSnapshot(
            scope_type="channel",
            scope_id=channel_name,
            status=snapshot_status,
            summary=message,
            details=payload,
        )
    )


def record_channel_service_started(channel_names: list[str]) -> None:
    _record_channel_event(
        event_type="channel_service_started",
        actor="system",
        message="Channel service started",
        details={"channel_names": channel_names, "channel_count": len(channel_names)},
    )


def record_channel_service_stopped() -> None:
    _record_channel_event(
        event_type="channel_service_stopped",
        actor="system",
        message="Channel service stopped",
    )


def record_channel_started(channel_name: str) -> None:
    _record_channel_event(
        event_type="channel_started",
        actor=channel_name,
        message=f"Channel '{channel_name}' started",
        channel_name=channel_name,
        snapshot_status="healthy",
        details={"running": True},
    )


def record_channel_start_failed(channel_name: str, error: str) -> None:
    _record_channel_event(
        event_type="channel_start_failed",
        actor=channel_name,
        level="error",
        message=f"Channel '{channel_name}' failed to start",
        channel_name=channel_name,
        snapshot_status="error",
        details={"error": error, "running": False},
    )


def record_channel_stopped(channel_name: str) -> None:
    _record_channel_event(
        event_type="channel_stopped",
        actor=channel_name,
        message=f"Channel '{channel_name}' stopped",
        channel_name=channel_name,
        snapshot_status="degraded",
        details={"running": False},
    )


def record_channel_stop_failed(channel_name: str, error: str) -> None:
    _record_channel_event(
        event_type="channel_stop_failed",
        actor=channel_name,
        level="error",
        message=f"Channel '{channel_name}' failed to stop",
        channel_name=channel_name,
        snapshot_status="error",
        details={"error": error, "running": True},
    )


def record_channel_restart_requested(channel_name: str) -> None:
    _record_channel_event(
        event_type="channel_restart_requested",
        actor=channel_name,
        message=f"Channel '{channel_name}' restart requested",
        channel_name=channel_name,
        snapshot_status="degraded",
        details={"running": False},
    )


def record_channel_restart_completed(channel_name: str) -> None:
    _record_channel_event(
        event_type="channel_restart_completed",
        actor=channel_name,
        message=f"Channel '{channel_name}' restarted",
        channel_name=channel_name,
        snapshot_status="healthy",
        details={"running": True},
    )


def record_channel_restart_failed(channel_name: str, error: str) -> None:
    _record_channel_event(
        event_type="channel_restart_failed",
        actor=channel_name,
        level="error",
        message=f"Channel '{channel_name}' restart failed",
        channel_name=channel_name,
        snapshot_status="error",
        details={"error": error, "running": False},
    )


def record_channel_pairing_code_issued(
    channel_name: str,
    *,
    pairing_id: int,
    expires_at: str,
    ttl_minutes: int,
) -> None:
    _record_channel_event(
        event_type="channel_pairing_code_issued",
        actor="system",
        message=f"Channel '{channel_name}' pairing code issued",
        channel_name=channel_name,
        details={
            "pairing_id": pairing_id,
            "expires_at": expires_at,
            "ttl_minutes": ttl_minutes,
        },
    )


def record_channel_pair_request_approved(
    channel_name: str,
    *,
    request_id: int,
    workspace_id: str | None,
) -> None:
    _record_channel_event(
        event_type="channel_pair_request_approved",
        actor="system",
        message=f"Channel '{channel_name}' pair request approved",
        channel_name=channel_name,
        details={
            "request_id": request_id,
            "workspace_id": workspace_id,
        },
    )


def record_channel_pair_request_rejected(channel_name: str, *, request_id: int) -> None:
    _record_channel_event(
        event_type="channel_pair_request_rejected",
        actor="system",
        message=f"Channel '{channel_name}' pair request rejected",
        channel_name=channel_name,
        details={"request_id": request_id},
    )


def record_channel_authorized_user_revoked(channel_name: str, *, user_id: int) -> None:
    _record_channel_event(
        event_type="channel_authorized_user_revoked",
        actor="system",
        message=f"Channel '{channel_name}' authorized user revoked",
        channel_name=channel_name,
        details={"user_id": user_id},
    )


def record_channel_inbound_enqueued(
    channel_name: str,
    *,
    chat_id: str,
    msg_type: str,
    queue_size: int,
) -> None:
    _record_channel_event(
        event_type="channel_inbound_enqueued",
        actor=channel_name,
        message=f"Channel '{channel_name}' inbound message enqueued",
        channel_name=channel_name,
        snapshot_status="healthy",
        details={
            "chat_id": chat_id,
            "msg_type": msg_type,
            "queue_size": queue_size,
        },
    )


def record_channel_outbound_dispatched(
    channel_name: str,
    *,
    chat_id: str,
    listener_count: int,
    text_length: int,
) -> None:
    _record_channel_event(
        event_type="channel_outbound_dispatched",
        actor=channel_name,
        message=f"Channel '{channel_name}' outbound message dispatched",
        channel_name=channel_name,
        snapshot_status="healthy",
        details={
            "chat_id": chat_id,
            "listener_count": listener_count,
            "text_length": text_length,
        },
    )


def record_channel_outbound_failed(channel_name: str, *, chat_id: str, error: str) -> None:
    _record_channel_event(
        event_type="channel_outbound_failed",
        actor=channel_name,
        level="error",
        message=f"Channel '{channel_name}' outbound delivery failed",
        channel_name=channel_name,
        snapshot_status="error",
        details={
            "chat_id": chat_id,
            "error": error,
        },
    )
