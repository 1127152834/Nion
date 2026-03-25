from __future__ import annotations

from collections import Counter
from collections.abc import Callable
from typing import Any, Literal

from pydantic import BaseModel

from nion.config import get_app_config
from nion.config.config_store import resolve_config_db_path
from nion.config.model_config import ModelConfig
from nion.model_management.crypto import decrypt_provider_secret, get_model_management_secret
from nion.model_management.import_legacy import LegacyModelConfigImporter
from nion.model_management.models import (
    ModelBinding,
    ProviderInstance,
    ProviderModel,
    ProviderProtocol,
    ProviderTemplate,
)
from nion.model_management.repository import ModelManagementRepository

DEFAULT_CHAT_BINDING = "chat.default"


class ResolvedRuntimeModel(BaseModel):
    runtime_name: str
    binding_key: str | None = None
    source_kind: Literal["database", "legacy"]
    provider: ProviderInstance
    template: ProviderTemplate | None = None
    model: ProviderModel
    runtime_model_config: ModelConfig
    api_key: str | None = None
    api_base: str | None = None

    def matches_identity(self, identity: str) -> bool:
        keys = {
            self.runtime_name,
            self.model.id,
            self.model.model_id,
            f"{self.provider.id}:{self.model.model_id}",
        }
        if self.template is not None:
            keys.add(f"{self.template.code}:{self.model.model_id}")
        return identity in keys


def _provider_use_for_protocol(protocol: ProviderProtocol) -> str:
    if protocol == "anthropic-compatible":
        return "langchain_anthropic:ChatAnthropic"
    return "langchain_openai:ChatOpenAI"


