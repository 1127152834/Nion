"""Config-center repository for read/validate/write operations."""

from __future__ import annotations

from copy import deepcopy
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from nion.config.app_config import (
    AppConfig,
    get_app_config_runtime_status,
    reload_app_config,
)
from nion.config.config_store import VersionConflictError, create_config_store
from nion.config.extensions_config import ExtensionsConfig
from nion.sandbox.sandbox_provider import shutdown_sandbox_provider


class ConfigValidationError(Exception):
    """Raised when configuration validation fails."""

    def __init__(
        self,
        errors: list[dict[str, Any]],
        warnings: list[dict[str, Any]] | None = None,
    ):
        super().__init__("Config validation failed")
        self.errors = errors
        self.warnings = warnings or []


class ConfigRepository:
    """Repository for managing config-center reads and writes."""

    def __init__(self):
        self._store = create_config_store()

    def read(self) -> tuple[dict[str, Any], str, Path]:
        return self._store.read()

    def read_legacy_model_management_payload(
        self,
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        config_dict, _, _ = self.read()
        raw_providers = config_dict.get("model_providers")
        raw_models = config_dict.get("models")

        providers = [
            dict(item)
            for item in (raw_providers if isinstance(raw_providers, list) else [])
            if isinstance(item, dict)
        ]
        models = [
            dict(item)
            for item in (raw_models if isinstance(raw_models, list) else [])
            if isinstance(item, dict)
        ]
        return providers, models

    @staticmethod
    def _normalize_validation_error(error: dict[str, Any]) -> dict[str, Any]:
        return {
            "path": [str(item) for item in error.get("loc", ())],
            "message": error.get("msg", "Invalid value"),
            "type": error.get("type", "validation_error"),
        }

    def validate_with_warnings(
        self, config_dict: dict[str, Any]
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        payload = deepcopy(config_dict)
        payload = AppConfig.resolve_env_variables(payload, strict=False)
        payload["extensions"] = ExtensionsConfig.from_file().model_dump()

        try:
            AppConfig.model_validate(payload)
        except ValidationError as exc:
            return (
                [self._normalize_validation_error(item) for item in exc.errors()],
                [],
            )

        return [], []

    def validate(self, config_dict: dict[str, Any]) -> list[dict[str, Any]]:
        errors, _ = self.validate_with_warnings(config_dict)
        return errors

    def write_with_warnings(
        self, config_dict: dict[str, Any], expected_version: str
    ) -> tuple[str, list[dict[str, Any]]]:
        errors, warnings = self.validate_with_warnings(config_dict)
        if errors:
            raise ConfigValidationError(errors=errors, warnings=warnings)

        new_version = self._store.write(
            config_dict=config_dict, expected_version=expected_version
        )
        reload_app_config(process_name="gateway")
        shutdown_sandbox_provider()
        return new_version, warnings

    def write(self, config_dict: dict[str, Any], expected_version: str) -> str:
        new_version, _ = self.write_with_warnings(config_dict, expected_version)
        return new_version

    def get_runtime_status(self) -> dict[str, Any]:
        return get_app_config_runtime_status(process_name="gateway")


__all__ = [
    "ConfigRepository",
    "ConfigValidationError",
    "VersionConflictError",
]
