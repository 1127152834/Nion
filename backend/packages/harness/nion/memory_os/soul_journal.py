from __future__ import annotations

from pathlib import Path


def write_soul_journal(
    *,
    base_dir: str | Path,
    repeated_needs: list[str],
    created_at: str,
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
    return str(path)
