from __future__ import annotations

from pathlib import Path

from .repository import MemoryOSRepository
from .soul_events import record_soul_event


def write_soul_journal(
    *,
    base_dir: str | Path,
    repeated_needs: list[str],
    created_at: str,
    repository: MemoryOSRepository | None = None,
) -> str:
    base = Path(base_dir)
    date = created_at[:10]
    year, month, day = date.split("-")
    journal_dir = base / "memory-os" / "artifacts" / "agent-self" / "soul-journal" / year / month / day
    journal_dir.mkdir(parents=True, exist_ok=True)
    path = journal_dir / f"reflection_{date}.md"
    body = "\n".join(
        [
            f"# Soul Journal / {date}",
            "",
            "## Repeated Needs",
            *[f"- {item}" for item in repeated_needs],
        ]
    )
    path.write_text(body, encoding="utf-8")
    if repository is not None:
        relative_artifact_uri = f"nion://memory-os/artifacts/agent-self/soul-journal/{year}/{month}/{day}/reflection_{date}.md"
        record_soul_event(
            repository,
            event_type="soul_journal_written",
            memory_id=f"soul_journal_{date}",
            summary=f"灵魂反思日志已写入，观察到 {len(repeated_needs)} 条重复需求信号。",
            created_at=created_at,
            source="soul_reflection",
            metadata={
                "journal_path": str(path),
                "artifact_uri": relative_artifact_uri,
                "repeated_need_count": len(repeated_needs),
            },
        )
    return str(path)
