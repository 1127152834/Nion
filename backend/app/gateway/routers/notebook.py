"""Notebook APIs for the personal desktop second-brain system."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from nion.config.paths import get_paths
from nion.notebook import NotebookHistoryService, NotebookNote
from nion.notebook.models import NotebookDeletedNotePreview
from nion.notebook.service import NotebookConflictError, NotebookNotFoundError

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


class NotebookHistoryResponse(BaseModel):
    entries: list[dict[str, object]]


class NotebookDeletePreviewResponse(BaseModel):
    note_id: str
    title: str
    relative_path: str
    summary: str


class NotebookDeletedResponse(BaseModel):
    deleted: dict[str, str]


class NotebookTrashResponse(BaseModel):
    notes: list[NotebookDeletedNotePreview]


class NotebookCreateRequest(BaseModel):
    directory: str = ""
    title: str
    body: str


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
