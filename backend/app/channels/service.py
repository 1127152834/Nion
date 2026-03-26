"""ChannelService — manages the lifecycle of all IM channels."""

from __future__ import annotations

import logging
import os
from typing import Any

from app.channels.manager import CHANNEL_CAPABILITIES, ChannelManager
from app.channels.message_bus import MessageBus
from app.channels.pairing_service import PairingService
from app.channels.runtime_state import ChannelRuntimeState
from app.channels.store import ChannelStore
from app.channels.telemetry import (
    record_channel_restart_completed,
    record_channel_restart_failed,
    record_channel_restart_requested,
    record_channel_service_started,
    record_channel_service_stopped,
    record_channel_start_failed,
    record_channel_started,
    record_channel_stop_failed,
    record_channel_stopped,
)
from nion.client import NionClient

logger = logging.getLogger(__name__)

# Channel name → import path for lazy loading
_CHANNEL_REGISTRY: dict[str, str] = {
    "feishu": "app.channels.feishu:FeishuChannel",
    "slack": "app.channels.slack:SlackChannel",
    "telegram": "app.channels.telegram:TelegramChannel",
}


class ChannelService:
    """Manages the lifecycle of all configured IM channels.

    Reads configuration from ``config.yaml`` under the ``channels`` key,
    instantiates enabled channels, and starts the ChannelManager dispatcher.
    """

    def __init__(
        self,
        channels_config: dict[str, Any] | None = None,
        pairing_service: PairingService | None = None,
        runtime_mode: str | None = None,
        embedded_client: NionClient | None = None,
    ) -> None:
        self.bus = MessageBus()
        self.store = ChannelStore()
        self.runtime_state = ChannelRuntimeState()
        self.pairing_service = pairing_service or PairingService()
        config = dict(channels_config or {})
        langgraph_url = config.pop("langgraph_url", None) or "http://localhost:2024"
        gateway_url = config.pop("gateway_url", None) or "http://localhost:8001"
        resolved_runtime_mode = runtime_mode or (
            "embedded" if os.getenv("NION_DESKTOP_HELPER_MODE") == "1" else "remote"
        )
        default_session = config.pop("session", None)
        channel_sessions = {name: channel_config.get("session") for name, channel_config in config.items() if isinstance(channel_config, dict)}
        self.manager = ChannelManager(
            bus=self.bus,
            store=self.store,
            langgraph_url=langgraph_url,
            gateway_url=gateway_url,
            runtime_mode=resolved_runtime_mode,
            embedded_client=embedded_client,
            default_session=default_session if isinstance(default_session, dict) else None,
            channel_sessions=channel_sessions,
            runtime_state=self.runtime_state,
            pairing_service=self.pairing_service,
        )
        self._channels: dict[str, Any] = {}  # name -> Channel instance
        self._config = config
        self._running = False

    @classmethod
    def from_app_config(cls) -> ChannelService:
        """Create a ChannelService from the application config."""
        from nion.config.app_config import get_app_config

        config = get_app_config()
        channels_config = config.channels.model_dump(
            by_alias=True,
            exclude_none=True,
        )
        return cls(channels_config=channels_config)

    async def start(self) -> None:
        """Start the manager and all enabled channels."""
        if self._running:
            return

        await self.manager.start()

        for name, channel_config in self._config.items():
            if not isinstance(channel_config, dict):
                continue
            if not channel_config.get("enabled", False):
                logger.info("Channel %s is disabled, skipping", name)
                continue

            await self._start_channel(name, channel_config)

        self._running = True
        record_channel_service_started(list(self._channels.keys()))
        logger.info("ChannelService started with channels: %s", list(self._channels.keys()))

    async def stop(self) -> None:
        """Stop all channels and the manager."""
        for name, channel in list(self._channels.items()):
            try:
                await channel.stop()
                self.runtime_state.mark_stopped(name)
                record_channel_stopped(name)
                logger.info("Channel %s stopped", name)
            except Exception as exc:
                self.runtime_state.mark_error(name, "stop failed")
                record_channel_stop_failed(name, str(exc))
                logger.exception("Error stopping channel %s", name)
        self._channels.clear()

        await self.manager.stop()
        self._running = False
        record_channel_service_stopped()
        logger.info("ChannelService stopped")

    async def restart_channel(self, name: str) -> bool:
        """Restart a specific channel. Returns True if successful."""
        record_channel_restart_requested(name)
        if name in self._channels:
            try:
                await self._channels[name].stop()
                self.runtime_state.mark_stopped(name)
                record_channel_stopped(name)
            except Exception:
                self.runtime_state.mark_error(name, "restart stop failed")
                record_channel_restart_failed(name, "restart stop failed")
                logger.exception("Error stopping channel %s for restart", name)
            del self._channels[name]

        config = self._config.get(name)
        if not config or not isinstance(config, dict):
            logger.warning("No config for channel %s", name)
            record_channel_restart_failed(name, "channel config missing")
            return False

        success = await self._start_channel(name, config)
        if success:
            record_channel_restart_completed(name)
        else:
            record_channel_restart_failed(name, "channel failed to restart")
        return success

    async def _start_channel(self, name: str, config: dict[str, Any]) -> bool:
        """Instantiate and start a single channel."""
        import_path = _CHANNEL_REGISTRY.get(name)
        if not import_path:
            logger.warning("Unknown channel type: %s", name)
            return False

        try:
            from nion.reflection import resolve_class

            channel_cls = resolve_class(import_path, base_class=None)
        except Exception:
            logger.exception("Failed to import channel class for %s", name)
            return False

        try:
            channel = channel_cls(bus=self.bus, config=config)
            await channel.start()
            self._channels[name] = channel
            self.runtime_state.mark_started(
                name,
                getattr(channel, "capabilities", None)
                or CHANNEL_CAPABILITIES.get(name, {}),
            )
            record_channel_started(name)
            logger.info("Channel %s started", name)
            return True
        except Exception as exc:
            self.runtime_state.mark_error(name, str(exc))
            record_channel_start_failed(name, str(exc))
            logger.exception("Failed to start channel %s", name)
            return False

    def get_status(self) -> dict[str, Any]:
        """Return status information for all channels."""
        channels_status = {}
        for name in _CHANNEL_REGISTRY:
            config = self._config.get(name, {})
            enabled = isinstance(config, dict) and config.get("enabled", False)
            running = name in self._channels and self._channels[name].is_running
            runtime_snapshot = self.runtime_state.get_channel(name)
            capabilities = runtime_snapshot.get("capabilities") or {}
            if not capabilities:
                capabilities = CHANNEL_CAPABILITIES.get(name, {})
            channels_status[name] = {
                "enabled": enabled,
                "running": running,
                "capabilities": capabilities,
                "last_heartbeat": runtime_snapshot.get("last_heartbeat"),
                "last_error": runtime_snapshot.get("last_error"),
                **self.pairing_service.get_channel_counts(name),
                "can_restart": enabled,
            }
        return {
            "service_running": self._running,
            "pending_pair_requests": self.pairing_service.get_pending_request_count(),
            "channels": channels_status,
        }


# -- singleton access -------------------------------------------------------

_channel_service: ChannelService | None = None


def get_channel_service() -> ChannelService | None:
    """Get the singleton ChannelService instance (if started)."""
    return _channel_service


async def start_channel_service() -> ChannelService:
    """Create and start the global ChannelService from app config."""
    global _channel_service
    if _channel_service is not None:
        return _channel_service
    _channel_service = ChannelService.from_app_config()
    await _channel_service.start()
    return _channel_service


async def stop_channel_service() -> None:
    """Stop the global ChannelService."""
    global _channel_service
    if _channel_service is not None:
        await _channel_service.stop()
        _channel_service = None
