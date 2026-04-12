from __future__ import annotations

from pathlib import Path


class SoulDocumentStore:
    def __init__(self, base_dir: str | Path) -> None:
        self._path = Path(base_dir) / "runtime-context" / "soul" / "SOUL.md"

    @property
    def path(self) -> Path:
        return self._path

    def read(self) -> str:
        if not self._path.exists():
            return "# Soul\n"
        return self._path.read_text(encoding="utf-8")

    def write(self, content: str) -> str:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._path.write_text(content, encoding="utf-8")
        return content
