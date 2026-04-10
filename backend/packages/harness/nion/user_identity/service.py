"""Service helpers for stable user identity access."""

from nion.memory_os.clock import utcnow_z
from nion.user_identity.models import UserIdentityProfile
from nion.user_identity.repository import UserIdentityRepository


class UserIdentityService:
    def __init__(self, repository: UserIdentityRepository) -> None:
        self._repository = repository

    def get_profile(self) -> UserIdentityProfile:
        return self._repository.load()

    def replace_profile(self, profile: UserIdentityProfile) -> UserIdentityProfile:
        return self._repository.save(
            profile.model_copy(update={"updated_at": utcnow_z()})
        )

    def apply_patch(self, patch: dict[str, object]) -> UserIdentityProfile:
        current = self.get_profile()
        update = {key: value for key, value in patch.items() if value not in (None, "", [])}
        if not update:
            return current
        return self.replace_profile(current.model_copy(update=update))
