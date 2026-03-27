"""Notebook APIs for the personal desktop second-brain system."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from nion.config.paths import get_paths
from nion.notebook import (
    NotebookHistoryService,
    NotebookNote,
    apply_assist_content,
    build_assist_preview,
)
from nion.notebook.models import NotebookDeletedNotePreview, NotebookNoteSummary
from nion.notebook.service import (
    NotebookConflictError,
    NotebookDirectoryNotEmptyError,
    NotebookDirectoryNotFoundError,
    NotebookNotFoundError,
)

router = APIRouter(prefix="/api/notebook", tags=["notebook"])

DEFAULT_MAX_DEPTH = 8
DEFAULT_MAX_NODES = 5000


class NotebookDirectoryEntry(BaseModel):
    path: str
    name: str
    depth: int
    child_count: int = 0
    mtime: float | None = None


class NotebookFileEntry(BaseModel):
    note_id: str | None = None
    path: str
    name: str
    depth: int
    size: int = 0
    mtime: float | None = None


class NotebookTreeResponse(BaseModel):
    root: str
    generated_at: str
    depth: int
    truncated: bool
    directories: list[NotebookDirectoryEntry] = Field(default_factory=list)
    files: list[NotebookFileEntry] = Field(default_factory=list)


class NotebookNoteResponse(BaseModel):
    note: NotebookNote


class NotebookNotesResponse(BaseModel):
    notes: list[NotebookNoteSummary]


class NotebookHistoryResponse(BaseModel):
    entries: list[dict[str, object]]


class NotebookHistoryDetailResponse(BaseModel):
    entry: dict[str, object]
    snapshot: NotebookNote


class NotebookDeletePreviewResponse(BaseModel):
    note_id: str
    title: str
    relative_path: str
    summary: str


class NotebookDeletedResponse(BaseModel):
    deleted: dict[str, str]


class NotebookDirectoryResponse(BaseModel):
    directory: str


class NotebookTrashResponse(BaseModel):
    notes: list[NotebookDeletedNotePreview]


class NotebookCreateRequest(BaseModel):
    directory: str = ""
    title: str
    body: str


class NotebookDirectoryCreateRequest(BaseModel):
    parent_directory: str = ""
    name: str


class NotebookDirectoryRenameRequest(BaseModel):
    directory: str
    name: str


class NotebookDirectoryDeleteRequest(BaseModel):
    directory: str


class NotebookUpdateRequest(BaseModel):
    body: str
    expected_content_hash: str
    title: str | None = None


class NotebookRenameRequest(BaseModel):
    title: str


class NotebookMoveRequest(BaseModel):
    directory: str


class NotebookRestoreVersionRequest(BaseModel):
    version_id: str


class NotebookMetadataRequest(BaseModel):
    tags: list[str] | None = None
    is_pinned: bool | None = None


class NotebookAssistPreviewRequest(BaseModel):
    action: Literal["summarize", "rewrite", "expand", "checklist", "action_items"]


class NotebookAssistPreviewResponse(BaseModel):
    action: str
    content: str
    original_content: str


class NotebookAssistApplyRequest(BaseModel):
    action: Literal["summarize", "rewrite", "expand", "checklist", "action_items"]
    mode: Literal["replace", "insert"]
    content: str
    expected_content_hash: str


class NotebookImportRequest(BaseModel):
    source: Literal["chat"]
    content: str
    mode: Literal["append", "replace"]
    expected_content_hash: str


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _build_summary(body: str, limit: int = 140) -> str:
    compact = " ".join(body.strip().split())
    if len(compact) <= limit:
        return compact
    return f"{compact[:limit - 3]}..."


def _visible_relpath(path: Path, root: Path) -> str | None:
    try:
        relative = path.relative_to(root)
    except ValueError:
        return None
    if ".nion" in relative.parts:
        return None
    if any(part.startswith(".") for part in relative.parts):
        return None
    return relative.as_posix()


@router.get("/tree", response_model=NotebookTreeResponse)
async def get_notebook_tree(
    depth: int = Query(default=DEFAULT_MAX_DEPTH, ge=1, le=12),
    max_nodes: int = Query(default=DEFAULT_MAX_NODES, ge=50, le=20000),
) -> NotebookTreeResponse:
    paths = get_paths()
    paths.ensure_notebook_dirs()
    root = paths.notebook_root_dir.resolve()

    directories: list[NotebookDirectoryEntry] = []
    files: list[NotebookFileEntry] = []
    truncated = False
    visited = 0

    for entry in sorted(root.rglob("*"), key=lambda item: item.as_posix().lower()):
        relpath = _visible_relpath(entry, root)
        if relpath is None:
            continue
        rel = Path(relpath)
        depth_value = len(rel.parts)
        if depth_value > depth:
            continue

        visited += 1
        if visited > max_nodes:
            truncated = True
            break

        stat = entry.stat()
        if entry.is_dir():
            child_count = len(
                [
                    child
                    for child in entry.iterdir()
                    if not child.name.startswith(".")
                ]
            ) if depth_value < depth else 0
            directories.append(
                NotebookDirectoryEntry(
                    path=relpath,
                    name=entry.name,
                    depth=depth_value,
                    child_count=child_count,
                    mtime=stat.st_mtime,
                )
            )
        elif entry.is_file() and entry.suffix == ".md":
            note_id = None
            try:
                frontmatter, _body = NotebookHistoryService()._service._build_note(entry), None
                note_id = frontmatter.note_id
            except Exception:
                note_id = None
            files.append(
                NotebookFileEntry(
                    note_id=note_id,
                    path=relpath,
                    name=entry.name,
                    depth=depth_value,
                    size=stat.st_size,
                    mtime=stat.st_mtime,
                )
            )

    return NotebookTreeResponse(
        root=str(root),
        generated_at=_now_iso(),
        depth=depth,
        truncated=truncated,
        directories=directories,
        files=files,
    )


@router.get("/trash", response_model=NotebookTrashResponse)
async def get_notebook_trash() -> NotebookTrashResponse:
    return NotebookTrashResponse(notes=NotebookHistoryService().list_deleted_notes())


@router.post("/notes", response_model=NotebookNoteResponse)
async def create_notebook_note(payload: NotebookCreateRequest) -> NotebookNoteResponse:
    note = NotebookHistoryService().create_note(
        directory=payload.directory,
        title=payload.title,
        body=payload.body,
        actor_type="user",
    )
    return NotebookNoteResponse(note=note)


@router.post("/directories", response_model=NotebookDirectoryResponse)
async def create_notebook_directory(
    payload: NotebookDirectoryCreateRequest,
) -> NotebookDirectoryResponse:
    try:
        directory = NotebookHistoryService()._service.create_directory(
            parent_directory=payload.parent_directory,
            name=payload.name,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return NotebookDirectoryResponse(directory=directory)


@router.post("/directories/rename", response_model=NotebookDirectoryResponse)
async def rename_notebook_directory(
    payload: NotebookDirectoryRenameRequest,
) -> NotebookDirectoryResponse:
    try:
        directory = NotebookHistoryService()._service.rename_directory(
            directory=payload.directory,
            name=payload.name,
        )
    except NotebookDirectoryNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return NotebookDirectoryResponse(directory=directory)


@router.post("/directories/delete", response_model=NotebookDirectoryResponse)
async def delete_notebook_directory(
    payload: NotebookDirectoryDeleteRequest,
) -> NotebookDirectoryResponse:
    try:
        NotebookHistoryService()._service.delete_directory(payload.directory)
    except NotebookDirectoryNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except NotebookDirectoryNotEmptyError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return NotebookDirectoryResponse(directory=payload.directory)


@router.get("/notes", response_model=NotebookNotesResponse)
async def list_notebook_notes() -> NotebookNotesResponse:
    notes = NotebookHistoryService()._service.list_note_summaries()
    return NotebookNotesResponse(notes=notes)


@router.get("/notes/{note_id}", response_model=NotebookNoteResponse)
async def get_notebook_note(note_id: str) -> NotebookNoteResponse:
    try:
        note = NotebookHistoryService()._service.read_note(note_id)
    except NotebookNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return NotebookNoteResponse(note=note)


@router.put("/notes/{note_id}", response_model=NotebookNoteResponse)
async def update_notebook_note(
    note_id: str,
    payload: NotebookUpdateRequest,
) -> NotebookNoteResponse:
    service = NotebookHistoryService()
    try:
        note = service.update_note(
            note_id=note_id,
            body=payload.body,
            expected_content_hash=payload.expected_content_hash,
            title=payload.title,
            actor_type="user",
        )
    except NotebookConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except NotebookNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return NotebookNoteResponse(note=note)


@router.patch("/notes/{note_id}/metadata", response_model=NotebookNoteResponse)
async def update_notebook_note_metadata(
    note_id: str,
    payload: NotebookMetadataRequest,
) -> NotebookNoteResponse:
    try:
        note = NotebookHistoryService()._service.update_note_metadata(
            note_id=note_id,
            tags=payload.tags,
            is_pinned=payload.is_pinned,
        )
    except NotebookNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return NotebookNoteResponse(note=note)


@router.post("/notes/{note_id}/assist-preview", response_model=NotebookAssistPreviewResponse)
async def preview_notebook_assist(
    note_id: str,
    payload: NotebookAssistPreviewRequest,
) -> NotebookAssistPreviewResponse:
    try:
        note = NotebookHistoryService()._service.read_note(note_id)
    except NotebookNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    content = build_assist_preview(
        title=note.title,
        body=note.body,
        action=payload.action,
    )
    return NotebookAssistPreviewResponse(
        action=payload.action,
        content=content,
        original_content=note.body,
    )


@router.post("/notes/{note_id}/assist-apply", response_model=NotebookNoteResponse)
async def apply_notebook_assist(
    note_id: str,
    payload: NotebookAssistApplyRequest,
) -> NotebookNoteResponse:
    service = NotebookHistoryService()
    try:
        current = service._service.read_note(note_id)
        next_body = apply_assist_content(
            original_body=current.body,
            generated_content=payload.content,
            mode=payload.mode,
        )
        note = service.update_note(
            note_id=note_id,
            body=next_body,
            expected_content_hash=payload.expected_content_hash,
            actor_type="agent",
        )
    except NotebookConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except NotebookNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return NotebookNoteResponse(note=note)


@router.post("/notes/{note_id}/import", response_model=NotebookNoteResponse)
async def import_notebook_content(
    note_id: str,
    payload: NotebookImportRequest,
) -> NotebookNoteResponse:
    service = NotebookHistoryService()
    try:
        current = service._service.read_note(note_id)
        next_body = (
            payload.content
            if payload.mode == "replace"
            else f"{current.body.rstrip()}\n\n---\n\n{payload.content}".rstrip()
        )
        note = service.update_note(
            note_id=note_id,
            body=next_body,
            expected_content_hash=payload.expected_content_hash,
            actor_type="agent",
        )
    except NotebookConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except NotebookNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return NotebookNoteResponse(note=note)


@router.post("/notes/{note_id}/rename", response_model=NotebookNoteResponse)
async def rename_notebook_note(
    note_id: str,
    payload: NotebookRenameRequest,
) -> NotebookNoteResponse:
    try:
        note = NotebookHistoryService().rename_note(
            note_id,
            payload.title,
            actor_type="user",
        )
    except NotebookNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return NotebookNoteResponse(note=note)


@router.post("/notes/{note_id}/move", response_model=NotebookNoteResponse)
async def move_notebook_note(
    note_id: str,
    payload: NotebookMoveRequest,
) -> NotebookNoteResponse:
    try:
        note = NotebookHistoryService().move_note(
            note_id,
            payload.directory,
            actor_type="user",
        )
    except NotebookNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return NotebookNoteResponse(note=note)


@router.get("/notes/{note_id}/history", response_model=NotebookHistoryResponse)
async def get_notebook_history(note_id: str) -> NotebookHistoryResponse:
    entries = [
        entry.model_dump()
        for entry in NotebookHistoryService().list_history(note_id)
    ]
    return NotebookHistoryResponse(entries=entries)


@router.get("/notes/{note_id}/history/{version_id}", response_model=NotebookHistoryDetailResponse)
async def get_notebook_history_detail(
    note_id: str,
    version_id: str,
) -> NotebookHistoryDetailResponse:
    try:
        entry, snapshot = NotebookHistoryService().get_history_detail(note_id, version_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return NotebookHistoryDetailResponse(
        entry=entry.model_dump(),
        snapshot=snapshot,
    )


@router.post("/notes/{note_id}/restore", response_model=NotebookNoteResponse)
async def restore_notebook_version(
    note_id: str,
    payload: NotebookRestoreVersionRequest,
) -> NotebookNoteResponse:
    try:
        note = NotebookHistoryService().restore_version(
            note_id=note_id,
            version_id=payload.version_id,
            actor_type="user",
        )
    except (NotebookNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return NotebookNoteResponse(note=note)


@router.get("/notes/{note_id}/delete-preview", response_model=NotebookDeletePreviewResponse)
async def get_notebook_delete_preview(note_id: str) -> NotebookDeletePreviewResponse:
    try:
        note = NotebookHistoryService()._service.read_note(note_id)
    except NotebookNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return NotebookDeletePreviewResponse(
        note_id=note.note_id,
        title=note.title,
        relative_path=note.relative_path,
        summary=_build_summary(note.body),
    )


@router.post("/notes/{note_id}/delete", response_model=NotebookDeletedResponse)
async def delete_notebook_note(note_id: str) -> NotebookDeletedResponse:
    try:
        deleted = NotebookHistoryService().delete_note(note_id, actor_type="user")
    except NotebookNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return NotebookDeletedResponse(deleted=deleted.model_dump())


@router.post("/notes/{note_id}/restore-deleted", response_model=NotebookNoteResponse)
async def restore_deleted_notebook_note(note_id: str) -> NotebookNoteResponse:
    try:
        note = NotebookHistoryService().restore_deleted_note(note_id, actor_type="user")
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return NotebookNoteResponse(note=note)
