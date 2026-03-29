from __future__ import annotations

from datetime import UTC, datetime

from nion.openviking.models import NotebookResourceRecord
from nion.openviking.uri import notebook_resource_uri


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def project_notebook_note(
    *,
    note_id: str,
    title: str,
    source_relative_path: str,
    content_hash: str,
    updated_at: str,
) -> NotebookResourceRecord:
    return NotebookResourceRecord(
        resource_uri=notebook_resource_uri(source_relative_path),
        note_id=note_id,
        title=title,
        source_relative_path=source_relative_path,
        content_hash=content_hash,
        updated_at=updated_at,
        indexed_at=_now_iso(),
    )
