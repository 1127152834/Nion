from __future__ import annotations

from fastapi import APIRouter

from nion.config.paths import get_paths
from nion.user_identity.repository import UserIdentityRepository
from nion.user_identity.service import UserIdentityService

router = APIRouter(prefix="/api/user-identity", tags=["memory"])


def _service() -> UserIdentityService:
    return UserIdentityService(UserIdentityRepository(get_paths().base_dir))


@router.get("")
async def get_user_identity() -> dict[str, object]:
    return _service().get_profile().model_dump(mode="json")
