from __future__ import annotations

from pydantic import BaseModel, Field


class BridgePlatformConfig(BaseModel):
    enabled: bool = False
    verified: bool = False
    verified_at: str | None = None
    verified_fingerprint: str = ""


class TelegramBridgeConfig(BridgePlatformConfig):
    bot_token: str = ""
    chat_id: str = ""
    allowed_users: str = ""


class FeishuBridgeConfig(BridgePlatformConfig):
    app_id: str = ""
    app_secret: str = ""
    domain: str = "feishu"
    allow_from: str = ""
    dm_policy: str = "open"
    thread_session: bool = False
    group_policy: str = "open"
    group_allow_from: str = ""
    require_mention: bool = False


class DiscordBridgeConfig(BridgePlatformConfig):
    bot_token: str = ""
    allowed_users: str = ""
    allowed_channels: str = ""
    allowed_guilds: str = ""
    group_policy: str = "open"
    require_mention: bool = False
    stream_enabled: bool = True
    max_attachment_size: str = ""
    image_enabled: bool = True


class QqBridgeConfig(BridgePlatformConfig):
    app_id: str = ""
    app_secret: str = ""
    allowed_users: str = ""
    image_enabled: bool = True
    max_image_size: str = "20"


class WeixinBridgeConfig(BridgePlatformConfig):
    enabled: bool = False


class BridgeConfig(BaseModel):
    auto_start: bool = False
    default_work_dir: str = ""
    default_model: str = ""
    default_provider_id: str = ""
    telegram: TelegramBridgeConfig = Field(default_factory=TelegramBridgeConfig)
    feishu: FeishuBridgeConfig = Field(default_factory=FeishuBridgeConfig)
    discord: DiscordBridgeConfig = Field(default_factory=DiscordBridgeConfig)
    qq: QqBridgeConfig = Field(default_factory=QqBridgeConfig)
    weixin: WeixinBridgeConfig = Field(default_factory=WeixinBridgeConfig)
