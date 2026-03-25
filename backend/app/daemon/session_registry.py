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
        now: Callable[[], float] | None = None,
    ) -> None:
        self._allow_background_running = allow_background_running
        self._grace = shutdown_grace_period_seconds
        self._now = now or monotonic
        self._sessions: dict[str, ClientSession] = {}
        self._last_electron_detach_at: float | None = None

    def register(self, client_id: str, client_type: str) -> None:
        self._sessions[client_id] = ClientSession(
            client_id=client_id,
            client_type=client_type,
            last_seen_at=self._now(),
        )

    def heartbeat(self, client_id: str) -> bool:
        session = self._sessions.get(client_id)
        if session is None:
            return False
        session.last_seen_at = self._now()
        return True

    def unregister(self, client_id: str) -> None:
        session = self._sessions.pop(client_id, None)
        if session is None:
            return
        if session.client_type == "electron" and not self._has_client_type("electron"):
            self._last_electron_detach_at = self._now()

    def should_exit(self, now: float | None = None) -> bool:
        if self._allow_background_running:
            return False
        if self._sessions:
            return False
        if self._last_electron_detach_at is None:
            return False
        current = self._now() if now is None else now
        return current >= self._last_electron_detach_at + self._grace

    def set_allow_background_running(self, enabled: bool) -> None:
        self._allow_background_running = enabled

    def snapshot(self) -> dict[str, int]:
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

    def _has_client_type(self, client_type: str) -> bool:
        return any(session.client_type == client_type for session in self._sessions.values())
