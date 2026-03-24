"""Observational runtime state for channel operator surfaces."""

from __future__ import annotations

import time
from dataclasses import asdict, dataclass
from typing import Any


@dataclass(slots=True)
class ChannelRuntimeRecord:
    running: bool = False
    capabilities: dict[str, Any] | None = None
    last_heartbeat: float | None = None
    last_error: str | None = None

    def to_snapshot(self) -> dict[str, Any]:
        data = asdict(self)
        data["capabilities"] = self.capabilities or {}
        return data


class ChannelRuntimeState:
    """Tracks observational runtime metadata without owning execution state."""

    def __init__(self) -> None:
        self._channels: dict[str, ChannelRuntimeRecord] = {}

    def mark_started(self, name: str, capabilities: dict[str, Any] | None = None) -> None:
        record = self._channels.setdefault(name, ChannelRuntimeRecord())
        record.running = True
        record.capabilities = dict(capabilities or {})
        record.last_heartbeat = time.time()
        record.last_error = None

    def mark_stopped(self, name: str) -> None:
        record = self._channels.setdefault(name, ChannelRuntimeRecord())
        record.running = False

    def mark_heartbeat(self, name: str) -> None:
        record = self._channels.setdefault(name, ChannelRuntimeRecord())
        record.last_heartbeat = time.time()

    def mark_error(self, name: str, error: str) -> None:
        record = self._channels.setdefault(name, ChannelRuntimeRecord())
        record.last_error = error

    def get_channel(self, name: str) -> dict[str, Any]:
        record = self._channels.get(name)
        if record is None:
            return ChannelRuntimeRecord().to_snapshot()
        return record.to_snapshot()

    def snapshot(self) -> dict[str, Any]:
        return {
            "channels": {
                name: record.to_snapshot()
                for name, record in self._channels.items()
            }
        }
