import logging

from langchain.chat_models import BaseChatModel

from nion.config import (
    get_tracing_config,
    is_tracing_enabled,
)
from nion.config.app_config import ensure_latest_app_config
from nion.model_management.service import get_model_registry_service
from nion.reflection import resolve_class
from nion.telemetry.token_source import TokenSourceCallbackHandler

logger = logging.getLogger(__name__)

RUNTIME_METADATA_FIELDS = {
    "context_window",
}


def get_app_config():
    return ensure_latest_app_config(process_name="langgraph")


def resolve_model_name_with_fallback(
    requested_name: str | None = None,
    fallback_name: str | None = None,
) -> str:
    """Resolve a runtime model name, falling back to a valid default when stale."""
    registry = get_model_registry_service(app_config_provider=get_app_config)
    default_name = registry.get_default_model().runtime_name

    def _normalize(value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    def _resolve(value: str | None) -> str | None:
        normalized = _normalize(value)
        if normalized is None:
            return None
        try:
            return registry.resolve_model(normalized).runtime_name
        except ValueError:
            return None

    normalized_requested = _normalize(requested_name)
    resolved_requested = _resolve(normalized_requested)
    if resolved_requested is not None:
        return resolved_requested

    normalized_fallback = _normalize(fallback_name)
    resolved_fallback = _resolve(normalized_fallback)
    if resolved_fallback is not None:
        if normalized_requested is not None and normalized_requested != resolved_fallback:
            logger.warning(
                "Runtime model '%s' not found; falling back to '%s'.",
                normalized_requested,
                resolved_fallback,
            )
        return resolved_fallback

    if normalized_requested is not None and normalized_requested != default_name:
        logger.warning(
            "Runtime model '%s' not found; falling back to default model '%s'.",
            normalized_requested,
            default_name,
        )
    return default_name


def get_app_config():
    return ensure_latest_app_config(process_name="langgraph")


def create_chat_model(name: str | None = None, thinking_enabled: bool = False, **kwargs) -> BaseChatModel:
    """Create a chat model instance from the runtime model registry.

    Args:
        name: The runtime model name to create. If None, the default binding is used.

    Returns:
        A chat model instance.
    """
    registry = get_model_registry_service(app_config_provider=get_app_config)
    resolved = registry.resolve_model(name) if name is not None else registry.get_default_model()
    name = resolved.runtime_name
    model_config = resolved.runtime_model_config
    model_class = resolve_class(model_config.use, BaseChatModel)
    model_settings_from_config = model_config.model_dump(
        exclude_none=True,
        exclude={
            "use",
            "name",
            "display_name",
            "description",
            "provider_id",
            "supports_thinking",
            "supports_reasoning_effort",
            "when_thinking_enabled",
            "thinking",
            "supports_vision",
            "supports_video",
        },
    )
    if "api_base" in model_settings_from_config:
        api_base = model_settings_from_config.pop("api_base")
        if "base_url" not in model_settings_from_config:
            model_settings_from_config["base_url"] = api_base
    for field_name in RUNTIME_METADATA_FIELDS:
        model_settings_from_config.pop(field_name, None)

    # Compute effective when_thinking_enabled by merging in the `thinking` shortcut field.
    # The `thinking` shortcut is equivalent to setting when_thinking_enabled["thinking"].
    has_thinking_settings = (model_config.when_thinking_enabled is not None) or (model_config.thinking is not None)
    effective_wte: dict = dict(model_config.when_thinking_enabled) if model_config.when_thinking_enabled else {}
    if model_config.thinking is not None:
        merged_thinking = {**(effective_wte.get("thinking") or {}), **model_config.thinking}
        effective_wte = {**effective_wte, "thinking": merged_thinking}
    if thinking_enabled and has_thinking_settings:
        if not model_config.supports_thinking:
            raise ValueError(
                f"Model {name} does not support thinking. Enable `supports_thinking` in the Config Center model settings."
            ) from None
        if effective_wte:
            model_settings_from_config.update(effective_wte)
    if not thinking_enabled and has_thinking_settings:
        if effective_wte.get("extra_body", {}).get("thinking", {}).get("type"):
            # OpenAI-compatible gateway: thinking is nested under extra_body
            kwargs.update({"extra_body": {"thinking": {"type": "disabled"}}})
            kwargs.update({"reasoning_effort": "minimal"})
        elif effective_wte.get("thinking", {}).get("type"):
            # Native langchain_anthropic: thinking is a direct constructor parameter
            kwargs.update({"thinking": {"type": "disabled"}})
    if not model_config.supports_reasoning_effort and "reasoning_effort" in kwargs:
        del kwargs["reasoning_effort"]

    # For Codex Responses API models: map thinking mode to reasoning_effort
    from nion.models.openai_codex_provider import CodexChatModel

    if issubclass(model_class, CodexChatModel):
        # The ChatGPT Codex endpoint currently rejects max_tokens/max_output_tokens.
        model_settings_from_config.pop("max_tokens", None)

        # Use explicit reasoning_effort from frontend if provided (low/medium/high)
        explicit_effort = kwargs.pop("reasoning_effort", None)
        if not thinking_enabled:
            model_settings_from_config["reasoning_effort"] = "none"
        elif explicit_effort and explicit_effort in ("low", "medium", "high", "xhigh"):
            model_settings_from_config["reasoning_effort"] = explicit_effort
        elif "reasoning_effort" not in model_settings_from_config:
            model_settings_from_config["reasoning_effort"] = "medium"

    model_instance = model_class(**kwargs, **model_settings_from_config)

    existing_callbacks = model_instance.callbacks or []
    model_instance.callbacks = [*existing_callbacks, TokenSourceCallbackHandler()]

    if is_tracing_enabled():
        try:
            from langchain_core.tracers.langchain import LangChainTracer

            tracing_config = get_tracing_config()
            tracer = LangChainTracer(
                project_name=tracing_config.project,
            )
            existing_callbacks = model_instance.callbacks or []
            model_instance.callbacks = [*existing_callbacks, tracer]
            logger.debug(f"LangSmith tracing attached to model '{name}' (project='{tracing_config.project}')")
        except Exception as e:
            logger.warning(f"Failed to attach LangSmith tracing to model '{name}': {e}")
    return model_instance
