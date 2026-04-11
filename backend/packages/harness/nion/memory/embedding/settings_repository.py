from __future__ import annotations

import json
from pathlib import Path

from nion.memory.embedding.settings import EmbeddingSystemSettings


class EmbeddingSettingsRepository:
    def __init__(self, base_dir: str | Path) -> None:
        self._base_dir = Path(base_dir)

    @property
    def _path(self) -> Path:
        return self._base_dir / "memory-os" / "indexes" / "vector" / "settings.json"

    def load(self) -> EmbeddingSystemSettings:
        if not self._path.exists():
            return EmbeddingSystemSettings()
        return EmbeddingSystemSettings.model_validate(
            json.loads(self._path.read_text(encoding="utf-8"))
        )

    def save(self, settings: EmbeddingSystemSettings) -> EmbeddingSystemSettings:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._path.write_text(
            settings.model_dump_json(indent=2),
            encoding="utf-8",
        )
        return settings

    def update(self, patch: dict[str, object]) -> EmbeddingSystemSettings:
        current = self.load()
        next_settings = current.model_copy(
            update={key: value for key, value in patch.items() if value not in (None, "")}
        )
        return self.save(next_settings)
