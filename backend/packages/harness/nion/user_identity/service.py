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
        candidate = current.model_copy(update=update)
        normalized = _normalize_profile(candidate, patch=update)
        return self.replace_profile(normalized)


def _normalize_profile(
    profile: UserIdentityProfile,
    *,
    patch: dict[str, object],
) -> UserIdentityProfile:
    if "mutual_addressing_rule" not in patch:
        if profile.preferred_address_for_user and profile.assistant_self_name:
            profile = profile.model_copy(
                update={
                    "mutual_addressing_rule": (
                        f"你叫我{profile.preferred_address_for_user}，我叫你{profile.assistant_self_name}"
                    )
                }
            )
    return profile