def _safe_optional_str(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        stripped = value.strip()
        return stripped or None
    return None


def _safe_required_str(value: Any, fallback: str) -> str:
    return _safe_optional_str(value) or fallback


def _safe_bool(value: Any) -> bool:
    return value if isinstance(value, bool) else False


class ModelRegistryService:
    def __init__(
        self,
        *,
        repo: ModelManagementRepository | None = None,
        secret_provider: Callable[[], bytes] | None = None,
        app_config_provider: Callable[[], object] | None = None,
    ):
        self._secret_provider = secret_provider or get_model_management_secret
        self._app_config_provider = app_config_provider or get_app_config
        if repo is None:
            self._repo = ModelManagementRepository(
                resolve_config_db_path(),
                secret_provider=self._secret_provider,
            )
            LegacyModelConfigImporter(repo=self._repo).import_if_needed()
        else:
            self._repo = repo

    def list_runtime_models(self) -> list[ResolvedRuntimeModel]:
        database_models = self._list_database_runtime_models()
        if database_models:
            return database_models
        return self._list_legacy_runtime_models()

    def get_default_model(self) -> ResolvedRuntimeModel:
        return self.resolve_binding(DEFAULT_CHAT_BINDING)

    def resolve_binding(self, binding_key: str) -> ResolvedRuntimeModel:
        database_models = self._list_database_runtime_models()
        if database_models:
            binding = self._repo.get_binding(binding_key)
            if binding is not None:
                for item in database_models:
                    if item.model.id == binding.provider_model_id:
                        return item.model_copy(update={"binding_key": binding_key})
                raise ValueError(f"Binding '{binding_key}' points to an unknown runtime model")

            if binding_key == DEFAULT_CHAT_BINDING:
                return self._pick_database_default(database_models).model_copy(
                    update={"binding_key": binding_key}
                )
            raise ValueError(f"Binding '{binding_key}' not found")

        legacy_models = self._list_legacy_runtime_models()
        if binding_key == DEFAULT_CHAT_BINDING and legacy_models:
            return legacy_models[0].model_copy(update={"binding_key": binding_key})
        raise ValueError(f"Binding '{binding_key}' not found")

    def resolve_model(self, identity: str) -> ResolvedRuntimeModel:
        for item in self.list_runtime_models():
            if item.matches_identity(identity):
                return item
        raise ValueError(f"Runtime model '{identity}' not found")

    def _list_database_runtime_models(self) -> list[ResolvedRuntimeModel]:
        instances = {
            item.id: item
            for item in self._repo.list_provider_instances()
            if item.status == "active"
        }
        if not instances:
            return []

        templates = {
            item.id: item
            for item in self._repo.list_provider_templates()
        }
        models = [
            item
            for item in self._repo.list_all_provider_models()
            if item.is_enabled and item.provider_instance_id in instances
        ]
        if not models:
            return []

        model_id_counts = Counter(item.model_id for item in models)
        resolved: list[ResolvedRuntimeModel] = []
        for item in models:
            provider = instances[item.provider_instance_id]
            template = (
                templates.get(provider.provider_template_id)
                if provider.provider_template_id is not None
                else None
            )
            resolved.append(
                self._build_database_runtime_model(
                    provider=provider,
                    template=template,
                    model=item,
                    model_id_counts=model_id_counts,
                )
            )
        resolved.sort(
            key=lambda item: (
                0 if item.model.is_primary else 1,
                item.model.priority_order,
                item.runtime_name,
            )
        )
        return resolved

    def _build_database_runtime_model(
        self,
        *,
        provider: ProviderInstance,
        template: ProviderTemplate | None,
        model: ProviderModel,
        model_id_counts: Counter[str],
    ) -> ResolvedRuntimeModel:
        protocol = provider.protocol_override or (
            template.protocol if template is not None else "openai-compatible"
        )
        api_base = provider.base_url_override or (
            template.base_url if template is not None else None
        )
        api_key = (
            decrypt_provider_secret(
                provider.api_key_encrypted,
                self._secret_provider(),
            )
            if provider.api_key_encrypted
            else None
        )
        provider_key = template.code if template is not None else provider.id
        runtime_name = (
            model.model_id
            if model_id_counts[model.model_id] == 1
            else f"{provider_key}:{model.model_id}"
        )
        payload = dict(model.metadata_json or {})
        payload.update(
            {
                "name": runtime_name,
                "display_name": model.display_name,
                "description": template.description if template is not None else None,
                "use": _provider_use_for_protocol(protocol),
                "model": model.model_id,
                "supports_thinking": bool(model.supports_thinking),
                "supports_reasoning_effort": bool(model.supports_reasoning_effort),
                "supports_vision": bool(model.supports_vision),
            }
        )
        if api_key is not None:
            payload["api_key"] = api_key
        if api_base is not None:
            payload["api_base"] = api_base
        if model.max_output_tokens is not None and "max_tokens" not in payload:
            payload["max_tokens"] = model.max_output_tokens
        if model.context_window is not None and "context_window" not in payload:
            payload["context_window"] = model.context_window

        return ResolvedRuntimeModel(
            runtime_name=runtime_name,
            source_kind="database",
            provider=provider,
            template=template,
            model=model,
            runtime_model_config=ModelConfig.model_validate(payload),
            api_key=api_key,
            api_base=api_base,
        )

    def _list_legacy_runtime_models(self) -> list[ResolvedRuntimeModel]:
        app_config = self._app_config_provider()
        resolved: list[ResolvedRuntimeModel] = []
        for raw_model_config in getattr(app_config, "models", []):
            model_config = self._normalize_legacy_model_config(raw_model_config)
            provider_id = f"legacy-provider::{model_config.name}"
            provider = ProviderInstance(
                id=provider_id,
                kind="builtin",
                display_name=model_config.display_name or model_config.name,
                protocol_override=self._protocol_from_use(model_config.use),
                base_url_override=getattr(model_config, "api_base", None),
                api_key_masked=None,
                status="active",
            )
            provider_model = ProviderModel(
                id=f"legacy-model::{model_config.name}",
                provider_instance_id=provider_id,
                model_id=model_config.model,
                display_name=model_config.display_name or model_config.model,
                source="manual",
                is_enabled=True,
                is_primary=len(resolved) == 0,
                priority_order=len(resolved),
                supports_thinking=model_config.supports_thinking,
                supports_reasoning_effort=model_config.supports_reasoning_effort,
                supports_vision=model_config.supports_vision,
                metadata_json=model_config.model_dump(
                    exclude_none=True,
                    exclude={
                        "name",
                        "display_name",
                        "description",
                        "use",
                        "model",
                        "supports_thinking",
                        "supports_reasoning_effort",
                        "supports_vision",
                    },
                ),
            )
            resolved.append(
                ResolvedRuntimeModel(
                    runtime_name=model_config.name,
                    source_kind="legacy",
                    provider=provider,
                    template=None,
                    model=provider_model,
                    runtime_model_config=model_config,
                    api_key=getattr(model_config, "api_key", None),
                    api_base=getattr(model_config, "api_base", None),
                )
            )
        return resolved

    def _normalize_legacy_model_config(self, raw_model_config: Any) -> ModelConfig:
        payload: dict[str, Any] = {}
        if isinstance(raw_model_config, ModelConfig):
            payload = raw_model_config.model_dump(exclude_none=True)
        elif hasattr(raw_model_config, "model_dump") and callable(raw_model_config.model_dump):
            dumped = raw_model_config.model_dump(exclude_none=True)
            if isinstance(dumped, dict):
                payload = dict(dumped)

        name = _safe_required_str(getattr(raw_model_config, "name", None), "legacy-model")
        display_name = _safe_optional_str(getattr(raw_model_config, "display_name", None)) or name
        model_name = _safe_required_str(getattr(raw_model_config, "model", None), name)
        use = _safe_required_str(
            getattr(raw_model_config, "use", None),
            "langchain_openai:ChatOpenAI",
        )

        payload.update(
            {
                "name": name,
                "display_name": display_name,
                "description": _safe_optional_str(getattr(raw_model_config, "description", None)),
                "use": use,
                "model": model_name,
                "supports_thinking": _safe_bool(getattr(raw_model_config, "supports_thinking", None)),
                "supports_reasoning_effort": _safe_bool(
                    getattr(raw_model_config, "supports_reasoning_effort", None)
                ),
                "supports_vision": _safe_bool(getattr(raw_model_config, "supports_vision", None)),
            }
        )

        api_key = _safe_optional_str(getattr(raw_model_config, "api_key", None))
        api_base = _safe_optional_str(getattr(raw_model_config, "api_base", None))
        if api_key is not None:
            payload["api_key"] = api_key
        if api_base is not None:
            payload["api_base"] = api_base

        return ModelConfig.model_validate(payload)

    @staticmethod
    def _pick_database_default(
        models: list[ResolvedRuntimeModel],
    ) -> ResolvedRuntimeModel:
        for item in models:
            if item.model.is_primary:
                return item
        return models[0]

    @staticmethod
    def _protocol_from_use(use: str) -> ProviderProtocol:
        if "anthropic" in use.lower():
            return "anthropic-compatible"
        return "openai-compatible"


def get_model_registry_service(
    *,
    repo: ModelManagementRepository | None = None,
    secret_provider: Callable[[], bytes] | None = None,
    app_config_provider: Callable[[], object] | None = None,
) -> ModelRegistryService:
    return ModelRegistryService(
        repo=repo,
        secret_provider=secret_provider,
        app_config_provider=app_config_provider,
    )
