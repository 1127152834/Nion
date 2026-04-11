from __future__ import annotations

import re
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from nion.config.paths import get_paths
from nion.user_identity.repository import UserIdentityRepository
from nion.user_identity.service import UserIdentityService

router = APIRouter(prefix="/api/user-identity", tags=["memory"])


class UserIdentityPatchRequest(BaseModel):
    field: Literal[
        "user_name",
        "user_aliases",
        "preferred_address_for_user",
        "assistant_self_name",
        "mutual_addressing_rule",
        "communication_style_preferences",
        "user_role",
        "timezone",
        "interaction_boundaries",
        "long_term_background_summary",
    ]
    value: str | list[str]


def _service() -> UserIdentityService:
    return UserIdentityService(UserIdentityRepository(get_paths().base_dir))


@router.get("")
async def get_user_identity() -> dict[str, object]:
    return _service().get_profile().model_dump(mode="json")


@router.patch("")
async def patch_user_identity(request: UserIdentityPatchRequest) -> dict[str, object]:
    return _service().apply_patch(
        {request.field: _normalize_patch_value(field=request.field, value=request.value)}
    ).model_dump(mode="json")


def _normalize_patch_value(
    *,
    field: str,
    value: str | list[str],
) -> str | list[str]:
    if field in {"communication_style_preferences", "interaction_boundaries", "user_aliases"}:
        return _normalize_preference_values(value)
    if not isinstance(value, str):
        raise HTTPException(status_code=400, detail="Invalid user identity patch value")
    return value.strip()


def _normalize_preference_values(value: str | list[str]) -> list[str]:
    if isinstance(value, str):
        raw_items = re.split(r"[\n,，]+", value)
    elif isinstance(value, list):
        raw_items = [str(item) for item in value]
    else:
        raise HTTPException(status_code=400, detail="Invalid user identity patch value")
    return list(dict.fromkeys(item.strip() for item in raw_items if item.strip()))
