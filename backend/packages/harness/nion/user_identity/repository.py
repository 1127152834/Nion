"""Persistence for the stable user identity profile."""

import json
from pathlib import Path

from nion.user_identity.models import UserIdentityProfile


class UserIdentityRepository:
    def __init__(self, base_dir: str | Path) -> None:
        self._base_dir = Path(base_dir)

    @property
    def _path(self) -> Path:
        return self._base_dir / "user_identity.json"

    def load(self) -> UserIdentityProfile:
        if not self._path.exists():
            return UserIdentityProfile()

        with open(self._path, encoding="utf-8") as fh:
            payload = json.load(fh)
        return UserIdentityProfile.model_validate(payload)

    def save(self, profile: UserIdentityProfile) -> UserIdentityProfile:
        self._path.parent.mkdir(parents=True, exist_ok=True)

        stored = profile.model_copy()
        temp_path = self._path.with_suffix(".tmp")
        with open(temp_path, "w", encoding="utf-8") as fh:
            json.dump(stored.model_dump(mode="json"), fh, ensure_ascii=False, indent=2)
        temp_path.replace(self._path)
        return stored
