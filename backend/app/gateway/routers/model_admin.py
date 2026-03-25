from __future__ import annotations

from collections import defaultdict
from typing import Any

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

from nion.config.config_store import resolve_config_db_path
from nion.model_management import (
    DEFAULT_CHAT_BINDING,
    ModelBinding,
    ModelBindingStatus,
    LegacyModelConfigImporter,
    ModelManagementRepository,
    ProviderInstance,
    ProviderKind,
    ProviderModel,
    ProviderModelSource,
    ProviderProtocol,
    ProviderStatus,
    ProviderTemplate,
    ProviderTestStatus,
    utc_now_iso,
)
from nion.model_management.crypto import decrypt_provider_secret, get_model_management_secret
from nion.model_management.seed import seed_builtin_provider_templates

from . import models as models_router

router = APIRouter(prefix="/api/model-admin", tags=["model-admin"])


class ProviderTemplateListResponse(BaseModel):
    templates: list[ProviderTemplate]


class ProviderInstanceView(BaseModel):
    id: str
    provider_template_id: str | None = None
    kind: ProviderKind
    display_name: str
    protocol_override: ProviderProtocol | None = None
    base_url_override: str | None = None
    custom_headers_json: dict[str, str] | None = None
    api_key_masked: str | None = None
    auth_config_json: dict[str, Any] | None = None
    status: ProviderStatus
    provider_test_status: ProviderTestStatus
    provider_test_message: str | None = None
    provider_test_latency_ms: int | None = None
    provider_last_tested_at: str | None = None
    last_discovery_at: str | None = None
    last_discovery_status: ProviderTestStatus | None = None
    last_discovery_message: str | None = None
    notes: str | None = None
    created_at: str
    updated_at: str
    template: ProviderTemplate | None = None
    models: list[ProviderModel] = Field(default_factory=list)
    primary_model_id: str | None = None


class ProvidersListResponse(BaseModel):
    providers: list[ProviderInstanceView]


class ProviderMutationResponse(BaseModel):
    provider: ProviderInstanceView


class CreateProviderRequest(BaseModel):
    provider_template_id: str | None = None
    kind: ProviderKind | None = None
    display_name: str | None = None
    protocol_override: ProviderProtocol | None = None
    base_url_override: str | None = None
    custom_headers_json: dict[str, str] | None = None
    api_key: str | None = None
    auth_config_json: dict[str, Any] | None = None
    notes: str | None = None
    status: ProviderStatus | None = None


class UpdateProviderRequest(BaseModel):
    display_name: str | None = None
    protocol_override: ProviderProtocol | None = None
    base_url_override: str | None = None
    custom_headers_json: dict[str, str] | None = None
    api_key: str | None = None
    auth_config_json: dict[str, Any] | None = None
    notes: str | None = None
    status: ProviderStatus | None = None


class ProviderExecutionRequest(BaseModel):
    timeout_seconds: float = Field(default=12.0, ge=1.0, le=60.0)
    probe_message: str = Field(default="Hello", min_length=1)


class ProviderTestExecutionResponse(BaseModel):
    provider: ProviderInstanceView
    result: models_router.ModelConnectionTestResponse


class ProviderDiscoveryExecutionResponse(BaseModel):
    provider: ProviderInstanceView
    result: models_router.ProviderModelsResponse


class ProviderModelInput(BaseModel):
    model_id: str
    display_name: str | None = None
    model_type: str | None = None
    source: ProviderModelSource = "manual"
    is_enabled: bool = True
    is_primary: bool = False
    priority_order: int | None = None
    supports_thinking: bool | None = None
    supports_reasoning_effort: bool | None = None
    supports_vision: bool | None = None
    supports_video: bool | None = None
    context_window: int | None = None
    max_output_tokens: int | None = None
    metadata_json: dict[str, Any] | None = None


class AddProviderModelsRequest(BaseModel):
    models: list[ProviderModelInput]


class ProviderModelsMutationResponse(BaseModel):
    provider: ProviderInstanceView
    models: list[ProviderModel]


