from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class ToolBatchSummary:
    summary_label: str
    result_class: str
