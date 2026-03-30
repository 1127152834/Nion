from __future__ import annotations

from pathlib import Path

from nion.memory_os.providers import MemoryOSState


def _state_file(base_dir: str | Path) -> Path:
    return Path(base_dir) / "memory-os-state.json"


def load_memory_os_state(base_dir: str | Path) -> MemoryOSState:
    path = _state_file(base_dir)
    if not path.exists():
        return MemoryOSState()
    return MemoryOSState.model_validate_json(path.read_text(encoding="utf-8"))


def save_memory_os_state(state: MemoryOSState, base_dir: str | Path) -> None:
    path = _state_file(base_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(state.model_dump_json(indent=2), encoding="utf-8")
