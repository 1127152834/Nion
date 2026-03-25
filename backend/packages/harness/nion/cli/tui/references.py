from __future__ import annotations

import re
from dataclasses import dataclass


REFERENCE_RE = re.compile(r"@(?P<kind>skill|tool|file|thread):(?P<query>[^\s]*)")


@dataclass
class ReferenceTrigger:
    kind: str
    query: str


def parse_reference_trigger(text: str) -> ReferenceTrigger | None:
    matches = list(REFERENCE_RE.finditer(text))
    if not matches:
        return None

    match = matches[-1]
    return ReferenceTrigger(
        kind=match.group("kind"),
        query=match.group("query"),
    )
