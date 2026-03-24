"""Configuration models for channel control-plane defaults."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ChannelMode = Literal["webhook", "stream"]


class ChannelSessionContext(BaseModel):
    thinking_enabled: bool | None = None
    is_plan_mode: bool | None = None
    subagent_enabled: bool | None = None


class ChannelSessionRunConfig(BaseModel):
    recursion_limit: int | None = Field(default=None, ge=1)


class ChannelSessionConfig(BaseModel):
    assistant_id: str | None = None
    config: ChannelSessionRunConfig | None = None
    context: ChannelSessionContext | None = None


class ChannelPlatformConfig(BaseModel):
    enabled: bool = False
    mode: ChannelMode = "webhook"
    credentials: dict[str, str] = Field(default_factory=dict)
    default_workspace_id: str | None = None
    session: ChannelSessionConfig | None = None
    created_at: str | None = None
    updated_at: str | None = None
    model_config = ConfigDict(extra="allow")


class ChannelsAppConfig(BaseModel):
    """App-level channel runtime configuration.

    `lark` uses the alias `feishu` for backward compatibility with the
    existing connector module naming.
    """

    gateway_url: str = "http://localhost:8001"
    langgraph_url: str = "http://localhost:2024"
    session: ChannelSessionConfig | None = None
    lark: ChannelPlatformConfig = Field(
        default_factory=ChannelPlatformConfig,
        alias="feishu",
    )
    dingtalk: ChannelPlatformConfig = Field(default_factory=ChannelPlatformConfig)
    telegram: ChannelPlatformConfig = Field(default_factory=ChannelPlatformConfig)
    model_config = ConfigDict(populate_by_name=True, extra="allow")


_channels_config: ChannelsAppConfig = ChannelsAppConfig()


def get_channels_app_config() -> ChannelsAppConfig:
    return _channels_config


def load_channels_config_from_dict(config_dict: dict) -> None:
    global _channels_config
    _channels_config = ChannelsAppConfig(**config_dict)