class UpdateProviderModelRequest(BaseModel):
    model_id: str | None = None
    display_name: str | None = None
    model_type: str | None = None
    is_enabled: bool | None = None
    is_primary: bool | None = None
    priority_order: int | None = None
    supports_thinking: bool | None = None
    supports_reasoning_effort: bool | None = None
    supports_vision: bool | None = None
    supports_video: bool | None = None
    context_window: int | None = None
    max_output_tokens: int | None = None
    metadata_json: dict[str, Any] | None = None


class ProviderModelMutationResponse(BaseModel):
    model: ProviderModel


class ProviderModelTestExecutionResponse(BaseModel):
    provider: ProviderInstanceView
    model: ProviderModel
    result: models_router.ModelConnectionTestResponse


class BindingsListResponse(BaseModel):
    bindings: list[ModelBinding]


class UpdateBindingRequest(BaseModel):
    provider_model_id: str
    fallback_provider_model_id: str | None = None
    status: ModelBindingStatus = "active"


class BindingMutationResponse(BaseModel):
    binding: ModelBinding


def _get_repo() -> ModelManagementRepository:
    repo = ModelManagementRepository(resolve_config_db_path())
    seed_builtin_provider_templates(repo)
    LegacyModelConfigImporter(repo=repo).import_if_needed()
    return repo


def _provider_protocol_or_default(
    instance: ProviderInstance,
    template: ProviderTemplate | None,
) -> ProviderProtocol:
    protocol = instance.protocol_override or (template.protocol if template is not None else None)
    if protocol == "anthropic-compatible":
        return "anthropic-compatible"
    return "openai-compatible"


def _provider_protocol_for_request(
    instance: ProviderInstance,
    template: ProviderTemplate | None,
) -> str:
    protocol = instance.protocol_override or (template.protocol if template is not None else None)
    if protocol == "anthropic-compatible":
        return "anthropic-compatible"
    if protocol == "openai-compatible":
        return "openai-compatible"
    return "auto"


def _provider_use(
    instance: ProviderInstance,
    template: ProviderTemplate | None,
) -> str:
    if _provider_protocol_or_default(instance, template) == "anthropic-compatible":
        return "langchain_anthropic:ChatAnthropic"
    return "langchain_openai:ChatOpenAI"


def _provider_api_base(
    instance: ProviderInstance,
    template: ProviderTemplate | None,
) -> str | None:
    return instance.base_url_override or (template.base_url if template is not None else None)


def _provider_api_key(instance: ProviderInstance) -> str | None:
    if not instance.api_key_encrypted:
        return None
    return decrypt_provider_secret(instance.api_key_encrypted, get_model_management_secret())


def _serialize_provider_view(
    instance: ProviderInstance,
    *,
    template: ProviderTemplate | None,
    models: list[ProviderModel],
) -> ProviderInstanceView:
    primary_model_id = next((item.id for item in models if item.is_primary), None)
    payload = instance.model_dump(exclude={"api_key_encrypted"})
    payload["template"] = template
    payload["models"] = models
    payload["primary_model_id"] = primary_model_id
    return ProviderInstanceView.model_validate(payload)


def _load_provider_view(
    repo: ModelManagementRepository,
    provider_id: str,
) -> ProviderInstanceView:
    instance = repo.get_provider_instance(provider_id)
    if instance is None:
        raise HTTPException(status_code=404, detail=f"Provider '{provider_id}' not found")
    template = (
        repo.get_provider_template(instance.provider_template_id)
        if instance.provider_template_id is not None
        else None
    )
    return _serialize_provider_view(
        instance,
        template=template,
        models=repo.list_provider_models(provider_id),
    )


