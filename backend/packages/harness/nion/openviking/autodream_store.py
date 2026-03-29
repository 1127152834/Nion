from __future__ import annotations

import json
from pathlib import Path

from nion.config.paths import Paths
from nion.openviking.autodream_models import AutoDreamRunState, DreamEntry


class AutoDreamStore:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._paths = Paths(base_dir=base_dir)
        self._paths.ensure_openviking_dirs()
        self._paths.ensure_autodream_dirs()

    def write_entry(self, entry: DreamEntry) -> Path:
        dated_dir = self._entry_dir(entry.started_at)
        dated_dir.mkdir(parents=True, exist_ok=True)
        path = dated_dir / f"{entry.dream_id}.md"
        path.write_text(self._render_entry(entry), encoding="utf-8")
        return path

    def load_state(self) -> AutoDreamRunState:
        if not self._paths.autodream_state_file.exists():
            return AutoDreamRunState()
        return AutoDreamRunState.model_validate_json(
            self._paths.autodream_state_file.read_text(encoding="utf-8")
        )

    def save_state(self, state: AutoDreamRunState) -> None:
        self._paths.autodream_state_file.write_text(
            state.model_dump_json(indent=2),
            encoding="utf-8",
        )

    def _entry_dir(self, started_at: str) -> Path:
        date = started_at[:10]
        year, month, _day = date.split("-")
        return self._paths.autodream_journal_dir / year / month

    def _render_entry(self, entry: DreamEntry) -> str:
        return "\n".join(
            [
                f"# AutoDream: {entry.time_window_end[:10]}",
                "",
                "## Time Window",
                f"- From: {entry.time_window_start}",
                f"- To: {entry.time_window_end}",
                "",
                "## Summary",
                entry.summary,
                "",
                "## What I Did",
                *[f"- {item}" for item in entry.what_i_did],
                "",
                "## What I Learned",
                *[f"- {item}" for item in entry.what_i_learned],
                "",
                "## What Changed",
                *[f"- {item}" for item in entry.what_changed],
                "",
                "## What I Plan To Change",
                *[f"- {item}" for item in entry.what_i_plan_to_change],
                "",
                "## What I Changed",
                *[f"- {item}" for item in entry.what_i_changed],
                "",
                "## Stale Items",
                *[f"- {item}" for item in entry.stale_items],
                "",
                "## Proposed Agent Memory Updates",
                *[f"- {item}" for item in entry.agent_memory_updates],
                "",
                "## Proposed User Memory Updates",
                *[f"- {item}" for item in entry.user_memory_candidates],
                "",
                "## Proposed Actions",
                *[f"- {item}" for item in entry.action_proposals],
                "",
                "## Sources",
                *[f"- {item}" for item in entry.sources],
                "",
            ]
        )
