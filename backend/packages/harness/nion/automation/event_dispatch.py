from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

AUTOMATION_LOOP_GUARDED_EVENTS = {
    "thread.started",
    "thread.finished",
    "thread.failed",
    "agent.run.completed",
    "agent.run.failed",
}


def dispatch_automation_event(event_name: str, payload: dict[str, Any] | None = None) -> None:
    details = dict(payload or {})
    if details.get("surface") == "automation" and event_name in AUTOMATION_LOOP_GUARDED_EVENTS:
        return

    try:
        from nion.automation.service import create_default_automation_service

        service = create_default_automation_service()
        service.handle_event(event_name, details)
    except Exception:
        logger.warning("Failed to dispatch automation event %s", event_name, exc_info=True)