def _list_provider_views(repo: ModelManagementRepository) -> list[ProviderInstanceView]:
    templates = {item.id: item for item in repo.list_provider_templates()}
    models_by_provider: dict[str, list[ProviderModel]] = defaultdict(list)
    for item in repo.list_all_provider_models():
        models_by_provider[item.provider_instance_id].append(item)

    provider_views: list[ProviderInstanceView] = []
    for provider in repo.list_provider_instances():
        provider_models = models_by_provider.get(provider.id, [])
        provider_models.sort(
            key=lambda item: (0 if item.is_primary else 1, item.priority_order, item.model_id, item.id)
        )
        provider_views.append(
            _serialize_provider_view(
                provider,
                template=templates.get(provider.provider_template_id),
                models=provider_models,
            )
        )
    return provider_views


def _get_provider_template_or_404(
    repo: ModelManagementRepository,
    provider_template_id: str | None,
) -> ProviderTemplate | None:
    if provider_template_id is None:
        return None
    template = repo.get_provider_template(provider_template_id)
    if template is None:
        raise HTTPException(status_code=404, detail=f"Provider template '{provider_template_id}' not found")
    return template


def _create_provider_instance_from_request(
    repo: ModelManagementRepository,
    request: CreateProviderRequest,
) -> ProviderInstance:
    template = _get_provider_template_or_404(repo, request.provider_template_id)
    inferred_kind = request.kind
    if inferred_kind is None:
        if template is not None and template.protocol == "custom":
            inferred_kind = "custom"
        elif template is None:
            inferred_kind = "custom"
        else:
            inferred_kind = "builtin"

    if inferred_kind == "builtin" and template is None:
        raise HTTPException(status_code=400, detail="Built-in providers require a provider template")

    if template is not None and not template.allows_multiple_instances:
        duplicate = next(
            (
                item
                for item in repo.list_provider_instances()
                if item.provider_template_id == template.id and item.status == "active"
            ),
            None,
        )
        if duplicate is not None:
            raise HTTPException(
                status_code=409,
                detail=f"Provider template '{template.code}' already has an active instance",
            )

    protocol_override = request.protocol_override
    if inferred_kind == "custom" and protocol_override is None:
        protocol_override = "openai-compatible"

    instance = ProviderInstance(
        provider_template_id=template.id if template is not None else None,
        kind=inferred_kind,
        display_name=request.display_name or (template.name if template is not None else "Custom Provider"),
        protocol_override=protocol_override,
        base_url_override=request.base_url_override,
        custom_headers_json=request.custom_headers_json,
        auth_config_json=request.auth_config_json,
        notes=request.notes,
        status=request.status or "active",
    )
    return repo.save_provider_instance(instance, api_key_plaintext=request.api_key)


def _update_provider_instance_from_request(
    repo: ModelManagementRepository,
    provider_id: str,
    request: UpdateProviderRequest,
) -> ProviderInstance:
    existing = repo.get_provider_instance(provider_id)
    if existing is None:
        raise HTTPException(status_code=404, detail=f"Provider '{provider_id}' not found")

    update_payload = request.model_dump(exclude_unset=True, exclude={"api_key"})
    update_payload["updated_at"] = utc_now_iso()
    updated = existing.model_copy(update=update_payload)
    api_key_plaintext = request.api_key if "api_key" in request.model_fields_set else None
    return repo.save_provider_instance(updated, api_key_plaintext=api_key_plaintext)


def _set_primary_model(
    repo: ModelManagementRepository,
    provider_instance_id: str,
    provider_model_id: str,
) -> None:
    models = repo.list_provider_models(provider_instance_id)
    for item in models:
        desired = item.id == provider_model_id
        if item.is_primary == desired:
            continue
        repo.save_provider_model(
            item.model_copy(
                update={
                    "is_primary": desired,
                    "updated_at": utc_now_iso(),
                }
            )
        )


def _ensure_default_binding(repo: ModelManagementRepository, provider_model_id: str | None) -> None:
    if provider_model_id is None:
        return
    if repo.get_binding(DEFAULT_CHAT_BINDING) is None:
        repo.save_binding(
            ModelBinding(
                binding_key=DEFAULT_CHAT_BINDING,
                provider_model_id=provider_model_id,
            )
        )


