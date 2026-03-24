import logging
import os
import sys
import threading
import time
from pathlib import Path
from typing import Any, Self

import yaml
from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict, Field

from nion.config.automation_config import AutomationConfig, load_automation_config_from_dict
from nion.config.checkpointer_config import CheckpointerConfig, load_checkpointer_config_from_dict
from nion.config.channels_config import ChannelsAppConfig, load_channels_config_from_dict
from nion.config.config_store import (
    DEFAULT_CHECKPOINTER_CONFIG,
    ConfigStoreNotInitializedError,
    create_config_store,
)
from nion.config.extensions_config import ExtensionsConfig
from nion.config.guardrails_config import load_guardrails_config_from_dict
from nion.config.memory_config import load_memory_config_from_dict
from nion.config.model_config import ModelConfig
from nion.config.sandbox_config import SandboxConfig
from nion.config.skills_config import SkillsConfig
from nion.config.subagents_config import (
    SubagentsAppConfig,
    load_subagents_config_from_dict,
)
from nion.config.suggestions_config import (
    SuggestionsConfig,
    load_suggestions_config_from_dict,
)
from nion.config.summarization_config import (
    SummarizationConfig,
    load_summarization_config_from_dict,
)
from nion.config.title_config import TitleConfig, load_title_config_from_dict
from nion.config.tool_config import ToolConfig, ToolGroupConfig
from nion.config.tool_search_config import ToolSearchConfig, load_tool_search_config_from_dict

load_dotenv()

logger = logging.getLogger(__name__)


