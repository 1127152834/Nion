from typing import Any

from pydantic import BaseModel, Field


def _default_session_policy() -> dict[str, Any]:
    return {
        "session_mode": "automation",
        "memory_read": True,
        "memory_write": False,
        "subagent_enabled": False,
        "thinking_enabled": True,
    }


class AutomationConfig(BaseModel):
    enabled: bool = Field(
        default=False,
        description="Whether the automation runtime is enabled.",
    )
    storage_path: str = Field(
        default="automation.db",
        description="SQLite database path for automation job and run state.",
    )
    scheduler_enabled: bool = Field(
        default=True,
        description="Whether the in-process automation scheduler should tick.",
    )
    tick_interval_seconds: int = Field(
        default=30,
        ge=1,
        le=3600,
        description="Scheduler polling interval in seconds.",
    )
    lock_timeout_seconds: int = Field(
        default=300,
        ge=1,
        le=86400,
        description="How long a claimed run lock remains valid before recovery logic may reclaim it.",
    )
    max_runs_per_tick: int = Field(
        default=10,
        ge=1,
        le=1000,
        description="Maximum jobs the scheduler will start during a single tick.",
    )
    default_toolset_profile: str = Field(
        default="automation",
        description="Toolset profile assigned to automation runs by default.",
    )
    default_session_policy: dict[str, Any] = Field(
        default_factory=_default_session_policy,
        description="Default isolated runtime policy snapshot for automation jobs.",
    )


_automation_config = AutomationConfig()


def get_automation_config() -> AutomationConfig:
    return _automation_config


def set_automation_config(config: AutomationConfig) -> None:
    global _automation_config
    _automation_config = config


def load_automation_config_from_dict(config_dict: dict[str, Any]) -> None:
    global _automation_config
    _automation_config = AutomationConfig(**config_dict)
