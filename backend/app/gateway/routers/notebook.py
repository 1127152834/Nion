"""Notebook APIs for the personal desktop second-brain system."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.gateway.path_utils import resolve_thread_virtual_path
from nion.config.paths import get_paths
from nion.models import create_chat_model
from nion.models.factory import resolve_model_name_with_fallback
from nion.notebook.assistant_service import (
    NotebookAssistantService,
    NotebookPendingRewrite,
)
from nion.notebook import (
    ASSIST_SPECS,
    NotebookHistoryService,
    NotebookNote,
    apply_assist_content,
    build_assist_preview,
)
from nion.notebook.models import NotebookAsset, NotebookDeletedNotePreview, NotebookInboxItem, NotebookNoteSummary
from nion.notebook.service import (
    NotebookAssetNotFoundError,
    NotebookDirectoryAlreadyExistsError,
    NotebookConflictError,
    NotebookDirectoryNotEmptyError,
    NotebookDirectoryMoveError,
    NotebookDirectoryNotFoundError,
    NotebookNotFoundError,
)
from nion.threads.repository import ThreadRepository

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


class NotebookAssetResponse(BaseModel):
    asset: NotebookAsset


class NotebookPendingRewriteResponse(BaseModel):
    note: NotebookNote
    pending_rewrite: NotebookPendingRewrite | None = None


class NotebookNotesResponse(BaseModel):
    notes: list[NotebookNoteSummary]


class NotebookInboxResponse(BaseModel):
    items: list[NotebookInboxItem]


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


class NotebookArchiveAssetRequest(BaseModel):
    thread_id: str
    artifact_path: str
    directory: str = ""


class NotebookDirectoryCreateRequest(BaseModel):
    parent_directory: str = ""
    name: str


class NotebookDirectoryRenameRequest(BaseModel):
    directory: str
    name: str


class NotebookDirectoryDeleteRequest(BaseModel):
    directory: str


class NotebookDirectoryMoveRequest(BaseModel):
    directory: str
    parent_directory: str = ""


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
    title: str | None = None
    body: str | None = None
    scope: Literal["whole_note", "selection", "paragraph"] = "whole_note"
    selection_start: int | None = None
    selection_end: int | None = None
    options: dict[str, str | None] | None = None


class NotebookAssistPreviewResponse(BaseModel):
    action: str
    action_label: str
    kind: Literal["rewrite", "derived"]
    scope: Literal["whole_note", "selection", "paragraph"]
    source_excerpt: str
    source_start: int | None = None
    source_end: int | None = None
    recommended_mode: Literal["replace", "insert", "replace_selection", "insert_after_selection"]
    available_modes: list[Literal["replace", "insert", "replace_selection", "insert_after_selection"]] = Field(default_factory=list)
    content: str
    original_content: str


class NotebookAssistApplyRequest(BaseModel):
    action: Literal["summarize", "rewrite", "expand", "checklist", "action_items"]
    mode: Literal["replace", "insert", "replace_selection", "insert_after_selection"]
    content: str
    expected_content_hash: str
    current_body: str | None = None
    selection_start: int | None = None
    selection_end: int | None = None


class NotebookRewriteApplyRequest(BaseModel):
    content: str
    expected_content_hash: str
    selection_start: int | None = None
    selection_end: int | None = None


class NotebookRewriteSessionRequest(BaseModel):
    pass


class NotebookImportRequest(BaseModel):
    source: Literal["chat"]
    content: str
    mode: Literal["append", "replace"]
    expected_content_hash: str


class NotebookImportSourceItem(BaseModel):
    id: str
    source: Literal["chat"] = "chat"
    thread_id: str
    thread_title: str
    preview_text: str
    content: str
    updated_at: str


class NotebookImportSourcesResponse(BaseModel):
    items: list[NotebookImportSourceItem] = Field(default_factory=list)


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _build_summary(body: str, limit: int = 140) -> str:
    compact = " ".join(body.strip().split())
    if len(compact) <= limit:
        return compact
    return f"{compact[:limit - 3]}..."


def _extract_thread_message_text(message: dict[str, object]) -> str:
    content = message.get("content", "")
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
                continue
            if isinstance(part, dict) and part.get("type") == "text":
                text = part.get("text")
                if isinstance(text, str):
                    parts.append(text)
        return "\n".join(part.strip() for part in parts if part.strip()).strip()
    return ""


def _list_chat_import_sources(limit: int) -> list[NotebookImportSourceItem]:
    repository = ThreadRepository()
    candidates: list[NotebookImportSourceItem] = []

    for record in repository.search(limit=max(limit * 4, limit)):
        values = record.get("values") or {}
        if not isinstance(values, dict):
            continue
        messages = values.get("messages") or []
        if not isinstance(messages, list):
            continue

        latest_ai_message: dict[str, object] | None = None
        for message in reversed(messages):
            if not isinstance(message, dict):
                continue
            if message.get("type") != "ai":
                continue
            preview_text = _extract_thread_message_text(message)
            if preview_text:
                latest_ai_message = message
                break

        if latest_ai_message is None:
            continue

        content = _extract_thread_message_text(latest_ai_message)
        preview_text = _build_summary(content, limit=120)
        candidates.append(
            NotebookImportSourceItem(
                id=f"{record['thread_id']}:{latest_ai_message.get('id') or 'latest'}",
                thread_id=str(record["thread_id"]),
                thread_title=str(values.get("title") or "Untitled"),
                preview_text=preview_text,
                content=content,
                updated_at=str(record.get("updated_at") or _now_iso()),
            )
        )
        if len(candidates) >= limit:
            break

    return candidates


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


@router.get("/import-sources", response_model=NotebookImportSourcesResponse)
async def get_notebook_import_sources(
    source: Literal["chat"] = Query(default="chat"),
    limit: int = Query(default=6, ge=1, le=20),
) -> NotebookImportSourcesResponse:
    if source != "chat":
        return NotebookImportSourcesResponse(items=[])
    return NotebookImportSourcesResponse(items=_list_chat_import_sources(limit))










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


@router.post("/assets/archive", response_model=NotebookAssetResponse)
async def archive_notebook_asset(payload: NotebookArchiveAssetRequest) -> NotebookAssetResponse:
    try:
        source_path = resolve_thread_virtual_path(payload.thread_id, payload.artifact_path)
        asset = NotebookHistoryService().archive_asset(
            source_path=str(source_path),
            directory=payload.directory,
            actor_type="user",
        )
    except HTTPException:
        raise
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except NotebookAssetNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return NotebookAssetResponse(asset=asset)


@router.post("/directories", response_model=NotebookDirectoryResponse)
async def create_notebook_directory(
    payload: NotebookDirectoryCreateRequest,
) -> NotebookDirectoryResponse:
    try:
        directory = NotebookHistoryService()._service.create_directory(
            parent_directory=payload.parent_directory,
            name=payload.name,
        )
    except NotebookDirectoryAlreadyExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
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


@router.post("/directories/move", response_model=NotebookDirectoryResponse)
async def move_notebook_directory(
    payload: NotebookDirectoryMoveRequest,
) -> NotebookDirectoryResponse:
    try:
        directory = NotebookHistoryService()._service.move_directory(
            directory=payload.directory,
            parent_directory=payload.parent_directory,
        )
    except NotebookDirectoryAlreadyExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except NotebookDirectoryMoveError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except NotebookDirectoryNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return NotebookDirectoryResponse(directory=directory)


@router.get("/notes", response_model=NotebookNotesResponse)
async def list_notebook_notes() -> NotebookNotesResponse:
    notes = NotebookHistoryService()._service.list_note_summaries()
    return NotebookNotesResponse(notes=notes)


@router.get("/inbox", response_model=NotebookInboxResponse)
async def list_notebook_inbox() -> NotebookInboxResponse:
    items = NotebookHistoryService()._service.list_inbox_items()
    return NotebookInboxResponse(items=items)


@router.get("/notes/{note_id}", response_model=NotebookPendingRewriteResponse)
async def get_notebook_note(note_id: str) -> NotebookPendingRewriteResponse:
    try:
        note = NotebookHistoryService()._service.read_note(note_id)
    except NotebookNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    pending_rewrite = NotebookAssistantService().get_pending_rewrite(note_id)
    return NotebookPendingRewriteResponse(note=note, pending_rewrite=pending_rewrite)


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

    try:
        model_name = resolve_model_name_with_fallback()
        model = create_chat_model(name=model_name, thinking_enabled=False)
        preview = build_assist_preview(
            title=payload.title if payload.title is not None else note.title,
            body=payload.body if payload.body is not None else note.body,
            action=payload.action,
            scope=payload.scope,
            selection_start=payload.selection_start,
            selection_end=payload.selection_end,
            options=payload.options,
            model=model,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Failed to generate notebook assist preview ({ASSIST_SPECS[payload.action].label}).",
        ) from exc

    return NotebookAssistPreviewResponse(
        action=preview.action,
        action_label=preview.action_label,
        kind=preview.kind,
        scope=preview.scope,
        source_excerpt=preview.source_excerpt,
        source_start=preview.source_start,
        source_end=preview.source_end,
        recommended_mode=preview.recommended_mode,
        available_modes=preview.available_modes,
        content=preview.content,
        original_content=preview.original_content,
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
            original_body=payload.current_body if payload.current_body is not None else current.body,
            generated_content=payload.content,
            mode=payload.mode,
            selection_start=payload.selection_start,
            selection_end=payload.selection_end,
        )
        note = service.update_note(
            note_id=note_id,
            body=next_body,
            expected_content_hash=payload.expected_content_hash,
            actor_type="agent",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except NotebookConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except NotebookNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return NotebookNoteResponse(note=note)


@router.post("/notes/{note_id}/rewrite/apply", response_model=NotebookPendingRewriteResponse)
async def apply_notebook_rewrite(
    note_id: str,
    payload: NotebookRewriteApplyRequest,
) -> NotebookPendingRewriteResponse:
    service = NotebookAssistantService()
    try:
        note, pending_rewrite = service.apply_rewrite(
            note_id=note_id,
            content=payload.content,
            expected_content_hash=payload.expected_content_hash,
            selection_start=payload.selection_start,
            selection_end=payload.selection_end,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except NotebookConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except NotebookNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return NotebookPendingRewriteResponse(note=note, pending_rewrite=pending_rewrite)


@router.post("/notes/{note_id}/rewrite/cancel", response_model=NotebookPendingRewriteResponse)
async def cancel_notebook_rewrite(
    note_id: str,
    payload: NotebookRewriteSessionRequest,
) -> NotebookPendingRewriteResponse:
    service = NotebookAssistantService()
    try:
        note = service.cancel_rewrite(note_id)
    except NotebookConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except NotebookNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return NotebookPendingRewriteResponse(note=note, pending_rewrite=None)


@router.post("/notes/{note_id}/rewrite/confirm", response_model=NotebookPendingRewriteResponse)
async def confirm_notebook_rewrite(
    note_id: str,
    payload: NotebookRewriteSessionRequest,
) -> NotebookPendingRewriteResponse:
    service = NotebookAssistantService()
    try:
        note = service.confirm_rewrite(note_id)
    except NotebookConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except NotebookNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return NotebookPendingRewriteResponse(note=note, pending_rewrite=None)


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