def _delete_bindings_referencing_models(
    repo: ModelManagementRepository,
    provider_model_ids: set[str],
) -> bool:
    removed_default = False
    for binding in repo.list_bindings():
        if (
            binding.provider_model_id in provider_model_ids
            or binding.fallback_provider_model_id in provider_model_ids
        ):
            removed_default = removed_default or binding.binding_key == DEFAULT_CHAT_BINDING
            repo.delete_binding(binding.binding_key)
    return removed_default


def _primary_model_id(provider_models: list[ProviderModel]) -> str | None:
    for item in provider_models:
        if item.is_primary:
            return item.id
    return provider_models[0].id if provider_models else None


@router.get("/templates", response_model=ProviderTemplateListResponse)
async def list_templates(category: str | None = None) -> ProviderTemplateListResponse:
    repo = _get_repo()
    return ProviderTemplateListResponse(templates=repo.list_provider_templates(category=category))


@router.get("/providers", response_model=ProvidersListResponse)
async def list_providers() -> ProvidersListResponse:
    repo = _get_repo()
    return ProvidersListResponse(providers=_list_provider_views(repo))


@router.post("/providers", response_model=ProviderMutationResponse)
async def create_provider(request: CreateProviderRequest) -> ProviderMutationResponse:
    repo = _get_repo()
    provider = _create_provider_instance_from_request(repo, request)
    return ProviderMutationResponse(provider=_load_provider_view(repo, provider.id))


@router.patch("/providers/{provider_id}", response_model=ProviderMutationResponse)
async def update_provider(
    provider_id: str,
    request: UpdateProviderRequest,
) -> ProviderMutationResponse:
    repo = _get_repo()
    provider = _update_provider_instance_from_request(repo, provider_id, request)
    return ProviderMutationResponse(provider=_load_provider_view(repo, provider.id))


@router.delete("/providers/{provider_id}", status_code=204)
async def delete_provider(provider_id: str) -> Response:
    repo = _get_repo()
    provider = repo.get_provider_instance(provider_id)
    if provider is None:
        raise HTTPException(status_code=404, detail=f"Provider '{provider_id}' not found")

    models = repo.list_provider_models(provider_id)
    model_ids = {item.id for item in models}
    removed_default = _delete_bindings_referencing_models(repo, model_ids)
    repo.delete_provider_instance(provider_id)

    if removed_default:
        remaining_models = repo.list_all_provider_models()
        remaining_primary = _primary_model_id(remaining_models)
        _ensure_default_binding(repo, remaining_primary)

    return Response(status_code=204)


@router.post("/providers/{provider_id}/test", response_model=ProviderTestExecutionResponse)
async def test_provider(
    provider_id: str,
    request: ProviderExecutionRequest,
) -> ProviderTestExecutionResponse:
    repo = _get_repo()
    provider = repo.get_provider_instance(provider_id)
    if provider is None:
        raise HTTPException(status_code=404, detail=f"Provider '{provider_id}' not found")
    template = _get_provider_template_or_404(repo, provider.provider_template_id)

    result = await models_router.execute_model_connection_test(
        models_router.ModelConnectionTestRequest(
            use=_provider_use(provider, template),
            api_key=_provider_api_key(provider),
            api_base=_provider_api_base(provider, template),
            provider_protocol=_provider_protocol_for_request(provider, template),
            timeout_seconds=request.timeout_seconds,
            probe_message=request.probe_message,
        )
    )

    updated = provider.model_copy(
        update={
            "provider_test_status": "success" if result.success else "failed",
            "provider_test_message": result.message,
            "provider_test_latency_ms": result.latency_ms,
            "provider_last_tested_at": utc_now_iso(),
            "updated_at": utc_now_iso(),
        }
    )
    saved = repo.save_provider_instance(updated)
    return ProviderTestExecutionResponse(
        provider=_load_provider_view(repo, saved.id),
        result=result,
    )


