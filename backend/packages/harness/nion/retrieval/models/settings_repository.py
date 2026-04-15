from __future__ import annotations

import json
from pathlib import Path

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
        return RetrievalModelsSettings.model_validate(
            json.loads(self._path.read_text(encoding="utf-8"))
        )

    def save(self, settings: RetrievalModelsSettings) -> RetrievalModelsSettings:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._path.write_text(settings.model_dump_json(indent=2), encoding="utf-8")
        return settings
