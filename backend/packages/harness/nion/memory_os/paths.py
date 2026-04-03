from __future__ import annotations

from nion.config.paths import Paths, get_paths


def get_memory_os_paths(base_dir: str | None = None) -> Paths:
    return Paths(base_dir=base_dir) if base_dir else get_paths()