@router.post("/providers/{provider_id}/discover-models", response_model=ProviderDiscoveryExecutionResponse)
async def discover_provider_models(
    provider_id: str,
    request: ProviderExecutionRequest,
) -> ProviderDiscoveryExecutionResponse:
    repo = _get_repo()
    provider = repo.get_provider_instance(provider_id)
    if provider is None:
        raise HTTPException(status_code=404, detail=f"Provider '{provider_id}' not found")
    template = _get_provider_template_or_404(repo, provider.provider_template_id)

    result = await models_router.execute_provider_model_discovery(
        models_router.ProviderModelsRequest(
            use=_provider_use(provider, template),
            api_key=_provider_api_key(provider),
            api_base=_provider_api_base(provider, template),
            provider_protocol=_provider_protocol_for_request(provider, template),
            timeout_seconds=request.timeout_seconds,
        )
    )

    updated = provider.model_copy(
        update={
            "last_discovery_status": "success" if result.success else "failed",
            "last_discovery_message": result.message,
            "last_discovery_at": utc_now_iso(),
            "updated_at": utc_now_iso(),
        }
    )
    saved = repo.save_provider_instance(updated)
    return ProviderDiscoveryExecutionResponse(
        provider=_load_provider_view(repo, saved.id),
        result=result,
    )


@router.post("/providers/{provider_id}/models", response_model=ProviderModelsMutationResponse)
async def add_provider_models(
    provider_id: str,
    request: AddProviderModelsRequest,
) -> ProviderModelsMutationResponse:
    repo = _get_repo()
    provider = repo.get_provider_instance(provider_id)
    if provider is None:
        raise HTTPException(status_code=404, detail=f"Provider '{provider_id}' not found")

    existing_models = repo.list_provider_models(provider_id)
    existing_by_model_id = {item.model_id: item for item in existing_models}
    next_priority = max((item.priority_order for item in existing_models), default=-1) + 1
    saved_models: list[ProviderModel] = []
    requested_primary_model_id: str | None = None

    for offset, item in enumerate(request.models):
        existing = existing_by_model_id.get(item.model_id)
        priority_order = item.priority_order if item.priority_order is not None else next_priority + offset
        base_update = {
            "provider_instance_id": provider_id,
            "model_id": item.model_id,
            "display_name": item.display_name or item.model_id,
            "model_type": item.model_type,
            "source": item.source,
            "is_enabled": item.is_enabled,
            "is_primary": False,
            "priority_order": priority_order,
            "supports_thinking": item.supports_thinking,
            "supports_reasoning_effort": item.supports_reasoning_effort,
            "supports_vision": item.supports_vision,
            "supports_video": item.supports_video,
            "context_window": item.context_window,
            "max_output_tokens": item.max_output_tokens,
            "metadata_json": item.metadata_json,
            "updated_at": utc_now_iso(),
        }
        if existing is None:
            saved = repo.save_provider_model(ProviderModel(**base_update))
        else:
            saved = repo.save_provider_model(
                existing.model_copy(
                    update=base_update,
                )
            )
        saved_models.append(saved)
        if item.is_primary:
            requested_primary_model_id = saved.id

    if requested_primary_model_id is None and not any(item.is_primary for item in existing_models):
        requested_primary_model_id = saved_models[0].id if saved_models else None

    if requested_primary_model_id is not None:
        _set_primary_model(repo, provider_id, requested_primary_model_id)
        _ensure_default_binding(repo, requested_primary_model_id)

    return ProviderModelsMutationResponse(
        provider=_load_provider_view(repo, provider_id),
        models=[repo.get_provider_model(item.id) or item for item in saved_models],
    )


@router.patch("/models/{model_id}", response_model=ProviderModelMutationResponse)
async def update_provider_model(
    model_id: str,
    request: UpdateProviderModelRequest,
) -> ProviderModelMutationResponse:
    repo = _get_repo()
    existing = repo.get_provider_model(model_id)
    if existing is None:
        raise HTTPException(status_code=404, detail=f"Provider model '{model_id}' not found")

    update_payload = request.model_dump(exclude_unset=True)
    update_payload["updated_at"] = utc_now_iso()
    should_set_primary = update_payload.pop("is_primary", None)
    saved = repo.save_provider_model(existing.model_copy(update=update_payload))
    if should_set_primary:
        _set_primary_model(repo, saved.provider_instance_id, saved.id)
        _ensure_default_binding(repo, saved.id)
        refreshed = repo.get_provider_model(saved.id)
        if refreshed is not None:
            saved = refreshed
    return ProviderModelMutationResponse(model=saved)