class AppConfig(BaseModel):
    """Config for the Nion application"""

    models: list[ModelConfig] = Field(default_factory=list, description="Available models")
    title: TitleConfig = Field(default_factory=TitleConfig, description="Thread title generation policy")
    summarization: SummarizationConfig = Field(
        default_factory=SummarizationConfig,
        description="Conversation summarization policy",
    )
    subagents: SubagentsAppConfig = Field(
        default_factory=SubagentsAppConfig,
        description="Subagent timeout policy",
    )
    suggestions: SuggestionsConfig = Field(
        default_factory=SuggestionsConfig,
        description="Follow-up suggestion generation policy",
    )
    automation: AutomationConfig = Field(
        default_factory=AutomationConfig,
        description="Automation runtime configuration",
    )
    channels: ChannelsAppConfig = Field(
        default_factory=ChannelsAppConfig,
        description="Channel control-plane defaults and credentials",
    )
    sandbox: SandboxConfig = Field(description="Sandbox configuration")
    tools: list[ToolConfig] = Field(default_factory=list, description="Available tools")
    tool_groups: list[ToolGroupConfig] = Field(default_factory=list, description="Available tool groups")
    skills: SkillsConfig = Field(default_factory=SkillsConfig, description="Skills configuration")
    extensions: ExtensionsConfig = Field(default_factory=ExtensionsConfig, description="Extensions configuration (MCP servers and skills state)")
    tool_search: ToolSearchConfig = Field(default_factory=ToolSearchConfig, description="Tool search / deferred loading configuration")
    model_config = ConfigDict(extra="allow", frozen=False)
    checkpointer: CheckpointerConfig | None = Field(default=None, description="Checkpointer configuration")

    @classmethod
    def resolve_config_path(cls, config_path: str | None = None) -> Path:
        """Resolve the config file path.

        Priority:
        1. If provided `config_path` argument, use it.
        2. If provided `NION_CONFIG_PATH` environment variable, use it.
        3. Otherwise, first check the `config.yaml` in the current directory, then fallback to `config.yaml` in the parent directory.
        """
        if config_path:
            path = Path(config_path)
            if not Path.exists(path):
                raise FileNotFoundError(f"Config file specified by param `config_path` not found at {path}")
            return path
        elif os.getenv("NION_CONFIG_PATH"):
            path = Path(os.getenv("NION_CONFIG_PATH"))
            if not Path.exists(path):
                raise FileNotFoundError(f"Config file specified by environment variable `NION_CONFIG_PATH` not found at {path}")
            return path
        else:
            # Check if the config.yaml is in the current directory
            path = Path(os.getcwd()) / "config.yaml"
            if not path.exists():
                # Check if the config.yaml is in the parent directory of CWD
                path = Path(os.getcwd()).parent / "config.yaml"
                if not path.exists():
                    raise FileNotFoundError("`config.yaml` file not found at the current directory nor its parent directory")
            return path

    @classmethod
    def _hydrate_auxiliary_configs(cls, config_data: dict[str, Any]) -> None:
        """Load singleton sub-configs from the config payload."""
        load_title_config_from_dict(config_data.get("title") or {})
        load_summarization_config_from_dict(config_data.get("summarization") or {})
        if "memory" in config_data:
            load_memory_config_from_dict(config_data["memory"])
        if "automation" in config_data:
            load_automation_config_from_dict(config_data["automation"])
        load_subagents_config_from_dict(config_data.get("subagents") or {})
        load_suggestions_config_from_dict(config_data.get("suggestions") or {})
        load_channels_config_from_dict(config_data.get("channels") or {})
        if "tool_search" in config_data:
            load_tool_search_config_from_dict(config_data["tool_search"])
        if "guardrails" in config_data:
            load_guardrails_config_from_dict(config_data["guardrails"])

        raw_checkpointer = config_data.get("checkpointer")
        if isinstance(raw_checkpointer, dict) and isinstance(
            raw_checkpointer.get("type"), str
        ):
            raw_type = raw_checkpointer.get("type")
            if raw_type == "memory":
                load_checkpointer_config_from_dict({"type": "memory"})
                return
            if raw_type == "sqlite" and bool(raw_checkpointer.get("connection_string")):
                load_checkpointer_config_from_dict(raw_checkpointer)
                return

        fallback = dict(DEFAULT_CHECKPOINTER_CONFIG)
        config_data["checkpointer"] = fallback
        load_checkpointer_config_from_dict(fallback)

    @classmethod
    def _validate_payload(cls, payload: dict[str, Any], *, strict_env: bool) -> Self:
        resolved_payload = cls.resolve_env_variables(payload, strict=strict_env)
        cls._hydrate_auxiliary_configs(resolved_payload)
        resolved_payload["extensions"] = ExtensionsConfig.from_file().model_dump()
        return cls.model_validate(resolved_payload)

    @classmethod
    def from_file(cls, config_path: str | None = None, *, strict_env: bool = False) -> Self:
        """Load config directly from YAML (legacy escape hatch)."""
        resolved_path = cls.resolve_config_path(config_path)
        with open(resolved_path, encoding="utf-8") as f:
            config_data = yaml.safe_load(f) or {}

        if not isinstance(config_data, dict):
            raise ValueError("Config file root must be a mapping object")

        cls._check_config_version(config_data, resolved_path)
        return cls._validate_payload(config_data, strict_env=strict_env)

    @classmethod
    def from_store_with_meta(cls, *, strict_env: bool = False) -> tuple[Self, str, Path]:
        """Load config from the SQLite config center."""
        store = create_config_store()
        payload, version, db_path = store.read()
        if not isinstance(payload, dict):
            raise ValueError("Config store root must be a mapping object")
        config = cls._validate_payload(payload, strict_env=strict_env)
        return config, version, db_path

    @classmethod
    def from_store(cls, *, strict_env: bool = False) -> Self:
        config, _, _ = cls.from_store_with_meta(strict_env=strict_env)
        return config

    @classmethod
    def from_store_or_file_with_meta(
        cls,
        config_path: str | None = None,
        *,
        strict_env: bool = False,
    ) -> tuple[Self, str | None, Path | None, str]:
        """Load config from store first, with minimal legacy fallback."""
        store = create_config_store()

        if store.exists():
            try:
                config, version, source_path = cls.from_store_with_meta(
                    strict_env=strict_env
                )
                return config, version, source_path, "sqlite"
            except Exception as exc:  # noqa: BLE001
                raise RuntimeError(f"Config store exists but failed to load: {exc}") from exc

        config, version, source_path = cls.from_store_with_meta(strict_env=strict_env)
        return config, version, source_path, "sqlite"

    @classmethod
    def from_store_or_file(
        cls, config_path: str | None = None, *, strict_env: bool = False
    ) -> Self:
        config, _, _, _ = cls.from_store_or_file_with_meta(
            config_path, strict_env=strict_env
        )
        return config

    @classmethod
    def _check_config_version(cls, config_data: dict, config_path: Path) -> None:
        """Check if the user's config.yaml is outdated compared to config.example.yaml.

        Emits a warning if the user's config_version is lower than the example's.
        Missing config_version is treated as version 0 (pre-versioning).
        """
        try:
            user_version = int(config_data.get("config_version", 0))
        except (TypeError, ValueError):
            user_version = 0

        # Find config.example.yaml by searching config.yaml's directory and its parents
        example_path = None
        search_dir = config_path.parent
        for _ in range(5):  # search up to 5 levels
            candidate = search_dir / "config.example.yaml"
            if candidate.exists():
                example_path = candidate
                break
            parent = search_dir.parent
            if parent == search_dir:
                break
            search_dir = parent
        if example_path is None:
            return

        try:
            with open(example_path, encoding="utf-8") as f:
                example_data = yaml.safe_load(f)
            raw = example_data.get("config_version", 0) if example_data else 0
            try:
                example_version = int(raw)
            except (TypeError, ValueError):
                example_version = 0
        except Exception:
            return

        if user_version < example_version:
            logger.warning(
                "Your config.yaml (version %d) is outdated — the latest version is %d. "
                "Run `make config-upgrade` to merge new fields into your config.",
                user_version,
                example_version,
            )

    @classmethod
    def resolve_env_variables(cls, config: Any, *, strict: bool = True) -> Any:
        """Recursively resolve environment variables in the config.

        Environment variables are resolved using the `os.getenv` function. Example: $OPENAI_API_KEY

        Args:
            config: The config to resolve environment variables in.

        Returns:
            The config with environment variables resolved.
        """
        if isinstance(config, str):
            if config.startswith("$"):
                env_value = os.getenv(config[1:])
                if env_value is None:
                    if strict:
                        raise ValueError(
                            f"Environment variable {config[1:]} not found for config value {config}"
                        )
                    return config
                return env_value
            return config
        elif isinstance(config, dict):
            return {k: cls.resolve_env_variables(v, strict=strict) for k, v in config.items()}
        elif isinstance(config, list):
            return [cls.resolve_env_variables(item, strict=strict) for item in config]
        return config

    def get_model_config(self, name: str) -> ModelConfig | None:
        """Get the model config by name.

        Args:
            name: The name of the model to get the config for.

        Returns:
            The model config if found, otherwise None.
        """
        return next((model for model in self.models if model.name == name), None)

    def get_tool_config(self, name: str) -> ToolConfig | None:
        """Get the tool config by name.

        Args:
            name: The name of the tool to get the config for.

        Returns:
            The tool config if found, otherwise None.
        """
        return next((tool for tool in self.tools if tool.name == name), None)

    def get_tool_group_config(self, name: str) -> ToolGroupConfig | None:
        """Get the tool group config by name.

        Args:
            name: The name of the tool group to get the config for.

        Returns:
            The tool group config if found, otherwise None.
        """
        return next((group for group in self.tool_groups if group.name == name), None)


