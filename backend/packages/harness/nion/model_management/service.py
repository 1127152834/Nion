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
