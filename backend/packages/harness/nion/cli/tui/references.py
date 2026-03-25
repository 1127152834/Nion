from __future__ import annotations

import re
from dataclasses import dataclass


FILE_REFERENCE_RE = re.compile(r"@(?P<query>[^\s]*)")


@dataclass
class FileReferenceTrigger:
    query: str


def parse_file_reference_trigger(text: str) -> FileReferenceTrigger | None:
    matches = list(FILE_REFERENCE_RE.finditer(text))
    if not matches:
        return None

    match = matches[-1]
    return FileReferenceTrigger(query=match.group("query"))