_app_config: AppConfig | None = None
_app_config_version: str | None = None
_app_config_source_path: Path | None = None
_app_config_source_kind: str = "unknown"
_app_config_last_error: str | None = None
_app_config_last_loaded_at: str | None = None
_app_config_is_custom = False

_reload_lock = threading.Lock()
_last_version_check_at: float = 0.0
_last_checked_store_version: str | None = None
_MIN_RELOAD_INTERVAL_SECONDS = float(
    os.getenv("NION_CONFIG_RELOAD_THROTTLE_SECONDS", "0.8")
)


def _detect_process_name(explicit: str | None = None) -> str:
    if explicit:
        return explicit
    if env_name := os.getenv("NION_RUNTIME_PROCESS_NAME"):
        return env_name

    argv_text = " ".join(sys.argv).lower()
    if "langgraph" in argv_text:
        return "langgraph"
    if "gateway" in argv_text or "uvicorn" in argv_text:
        return "gateway"
    return "runtime"


def _record_runtime_status(process_name: str, *, status: str, reason: str | None) -> None:
    """Best-effort persistence of process runtime load status."""
    try:
        store = create_config_store()
        source_path = (
            str(_app_config_source_path)
            if _app_config_source_path is not None
            else "unknown"
        )
        tools_count = len(_app_config.tools) if _app_config is not None else None
        store.update_runtime_status(
            process_name,
            loaded_version=_app_config_version,
            source_path=source_path,
            tools_count=tools_count,
            status=status,
            reason=reason,
        )
    except Exception as exc:  # noqa: BLE001
        logger.debug("Failed to record runtime config status: %s", exc)


def _set_cached_config(
    config: AppConfig,
    *,
    version: str | None,
    source_path: Path | None,
    source_kind: str,
    process_name: str,
) -> AppConfig:
    global _app_config
    global _app_config_version
    global _app_config_source_path
    global _app_config_source_kind
    global _app_config_last_error
    global _app_config_last_loaded_at

    _app_config = config
    _app_config_version = version
    _app_config_source_path = source_path
    _app_config_source_kind = source_kind
    _app_config_last_error = None
    _app_config_last_loaded_at = time.strftime(
        "%Y-%m-%dT%H:%M:%S%z", time.localtime()
    )
    _record_runtime_status(process_name, status="ok", reason=None)
    return config


