import os
from typing import Literal

from pydantic import BaseModel, Field


class DaemonConfig(BaseModel):
    allow_background_running: bool = Field(
        default_factory=lambda: os.getenv("NION_DAEMON_ALLOW_BACKGROUND_RUNNING", "").strip() in {"1", "true", "TRUE", "yes", "on"},
        description="Keep the local daemon alive after Electron closes.",
    )
    host: str = Field(default="127.0.0.1")
    port: int = Field(default=43115)
    shutdown_grace_period_seconds: int = Field(default=3, ge=1, le=10)
    local_actions_permission_mode: Literal[
        "disabled", "review_required", "allow_all"
    ] = Field(
        default="review_required",
        description="Global permission mode for daemon-triggered local actions.",
    )
