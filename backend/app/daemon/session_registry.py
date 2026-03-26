from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from time import monotonic


@dataclass
class ClientSession:
    client_id: str
    client_type: str
    last_seen_at: float


class SessionRegistry:
    def __init__(
        self,
        *,
        allow_background_running: bool,
        shutdown_grace_period_seconds: int,
        stale_client_timeout_seconds: float = 5.0,
        now: Callable[[], float] | None = None,
    ) -> None:
        self._allow_background_running = allow_background_running
        self._grace = shutdown_grace_period_seconds
        self._stale_client_timeout_seconds = stale_client_timeout_seconds
        self._now = now or monotonic
        self._sessions: dict[str, ClientSession] = {}
        self._empty_since_at: float | None = self._now()

    def register(self, client_id: str, client_type: str) -> None:
        self._prune_stale_sessions()
        self._sessions[client_id] = ClientSession(
            client_id=client_id,
            client_type=client_type,
            last_seen_at=self._now(),
        )
        self._empty_since_at = None

    def heartbeat(self, client_id: str) -> bool:
        self._prune_stale_sessions()
        session = self._sessions.get(client_id)
        if session is None:
            return False
        session.last_seen_at = self._now()
        return True

    def unregister(self, client_id: str) -> None:
        current = self._now()
        self._prune_stale_sessions(current)
        session = self._sessions.pop(client_id, None)
        if session is None:
            return
        if not self._sessions:
            self._empty_since_at = current

    def should_exit(self, now: float | None = None) -> bool:
        current = self._now() if now is None else now
        self._prune_stale_sessions(current)
        if self._allow_background_running:
            return False
        if self._sessions:
            return False
        if self._empty_since_at is None:
            return False
        return current >= self._empty_since_at + self._grace

    def set_allow_background_running(self, enabled: bool) -> None:
        self._allow_background_running = enabled

    def set_shutdown_grace_period_seconds(self, seconds: int) -> None:
        self._grace = seconds

    def snapshot(self) -> dict[str, int]:
        self._prune_stale_sessions()
        electron = 0
        cli = 0
        other = 0
        for session in self._sessions.values():
            if session.client_type == "electron":
                electron += 1
            elif session.client_type == "cli":
                cli += 1
            else:
                other += 1
        return {
            "total": len(self._sessions),
            "electron": electron,
            "cli": cli,
            "other": other,
        }

    def _prune_stale_sessions(self, now: float | None = None) -> None:
        current = self._now() if now is None else now
        stale_ids = [
            client_id
            for client_id, session in self._sessions.items()
            if current - session.last_seen_at >= self._stale_client_timeout_seconds
        ]
        if not stale_ids:
            return
        for client_id in stale_ids:
            self._sessions.pop(client_id, None)
        if not self._sessions:
            self._empty_since_at = current
