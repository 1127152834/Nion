"""Thread workdir file tree APIs."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.gateway.path_utils import resolve_thread_virtual_path
from nion.config.paths import VIRTUAL_PATH_PREFIX, get_paths
from nion.runtime_profile import RuntimeProfileRepository

router = APIRouter(tags=["files"])

THREAD_DEFAULT_ROOT = f"{VIRTUAL_PATH_PREFIX}/workspace"
DEFAULT_MAX_DEPTH = 6
DEFAULT_MAX_NODES = 5000
HIDDEN_PREFIX = "."
EXCLUDED_DIR_NAMES = {
    "__pycache__",
    ".git",
    ".svn",
    "node_modules",
}


class FilesDirectoryEntry(BaseModel):
    path: str
    name: str
    depth: int
    child_count: int = 0
    mtime: float | None = None


class FilesFileEntry(BaseModel):
    path: str
    name: str
    depth: int
    size: int = 0
    mtime: float | None = None


class FilesTreeResponse(BaseModel):
    root: str
    generated_at: str
    depth: int
    truncated: bool
    directories: list[FilesDirectoryEntry] = Field(default_factory=list)
    files: list[FilesFileEntry] = Field(default_factory=list)


class FilesMetaResponse(BaseModel):
    root: str
    actual_root: str
    generated_at: str
    thread_id: str
    execution_mode: str = "sandbox"
    host_workdir: str | None = None
    tree_backend: str = "host"
    watch_supported: bool = True


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _normalize_root(root: str) -> str:
    candidate = root.strip()
    if not candidate:
        return THREAD_DEFAULT_ROOT
    if not candidate.startswith("/"):
        candidate = f"/{candidate}"
    return candidate.rstrip("/") or THREAD_DEFAULT_ROOT


def _is_hidden(path: Path, *, include_hidden: bool) -> bool:
    if include_hidden:
        return False
    return any(part.startswith(HIDDEN_PREFIX) for part in path.parts)


def _build_tree_response(
    *,
    thread_id: str,
    virtual_root: str,
    actual_root: Path,
    depth: int,
    include_hidden: bool,
    max_nodes: int,
) -> FilesTreeResponse:
    if not actual_root.exists():
        raise HTTPException(status_code=404, detail=f"Files path not found: {virtual_root}")
    if not actual_root.is_dir():
        raise HTTPException(status_code=400, detail=f"Path is not a directory: {virtual_root}")

    directories: list[FilesDirectoryEntry] = []
    files: list[FilesFileEntry] = []
    truncated = False
    visited_nodes = 0

    for entry in sorted(actual_root.rglob("*"), key=lambda item: item.as_posix().lower()):
        try:
            relative = entry.relative_to(actual_root)
        except ValueError:
            continue

        depth_value = len(relative.parts)
        if depth_value > depth:
            continue
        if _is_hidden(relative, include_hidden=include_hidden):
            continue
        if any(part in EXCLUDED_DIR_NAMES for part in relative.parts):
            continue

        visited_nodes += 1
        if visited_nodes > max_nodes:
            truncated = True
            break

        virtual_path = f"{virtual_root.rstrip('/')}/{relative.as_posix()}"
        stat = entry.stat()
        if entry.is_dir():
            child_count = len(list(entry.iterdir())) if depth_value < depth else 0
            directories.append(
                FilesDirectoryEntry(
                    path=virtual_path,
                    name=entry.name,
                    depth=depth_value,
                    child_count=child_count,
                    mtime=stat.st_mtime,
                )
            )
        elif entry.is_file():
            files.append(
                FilesFileEntry(
                    path=virtual_path,
                    name=entry.name,
                    depth=depth_value,
                    size=stat.st_size,
                    mtime=stat.st_mtime,
                )
            )

    return FilesTreeResponse(
        root=virtual_root,
        generated_at=_now_iso(),
        depth=depth,
        truncated=truncated,
        directories=directories,
        files=files,
    )


def _resolve_thread_files_root(thread_id: str, root: str) -> tuple[str, Path]:
    virtual_root = _normalize_root(root)
    get_paths().ensure_thread_dirs(thread_id)
    actual_root = resolve_thread_virtual_path(thread_id, virtual_root)
    return virtual_root, actual_root


@router.get("/api/threads/{thread_id}/files/meta", response_model=FilesMetaResponse)
async def get_thread_files_meta(
    thread_id: str,
    root: str = Query(default=THREAD_DEFAULT_ROOT),
) -> FilesMetaResponse:
    virtual_root, actual_root = _resolve_thread_files_root(thread_id, root)
    profile = RuntimeProfileRepository().read(thread_id)
    return FilesMetaResponse(
        thread_id=thread_id,
        root=virtual_root,
        actual_root=str(actual_root),
        execution_mode=profile["execution_mode"],
        host_workdir=profile["host_workdir"],
        generated_at=_now_iso(),
    )


@router.get("/api/threads/{thread_id}/files/tree", response_model=FilesTreeResponse)
async def get_thread_files_tree(
    thread_id: str,
    root: str = Query(default=THREAD_DEFAULT_ROOT),
    depth: int = Query(default=DEFAULT_MAX_DEPTH, ge=1, le=12),
    include_hidden: bool = Query(default=False),
    max_nodes: int = Query(default=DEFAULT_MAX_NODES, ge=50, le=20000),
) -> FilesTreeResponse:
    virtual_root, actual_root = _resolve_thread_files_root(thread_id, root)
    return _build_tree_response(
        thread_id=thread_id,
        virtual_root=virtual_root,
        actual_root=actual_root,
        depth=depth,
        include_hidden=include_hidden,
        max_nodes=max_nodes,
    )

