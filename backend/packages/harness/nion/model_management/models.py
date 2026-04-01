from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, Field

ProviderCategory = Literal["domestic", "aggregator", "global", "local"]
ProviderProtocol = Literal["openai-compatible", "anthropic-compatible", "custom"]
ProviderBaseUrlMode = Literal["fixed", "editable", "hidden"]
ProviderDiscoveryMode = Literal["api", "static", "manual", "none"]
ProviderKind = Literal["builtin", "custom"]
ProviderStatus = Literal["active", "disabled", "draft", "error"]
ProviderTestStatus = Literal["untested", "success", "failed"]
ProviderModelSource = Literal["seeded", "discovered", "manual"]
ModelBindingStatus = Literal["active", "disabled"]


def utc_now_iso() -> str:
    return datetime.now(tz=UTC).isoformat()


class ProviderTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    code: str
    name: str
    description: str | None = None
    category: ProviderCategory | None = None
    icon: str | None = None
    protocol: ProviderProtocol
    base_url_mode: ProviderBaseUrlMode = "editable"
    base_url: str | None = None
    api_key_apply_url: str | None = None
    supports_model_discovery: bool = False
    discovery_mode: ProviderDiscoveryMode = "none"
    allows_multiple_instances: bool = False
    requires_api_key: bool = True
    editable_schema_json: dict[str, Any] | None = None
    badge: str | None = None
    network_notice: str | None = None
    is_builtin: bool = True
    status: ProviderStatus = "active"
    sort_order: int = 0
    created_at: str = Field(default_factory=utc_now_iso)
    updated_at: str = Field(default_factory=utc_now_iso)


class ProviderTemplateCategoryMembership(BaseModel):
    provider_template_id: str
    category: ProviderCategory
    sort_order: int = 0
    created_at: str = Field(default_factory=utc_now_iso)
    updated_at: str = Field(default_factory=utc_now_iso)


class ProviderInstance(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    provider_template_id: str | None = None
    kind: ProviderKind
    display_name: str
    protocol_override: ProviderProtocol | None = None
    base_url_override: str | None = None
    custom_headers_json: dict[str, str] | None = None
    api_key_encrypted: str | None = None
    api_key_masked: str | None = None
    auth_config_json: dict[str, Any] | None = None
    status: ProviderStatus = "active"
    provider_test_status: ProviderTestStatus = "untested"
    provider_test_message: str | None = None
    provider_test_latency_ms: int | None = None
    provider_last_tested_at: str | None = None
    provider_test_signature: str | None = None
    last_discovery_at: str | None = None
    last_discovery_status: ProviderTestStatus | None = None
    last_discovery_message: str | None = None
    notes: str | None = None
    created_at: str = Field(default_factory=utc_now_iso)
    updated_at: str = Field(default_factory=utc_now_iso)


class ProviderModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    provider_instance_id: str
    model_id: str
    display_name: str
    model_type: str | None = None
    source: ProviderModelSource
    is_enabled: bool = True
    is_primary: bool = False
    priority_order: int = 0
    supports_thinking: bool | None = None
    supports_reasoning_effort: bool | None = None
    supports_vision: bool | None = None
    supports_video: bool | None = None
    context_window: int | None = None
    max_output_tokens: int | None = None
    metadata_json: dict[str, Any] | None = None
    model_test_status: ProviderTestStatus = "untested"
    model_test_message: str | None = None
    model_test_latency_ms: int | None = None
    model_test_preview: str | None = None
    model_last_tested_at: str | None = None
    created_at: str = Field(default_factory=utc_now_iso)
    updated_at: str = Field(default_factory=utc_now_iso)


class ModelBinding(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    binding_key: str
    provider_model_id: str
    fallback_provider_model_id: str | None = None
    status: ModelBindingStatus = "active"
    created_at: str = Field(default_factory=utc_now_iso)
    updated_at: str = Field(default_factory=utc_now_iso)
