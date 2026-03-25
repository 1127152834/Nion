from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel

from nion.config.config_repository import ConfigRepository
from nion.config.config_store import resolve_config_db_path
from nion.model_management.crypto import get_model_management_secret
from nion.model_management.models import ModelBinding, ProviderInstance, ProviderModel
from nion.model_management.repository import ModelManagementRepository
from nion.model_management.seed import seed_builtin_provider_templates

logger = logging.getLogger(__name__)

_DEFAULT_BINDING_KEY = "chat.default"


def _as_str(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _as_bool(value: Any) -> bool:
    return value if isinstance(value, bool) else False


def _provider_signature(payload: dict[str, Any]) -> str:
    return "|||".join(
        [
            _as_str(payload.get("use")),
            _as_str(payload.get("api_base")),
            _as_str(payload.get("api_key")),
        ]
    )


def _detect_protocol(*, use: str, api_base: str) -> str:
    normalized_use = use.lower()
    normalized_api_base = api_base.lower()
    if "anthropic" in normalized_use or "anthropic" in normalized_api_base:
        return "anthropic-compatible"
    return "openai-compatible"


def _to_safe_identifier(value: str, *, fallback: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
    return normalized or fallback


@dataclass(slots=True)
class _LegacyProviderDraft:
    key: str
    display_name: str
    use: str
    api_key: str
    api_base: str
    protocol: str


class LegacyImportResult(BaseModel):
    imported_providers: int = 0
    imported_models: int = 0


class LegacyModelConfigImporter:
    def __init__(
        self,
        *,
        repo: ModelManagementRepository | None = None,
        config_repository: ConfigRepository | None = None,
    ):
        self._repo = repo or ModelManagementRepository(resolve_config_db_path())
        self._config_repository = config_repository or ConfigRepository()

    def import_if_needed(self) -> LegacyImportResult:
        if self._repo.list_provider_instances() or self._repo.list_all_provider_models():
            return LegacyImportResult()

        raw_providers, raw_models = self._config_repository.read_legacy_model_management_payload()
        if not raw_providers and not raw_models:
            return LegacyImportResult()
        if self._legacy_payload_requires_secret(raw_providers, raw_models):
            try:
                get_model_management_secret()
            except RuntimeError:
                logger.info(
                    "Skipping legacy model import because NION_MODEL_MANAGEMENT_SECRET is not configured"
                )
                return LegacyImportResult()

        seed_builtin_provider_templates(self._repo)
        custom_template = self._repo.get_provider_template_by_code("custom-provider")

        provider_drafts = self._build_provider_drafts(raw_providers, raw_models)
        provider_instances_by_key: dict[str, ProviderInstance] = {}
        imported_providers = 0

        for draft in provider_drafts.values():
            template_id = custom_template.id if custom_template is not None else None
            provider_instances_by_key[draft.key] = self._repo.save_provider_instance(
                ProviderInstance(
                    id=f"legacy-provider::{_to_safe_identifier(draft.key, fallback='provider')}",
                    provider_template_id=template_id,
                    kind="custom",
                    display_name=draft.display_name,
                    protocol_override=draft.protocol,  # type: ignore[arg-type]
                    base_url_override=draft.api_base or None,
                    status="active",
                ),
                api_key_plaintext=draft.api_key or None,
            )
            imported_providers += 1

        imported_models = 0
        first_provider_model_id: str | None = None
        provider_model_counts: dict[str, int] = {}

        for raw_model in raw_models:
            provider_key = self._resolve_provider_key(raw_model, provider_drafts)
            provider = provider_instances_by_key.get(provider_key)
            if provider is None:
                continue

            display_name = (
                _as_str(raw_model.get("display_name"))
                or _as_str(raw_model.get("name"))
                or _as_str(raw_model.get("model"))
            )
            model_id = _as_str(raw_model.get("model")) or _as_str(raw_model.get("name"))
            if not model_id:
                continue

            priority_order = provider_model_counts.get(provider.id, 0)
            provider_model_counts[provider.id] = priority_order + 1
            provider_model = self._repo.save_provider_model(
                ProviderModel(
                    provider_instance_id=provider.id,
                    model_id=model_id,
                    display_name=display_name or model_id,
                    source="manual",
                    is_enabled=True,
                    is_primary=priority_order == 0,
                    priority_order=priority_order,
                    supports_thinking=_as_bool(raw_model.get("supports_thinking")),
                    supports_reasoning_effort=_as_bool(raw_model.get("supports_reasoning_effort")),
                    supports_vision=_as_bool(raw_model.get("supports_vision")),
                    metadata_json=self._build_model_metadata(raw_model),
                )
            )
            if first_provider_model_id is None:
                first_provider_model_id = provider_model.id
            imported_models += 1

        if first_provider_model_id is not None:
            self._repo.save_binding(
                ModelBinding(
                    binding_key=_DEFAULT_BINDING_KEY,
                    provider_model_id=first_provider_model_id,
                )
            )

        if imported_providers or imported_models:
            logger.info(
                "Imported %s providers and %s models from legacy config",
                imported_providers,
                imported_models,
            )

        return LegacyImportResult(
            imported_providers=imported_providers,
            imported_models=imported_models,
        )

    def _build_provider_drafts(
        self,
        raw_providers: list[dict[str, Any]],
        raw_models: list[dict[str, Any]],
    ) -> dict[str, _LegacyProviderDraft]:
        drafts: dict[str, _LegacyProviderDraft] = {}

        for index, raw_provider in enumerate(raw_providers, start=1):
            key = _as_str(raw_provider.get("id")) or _provider_signature(raw_provider) or f"provider-{index}"
            drafts[key] = self._provider_draft_from_payload(raw_provider, key=key, fallback_index=index)

        for index, raw_model in enumerate(raw_models, start=1):
            key = self._resolve_provider_key(raw_model, drafts)
            if key in drafts:
                continue
            drafts[key] = self._provider_draft_from_payload(raw_model, key=key, fallback_index=len(drafts) + 1)

        return drafts

    def _provider_draft_from_payload(
        self,
        payload: dict[str, Any],
        *,
        key: str,
        fallback_index: int,
    ) -> _LegacyProviderDraft:
        use = _as_str(payload.get("use"))
        api_base = _as_str(payload.get("api_base"))
        display_name = (
            _as_str(payload.get("name"))
            or _as_str(payload.get("display_name"))
            or f"Legacy Provider {fallback_index}"
        )
        return _LegacyProviderDraft(
            key=key,
            display_name=display_name,
            use=use,
            api_key=_as_str(payload.get("api_key")),
            api_base=api_base,
            protocol=_detect_protocol(use=use, api_base=api_base),
        )

    def _resolve_provider_key(
        self,
        payload: dict[str, Any],
        providers_by_key: dict[str, _LegacyProviderDraft],
    ) -> str:
        provider_id = _as_str(payload.get("provider_id"))
        if provider_id and provider_id in providers_by_key:
            return provider_id
        if provider_id:
            return provider_id

        signature = _provider_signature(payload)
        if signature and signature in providers_by_key:
            return signature
        if signature:
            return signature

        name = _as_str(payload.get("name")) or _as_str(payload.get("model"))
        return name or "legacy-provider"

    @staticmethod
    def _build_model_metadata(payload: dict[str, Any]) -> dict[str, Any]:
        metadata = dict(payload)
        for key in ("provider_id", "use", "api_key", "api_base"):
            metadata.pop(key, None)
        return metadata

    @staticmethod
    def _legacy_payload_requires_secret(
        raw_providers: list[dict[str, Any]],
        raw_models: list[dict[str, Any]],
    ) -> bool:
        for item in [*raw_providers, *raw_models]:
            if _as_str(item.get("api_key")):
                return True
        return False
