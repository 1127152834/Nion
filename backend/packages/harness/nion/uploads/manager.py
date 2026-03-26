from __future__ import annotations

from pathlib import Path
from urllib.parse import quote

from nion.config.paths import VIRTUAL_PATH_PREFIX, get_paths


class PathTraversalError(ValueError):
    """Raised when a filename escapes the uploads directory."""


def get_uploads_dir(thread_id: str) -> Path:
    """Return the uploads directory path for a thread without creating it."""
    return get_paths().sandbox_uploads_dir(thread_id)


def ensure_uploads_dir(thread_id: str) -> Path:
    """Return the uploads directory path for a thread, creating it if needed."""
    uploads_dir = get_uploads_dir(thread_id)
    uploads_dir.mkdir(parents=True, exist_ok=True)
    return uploads_dir


def normalize_filename(filename: str) -> str:
    """Normalize a user-supplied upload filename while preserving Nion semantics."""
    if "\\" in filename:
        raise ValueError("Filename contains backslash characters")

    safe_filename = Path(filename).name
    if not safe_filename or safe_filename in {".", ".."}:
        raise ValueError(f"Filename is unsafe: {filename!r}")
    if len(safe_filename.encode("utf-8")) > 255:
        raise ValueError("Filename too long")

    return safe_filename


def upload_virtual_path(filename: str) -> str:
    return f"{VIRTUAL_PATH_PREFIX}/uploads/{filename}"


def upload_artifact_url(thread_id: str, filename: str) -> str:
    encoded_filename = quote(filename, safe="")
    return f"/api/threads/{thread_id}/artifacts{VIRTUAL_PATH_PREFIX}/uploads/{encoded_filename}"


def delete_file_safe(uploads_dir: Path, filename: str) -> Path:
    file_path = (uploads_dir / filename).resolve()

    try:
        file_path.relative_to(uploads_dir.resolve())
    except ValueError as exc:
        raise PathTraversalError("Access denied: path traversal detected") from exc

    if not file_path.is_file():
        raise FileNotFoundError(f"File not found: {filename}")

    file_path.unlink()
    return file_path
