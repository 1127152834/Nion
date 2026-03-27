"""Notebook foundations for the personal desktop second-brain system."""

from nion.notebook.assist import (
    ASSIST_SPECS,
    NotebookAssistPreviewResult,
    apply_assist_content,
    build_assist_preview,
)
from nion.notebook.history import NotebookHistoryService
from nion.notebook.models import NotebookNote
from nion.notebook.service import NotebookConflictError, NotebookNotFoundError, NotebookService

__all__ = [
    "ASSIST_SPECS",
    "NotebookConflictError",
    "NotebookHistoryService",
    "NotebookNotFoundError",
    "NotebookNote",
    "NotebookAssistPreviewResult",
    "NotebookService",
    "apply_assist_content",
    "build_assist_preview",
]
