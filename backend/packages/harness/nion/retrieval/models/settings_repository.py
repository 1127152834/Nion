from __future__ import annotations

import json
from pathlib import Path

from pydantic import ValidationError

from nion.retrieval.models.settings import RetrievalModelsSettings


class RetrievalModelsSettingsRepository:
    def __init__(self, base_dir: str | Path) -> None:
        self._base_dir = Path(base_dir)

    @property
    def _path(self) -> Path:
        return self._base_dir / "retrieval-models" / "settings.json"

    def load(self) -> RetrievalModelsSettings:
        if not self._path.exists():
            return RetrievalModelsSettings()
        try:
            return RetrievalModelsSettings.model_validate(
                json.loads(self._path.read_text(encoding="utf-8"))
            )
        except (json.JSONDecodeError, ValidationError):
            return RetrievalModelsSettings()

    def save(self, settings: RetrievalModelsSettings) -> RetrievalModelsSettings:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        temp_path = self._path.with_suffix(f"{self._path.suffix}.tmp")
        temp_path.write_text(settings.model_dump_json(indent=2), encoding="utf-8")
        temp_path.replace(self._path)
        return settings