@router.delete("/models/{model_id}", status_code=204)
async def delete_provider_model(model_id: str) -> Response:
    repo = _get_repo()
    model = repo.get_provider_model(model_id)
    if model is None:
        raise HTTPException(status_code=404, detail=f"Provider model '{model_id}' not found")

    repo.delete_provider_model(model_id)
    removed_default = _delete_bindings_referencing_models(repo, {model_id})
    remaining_models = repo.list_provider_models(model.provider_instance_id)
    replacement_primary = _primary_model_id(remaining_models)
    if replacement_primary is not None and not any(item.is_primary for item in remaining_models):
        _set_primary_model(repo, model.provider_instance_id, replacement_primary)
    if removed_default:
        _ensure_default_binding(repo, replacement_primary)
    return Response(status_code=204)


@router.post("/models/{model_id}/test", response_model=ProviderModelTestExecutionResponse)
async def test_provider_model(
    model_id: str,
    request: ProviderExecutionRequest,
) -> ProviderModelTestExecutionResponse:
    repo = _get_repo()
    model = repo.get_provider_model(model_id)
    if model is None:
        raise HTTPException(status_code=404, detail=f"Provider model '{model_id}' not found")
    provider = repo.get_provider_instance(model.provider_instance_id)
    if provider is None:
        raise HTTPException(
            status_code=404,
            detail=f"Provider '{model.provider_instance_id}' not found for model '{model_id}'",
        )
    template = _get_provider_template_or_404(repo, provider.provider_template_id)

    result = await models_router.execute_model_connection_test(
        models_router.ModelConnectionTestRequest(
            use=_provider_use(provider, template),
            model=model.model_id,
            api_key=_provider_api_key(provider),
            api_base=_provider_api_base(provider, template),
            provider_protocol=_provider_protocol_for_request(provider, template),
            timeout_seconds=request.timeout_seconds,
            probe_message=request.probe_message,
        )
    )

    updated_model = repo.save_provider_model(
        model.model_copy(
            update={
                "model_test_status": "success" if result.success else "failed",
                "model_test_message": result.message,
                "model_test_latency_ms": result.latency_ms,
                "model_test_preview": result.response_preview,
                "model_last_tested_at": utc_now_iso(),
                "updated_at": utc_now_iso(),
            }
        )
    )

    return ProviderModelTestExecutionResponse(
        provider=_load_provider_view(repo, provider.id),
        model=updated_model,
        result=result,
    )


@router.get("/bindings", response_model=BindingsListResponse)
async def list_bindings() -> BindingsListResponse:
    repo = _get_repo()
    return BindingsListResponse(bindings=repo.list_bindings())


@router.put("/bindings/{binding_key}", response_model=BindingMutationResponse)
async def update_binding(
    binding_key: str,
    request: UpdateBindingRequest,
) -> BindingMutationResponse:
    repo = _get_repo()
    provider_model = repo.get_provider_model(request.provider_model_id)
    if provider_model is None:
        raise HTTPException(
            status_code=404,
            detail=f"Provider model '{request.provider_model_id}' not found",
        )
    if request.fallback_provider_model_id is not None and repo.get_provider_model(
        request.fallback_provider_model_id
    ) is None:
        raise HTTPException(
            status_code=404,
            detail=f"Fallback provider model '{request.fallback_provider_model_id}' not found",
        )

    binding = repo.save_binding(
        ModelBinding(
            binding_key=binding_key,
            provider_model_id=request.provider_model_id,
            fallback_provider_model_id=request.fallback_provider_model_id,
            status=request.status,
        )
    )
    return BindingMutationResponse(binding=binding)
