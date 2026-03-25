"""Thread runtime profile APIs."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from nion.runtime_profile import (
    RuntimeProfileLockedError,
    RuntimeProfileRepository,
    RuntimeProfileValidationError,
)

router = APIRouter(prefix="/api/threads/{thread_id}/runtime-profile", tags=["runtime-profile"])


class RuntimeProfileResponse(BaseModel):
    execution_mode: Literal["sandbox", "host"] = "sandbox"
    host_workdir: str | None = None
    locked: bool = False
    updated_at: str | None = None


class RuntimeProfileUpdateRequest(BaseModel):
    execution_mode: Literal["sandbox", "host"] = Field(default="sandbox")
    host_workdir: str | None = Field(default=None)

@router.get("", response_model=RuntimeProfileResponse)
async def get_runtime_profile(thread_id: str) -> RuntimeProfileResponse:
    profile = RuntimeProfileRepository().read(thread_id)
    return RuntimeProfileResponse(**profile)


@router.put("", response_model=RuntimeProfileResponse)
async def update_runtime_profile(
    thread_id: str, payload: RuntimeProfileUpdateRequest
) -> RuntimeProfileResponse:
    repository = RuntimeProfileRepository()

    try:
        updated = repository.update(
            thread_id,
            execution_mode=payload.execution_mode,
            host_workdir=payload.host_workdir,
        )
    except RuntimeProfileLockedError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except RuntimeProfileValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return RuntimeProfileResponse(**updated)
