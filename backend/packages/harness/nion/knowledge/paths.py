from __future__ import annotations

from pathlib import Path

from nion.config.paths import Paths, get_paths


def get_knowledge_paths(base_dir: str | Path | None = None) -> Paths:
    if base_dir is not None:
        return Paths(base_dir=base_dir)
    return get_paths()