def _load_and_cache(
    config_path: str | None = None, *, process_name: str | None = None
) -> AppConfig:
    process = _detect_process_name(process_name)
    try:
        config, version, source_path, source_kind = AppConfig.from_store_or_file_with_meta(
            config_path,
            strict_env=False,
        )
        return _set_cached_config(
            config,
            version=version,
            source_path=source_path,
            source_kind=source_kind,
            process_name=process,
        )
    except Exception as exc:  # noqa: BLE001
        global _app_config_last_error
        _app_config_last_error = str(exc)
        _record_runtime_status(process, status="error", reason=str(exc))
        raise


def get_app_config(*, process_name: str | None = None) -> AppConfig:
    """Get the cached store-backed config instance."""
    global _app_config
    if _app_config is None:
        return _load_and_cache(process_name=process_name)
    return _app_config


def reload_app_config(
    config_path: str | None = None, *, process_name: str | None = None
) -> AppConfig:
    """Force reload config from the config center."""
    with _reload_lock:
        return _load_and_cache(config_path, process_name=process_name)


def ensure_latest_app_config(*, process_name: str | None = None) -> AppConfig:
    """Reload long-running processes when the config-store version changes."""
    global _last_version_check_at
    global _last_checked_store_version

    process = _detect_process_name(process_name)

    with _reload_lock:
        current = get_app_config(process_name=process)
        now = time.monotonic()
        if now - _last_version_check_at < _MIN_RELOAD_INTERVAL_SECONDS:
            return current
        _last_version_check_at = now

        store = create_config_store()
        try:
            store_version, _ = store.read_version()
        except ConfigStoreNotInitializedError:
            return current

        if _app_config_version == store_version:
            _last_checked_store_version = store_version
            return current

        try:
            config, version, source_path = AppConfig.from_store_with_meta(
                strict_env=False
            )
            _last_checked_store_version = version
            return _set_cached_config(
                config,
                version=version,
                source_path=source_path,
                source_kind="sqlite",
                process_name=process,
            )
        except Exception as exc:  # noqa: BLE001
            global _app_config_last_error
            _app_config_last_error = str(exc)
            _record_runtime_status(process, status="error", reason=str(exc))
            raise RuntimeError(
                f"Failed to reload updated config version {store_version}: {exc}"
            ) from exc


def get_app_config_runtime_status(*, process_name: str | None = None) -> dict[str, Any]:
    """Return runtime/store alignment details for observability."""
    process = _detect_process_name(process_name)

    store = create_config_store()
    try:
        store_version, store_path = store.read_version()
        store_source_path: str | None = str(store_path)
    except ConfigStoreNotInitializedError:
        store_version = None
        store_source_path = None

    runtime_processes = store.read_runtime_statuses()

    return {
        "process_name": process,
        "store_version": store_version,
        "store_source_path": store_source_path,
        "loaded_version": _app_config_version,
        "loaded_source_path": str(_app_config_source_path)
        if _app_config_source_path is not None
        else None,
        "source_kind": _app_config_source_kind,
        "tools_count": len(_app_config.tools) if _app_config is not None else 0,
        "loaded_tools": [tool.name for tool in _app_config.tools]
        if _app_config is not None
        else [],
        "last_loaded_at": _app_config_last_loaded_at,
        "last_error": _app_config_last_error,
        "runtime_processes": runtime_processes,
        "is_in_sync": bool(_app_config_version) and _app_config_version == store_version,
    }


def reset_app_config() -> None:
    """Reset cached config and runtime status metadata."""
    global _app_config
    global _app_config_version
    global _app_config_source_path
    global _app_config_source_kind
    global _app_config_last_error
    global _app_config_last_loaded_at
    global _app_config_is_custom
    global _last_version_check_at
    global _last_checked_store_version
    _app_config = None
    _app_config_version = None
    _app_config_source_path = None
    _app_config_source_kind = "unknown"
    _app_config_last_error = None
    _app_config_last_loaded_at = None
    _app_config_is_custom = False
    _last_version_check_at = 0.0
    _last_checked_store_version = None


def set_app_config(
    config: AppConfig, *, version: str | None = None, source_path: Path | None = None
) -> None:
    """Inject a custom config instance, primarily for tests."""
    global _app_config
    global _app_config_version
    global _app_config_source_path
    global _app_config_source_kind
    global _app_config_last_error
    global _app_config_last_loaded_at
    global _app_config_is_custom
    _app_config = config
    _app_config_version = version
    _app_config_source_path = source_path
    _app_config_source_kind = "injected"
    _app_config_last_error = None
    _app_config_last_loaded_at = time.strftime("%Y-%m-%dT%H:%M:%S%z", time.localtime())
    _app_config_is_custom = True
