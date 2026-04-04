from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from nion.config.paths import Paths


class MemoryOSDiaryWriter:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._paths = Paths(base_dir=base_dir)

    def write_entry(
        self,
        *,
        thread_id: str,
        summary: str,
        repeated_needs: list[str],
    ) -> str:
        now = datetime.now(UTC)
        diary_dir = self._paths.memory_os_artifacts_dir / "agent-self" / "diary" / now.strftime("%Y") / now.strftime("%m") / now.strftime("%d")
        diary_dir.mkdir(parents=True, exist_ok=True)
        path = diary_dir / f"{thread_id}.md"
        body = "\n".join(
            [
                f"# {now.strftime('%Y-%m-%d')} / {thread_id}",
                "",
                "## What happened",
                summary,
                "",
                "## Repeated needs",
                *[f"- {item}" for item in repeated_needs],
            ]
        )
        path.write_text(body, encoding="utf-8")
        return str(path)
