from __future__ import annotations

import hashlib
import json
import mimetypes
import re
import shutil
import sqlite3
import uuid
from datetime import UTC, datetime
from pathlib import Path

from nion.config.paths import Paths, get_paths
from nion.notebook.frontmatter import render_frontmatter, split_frontmatter
from nion.notebook.models import NotebookAsset, NotebookInboxItem, NotebookNote, NotebookNoteSummary


INBOX_DIRECTORY_NAME = "收件箱"


class NotebookError(Exception):
    """Base notebook error."""


class NotebookNotFoundError(NotebookError):
    """Raised when a note cannot be found."""


class NotebookConflictError(NotebookError):
    """Raised when a stale write would overwrite newer content."""


class NotebookAssetNotFoundError(NotebookError):
    """Raised when a notebook asset cannot be found."""


class NotebookDirectoryNotFoundError(NotebookError):
    """Raised when a notebook directory cannot be found."""


class NotebookDirectoryNotEmptyError(NotebookError):
    """Raised when attempting to delete a non-empty notebook directory."""


class NotebookDirectoryAlreadyExistsError(NotebookError):
    """Raised when attempting to create a notebook directory that already exists."""


class NotebookDirectoryMoveError(NotebookError):
    """Raised when attempting an invalid notebook directory move."""


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _slugify(value: str) -> str:
    normalized = re.sub(r"[^\w\s-]", "", value, flags=re.UNICODE).strip().lower()
    normalized = re.sub(r"[-\s]+", "-", normalized)
    return normalized or "untitled-note"


def _note_id() -> str:
    return f"note_{datetime.now(UTC).strftime('%Y%m%d')}_{uuid.uuid4().hex[:8]}"


def _asset_id() -> str:
    return f"asset_{datetime.now(UTC).strftime('%Y%m%d')}_{uuid.uuid4().hex[:8]}"


def _stable_note_id_for_path(path: Path) -> str:
    digest = hashlib.sha1(str(path.resolve()).encode("utf-8")).hexdigest()[:12]
    return f"note_legacy_{digest}"


def is_visible_notebook_relative_path(path: Path) -> bool:
    return ".nion" not in path.parts and not any(part.startswith(".") for part in path.parts)


class NotebookService:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._paths = Paths(base_dir=base_dir) if base_dir is not None else get_paths()
        self._paths.ensure_notebook_dirs()
        self._metadata_db_path = self._paths.notebook_meta_dir / "metadata.sqlite3"
        self._init_metadata_schema()

    def _connect_metadata(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._metadata_db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout = 5000;")
        return conn

    def _init_metadata_schema(self) -> None:
        with self._connect_metadata() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS notebook_note_metadata (
                    note_id TEXT PRIMARY KEY,
                    is_pinned INTEGER NOT NULL DEFAULT 0
                );

                CREATE TABLE IF NOT EXISTS notebook_assets (
                    asset_id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    relative_path TEXT NOT NULL UNIQUE,
                    source_kind TEXT NOT NULL,
                    mime_type TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    file_size INTEGER,
                    provenance_json TEXT,
                    tags_json TEXT NOT NULL DEFAULT '[]'
                );
                """
            )
            columns = {row["name"] for row in conn.execute("PRAGMA table_info(notebook_assets)").fetchall()}
            if "provenance_json" not in columns:
                conn.execute("ALTER TABLE notebook_assets ADD COLUMN provenance_json TEXT")

    def _read_pinned_state(self, note_id: str) -> bool:
        with self._connect_metadata() as conn:
            row = conn.execute(
                "SELECT is_pinned FROM notebook_note_metadata WHERE note_id = ?",
                (note_id,),
            ).fetchone()
        return bool(row["is_pinned"]) if row else False

    def _write_pinned_state(self, note_id: str, *, is_pinned: bool) -> None:
        with self._connect_metadata() as conn:
            conn.execute(
                """
                INSERT INTO notebook_note_metadata(note_id, is_pinned)
                VALUES (?, ?)
                ON CONFLICT(note_id) DO UPDATE SET is_pinned = excluded.is_pinned
                """,
                (note_id, int(is_pinned)),
            )

    def _resolve_directory(self, directory: str) -> Path:
        stripped = directory.strip().strip("/")
        if stripped.lower() == "inbox":
            stripped = INBOX_DIRECTORY_NAME
        root = self._paths.notebook_root_dir.resolve()
        target = (root / stripped).resolve() if stripped else root
        try:
            target.relative_to(root)
        except ValueError as exc:
            raise ValueError("Notebook directory traversal detected") from exc
        return target

    def _resolve_default_note_directory(self, directory: str) -> Path:
        stripped = directory.strip().strip("/")
        return self._resolve_directory(stripped or INBOX_DIRECTORY_NAME)

    def _relative_path(self, path: Path) -> str:
        return path.resolve().relative_to(self._paths.notebook_root_dir.resolve()).as_posix()

    def _visible_relative_dir(self, path: Path) -> Path:
        relative = path.resolve().relative_to(self._paths.notebook_root_dir.resolve())
        if relative == Path("."):
            return relative
        if not is_visible_notebook_relative_path(relative):
            raise ValueError("Notebook hidden directories are not allowed")
        return relative

    def _normalize_directory_name(self, name: str) -> str:
        stripped = name.strip().strip("/")
        if not stripped:
            raise ValueError("Notebook directory name is required")
        if "/" in stripped or "\\" in stripped:
            raise ValueError("Notebook directory name must be a single path segment")
        if stripped in {".", ".."} or stripped.startswith("."):
            raise ValueError("Notebook hidden directories are not allowed")
        return stripped

    def _attachment_dir_for_path(self, path: Path, note_id: str) -> Path:
        return path.parent / ".assets" / note_id

    def _asset_absolute_path(self, relative_path: str) -> Path:
        return self._resolve_directory(relative_path)

    def _serialize_tags(self, tags: list[str]) -> str:
        return json.dumps(tags, ensure_ascii=False)

    def _deserialize_tags(self, raw: str | None) -> list[str]:
        if not raw:
            return []
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return []
        if not isinstance(data, list):
            return []
        return [str(tag) for tag in data]

    def _build_inbox_item_from_note(self, note: NotebookNote) -> NotebookInboxItem:
        compact = " ".join(note.body.strip().split())
        summary = compact[:140] + ("..." if len(compact) > 140 else "")
        return NotebookInboxItem(
            inbox_id=f"note:{note.note_id}",
            entry_type="note",
            note_id=note.note_id,
            title=note.title,
            relative_path=note.relative_path,
            created_at=note.created_at,
            updated_at=note.updated_at,
            summary=summary or None,
            tags=note.tags,
        )

    def _build_asset(self, row: sqlite3.Row | dict[str, object]) -> NotebookAsset:
        payload = dict(row)
        relative_path = str(payload["relative_path"])
        absolute_path = self._asset_absolute_path(relative_path)
        return NotebookAsset(
            asset_id=str(payload["asset_id"]),
            title=str(payload["title"]),
            relative_path=relative_path,
            absolute_path=str(absolute_path),
            source_kind=str(payload["source_kind"]),
            mime_type=str(payload["mime_type"]) if payload.get("mime_type") is not None else None,
            created_at=str(payload["created_at"]),
            updated_at=str(payload["updated_at"]),
            file_size=int(payload["file_size"]) if payload.get("file_size") is not None else None,
            provenance=json.loads(str(payload["provenance_json"])) if payload.get("provenance_json") else None,
            tags=self._deserialize_tags(str(payload.get("tags_json") or "[]")),
        )

    def _upsert_asset(self, asset: NotebookAsset) -> None:
        with self._connect_metadata() as conn:
            conn.execute(
                """
                INSERT INTO notebook_assets(
                    asset_id, title, relative_path, source_kind, mime_type,
                    created_at, updated_at, file_size, provenance_json, tags_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(asset_id) DO UPDATE SET
                    title = excluded.title,
                    relative_path = excluded.relative_path,
                    source_kind = excluded.source_kind,
                    mime_type = excluded.mime_type,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at,
                    file_size = excluded.file_size,
                    provenance_json = excluded.provenance_json,
                    tags_json = excluded.tags_json
                """,
                (
                    asset.asset_id,
                    asset.title,
                    asset.relative_path,
                    asset.source_kind,
                    asset.mime_type,
                    asset.created_at,
                    asset.updated_at,
                    asset.file_size,
                    json.dumps(asset.provenance, ensure_ascii=False) if asset.provenance else None,
                    self._serialize_tags(asset.tags),
                ),
            )

    def _build_note(self, path: Path) -> NotebookNote:
        text = path.read_text(encoding="utf-8")
        frontmatter, body = split_frontmatter(text)
        note_id = str(frontmatter.get("id") or _stable_note_id_for_path(path))
        title = str(frontmatter.get("title") or path.stem)
        created_at = str(
            frontmatter.get("created_at")
            or datetime.fromtimestamp(path.stat().st_ctime, UTC).isoformat()
        )
        updated_at = str(
            frontmatter.get("updated_at")
            or datetime.fromtimestamp(path.stat().st_mtime, UTC).isoformat()
        )
        tags = frontmatter.get("tags")
        normalized_tags = [str(tag) for tag in tags] if isinstance(tags, list) else []
        return NotebookNote(
            note_id=note_id,
            title=title,
            relative_path=self._relative_path(path),
            absolute_path=str(path.resolve()),
            created_at=created_at,
            updated_at=updated_at,
            content_hash=_hash_text(text),
            body=body.lstrip("\n").rstrip("\n"),
            tags=normalized_tags,
            is_pinned=self._read_pinned_state(note_id),
        )

    def _write_note(self, path: Path, *, note_id: str, title: str, created_at: str, updated_at: str, body: str, tags: list[str] | None = None) -> NotebookNote:
        path.parent.mkdir(parents=True, exist_ok=True)
        text = render_frontmatter(
            {
                "id": note_id,
                "title": title,
                "created_at": created_at,
                "updated_at": updated_at,
                "tags": tags or [],
            },
            body,
        )
        path.write_text(text, encoding="utf-8")
        return self._build_note(path)

    def _find_note_path(self, note_id: str) -> Path:
        for path in self._paths.notebook_root_dir.rglob("*.md"):
            relative = path.resolve().relative_to(self._paths.notebook_root_dir.resolve())
            if not is_visible_notebook_relative_path(relative):
                continue
            if _stable_note_id_for_path(path) == note_id:
                return path
            try:
                frontmatter, _body = split_frontmatter(path.read_text(encoding="utf-8"))
            except OSError:
                continue
            if frontmatter.get("id") == note_id:
                return path
        raise NotebookNotFoundError(f"Notebook note not found: {note_id}")

    def create_note(self, *, directory: str, title: str, body: str) -> NotebookNote:
        target_dir = self._resolve_default_note_directory(directory)
        slug = _slugify(title)
        candidate = target_dir / f"{slug}.md"
        suffix = 2
        while candidate.exists():
            candidate = target_dir / f"{slug}-{suffix}.md"
            suffix += 1

        now = _now_iso()
        return self._write_note(
            candidate,
            note_id=_note_id(),
            title=title,
            created_at=now,
            updated_at=now,
            body=body,
            tags=[],
        )

    def create_directory(self, *, parent_directory: str, name: str) -> str:
        parent = self._resolve_directory(parent_directory)
        self._visible_relative_dir(parent)
        target = parent / self._normalize_directory_name(name)
        relative = self._visible_relative_dir(target)
        if target.exists():
            raise NotebookDirectoryAlreadyExistsError(
                f"Notebook directory already exists: {relative.as_posix()}"
            )
        target.mkdir(parents=True, exist_ok=False)
        return relative.as_posix()

    def rename_directory(self, directory: str, name: str) -> str:
        current = self._resolve_directory(directory)
        current_relative = self._visible_relative_dir(current)
        if current_relative == Path("."):
            raise ValueError("Notebook root directory cannot be renamed")
        if not current.exists() or not current.is_dir():
            raise NotebookDirectoryNotFoundError(f"Notebook directory not found: {directory}")

        target = current.parent / self._normalize_directory_name(name)
        target_relative = self._visible_relative_dir(target)
        if target.exists() and target != current:
            raise ValueError(f"Notebook directory already exists: {target_relative.as_posix()}")
        if target != current:
            current.rename(target)
        return target_relative.as_posix()

    def delete_directory(self, directory: str) -> None:
        target = self._resolve_directory(directory)
        relative = self._visible_relative_dir(target)
        if relative == Path("."):
            raise ValueError("Notebook root directory cannot be deleted")
        if not target.exists() or not target.is_dir():
            raise NotebookDirectoryNotFoundError(f"Notebook directory not found: {directory}")
        if any(target.iterdir()):
            raise NotebookDirectoryNotEmptyError(
                f"Notebook directory is not empty: {relative.as_posix()}"
            )
        target.rmdir()

    def move_directory(self, *, directory: str, parent_directory: str) -> str:
        current = self._resolve_directory(directory)
        current_relative = self._visible_relative_dir(current)
        if current_relative == Path("."):
            raise ValueError("Notebook root directory cannot be moved")
        if not current.exists() or not current.is_dir():
            raise NotebookDirectoryNotFoundError(f"Notebook directory not found: {directory}")

        target_parent = self._resolve_directory(parent_directory)
        self._visible_relative_dir(target_parent)
        if not target_parent.exists() or not target_parent.is_dir():
            raise NotebookDirectoryNotFoundError(
                f"Notebook directory not found: {parent_directory}"
            )

        try:
            target_parent.relative_to(current)
        except ValueError:
            pass
        else:
            raise NotebookDirectoryMoveError(
                "Notebook directory cannot be moved into itself or a descendant"
            )

        target = target_parent / current.name
        target_relative = self._visible_relative_dir(target)
        if target == current:
            return current_relative.as_posix()
        if target.exists():
            raise NotebookDirectoryAlreadyExistsError(
                f"Notebook directory already exists: {target_relative.as_posix()}"
            )
        current.rename(target)
        return target_relative.as_posix()

    def read_note(self, note_id: str) -> NotebookNote:
        return self._build_note(self._find_note_path(note_id))

    def update_note(self, *, note_id: str, body: str, expected_content_hash: str, title: str | None = None) -> NotebookNote:
        path = self._find_note_path(note_id)
        current = self._build_note(path)
        if current.content_hash != expected_content_hash:
            raise NotebookConflictError(f"Notebook note was modified concurrently: {note_id}")

        return self._write_note(
            path,
            note_id=current.note_id,
            title=title or current.title,
            created_at=current.created_at,
            updated_at=_now_iso(),
            body=body,
            tags=current.tags,
        )

    def rename_note(self, note_id: str, title: str) -> NotebookNote:
        current_path = self._find_note_path(note_id)
        current = self._build_note(current_path)
        renamed_path = current_path.with_name(f"{_slugify(title)}.md")
        if renamed_path != current_path:
            renamed_path.parent.mkdir(parents=True, exist_ok=True)
            current_path.rename(renamed_path)
        return self._write_note(
            renamed_path,
            note_id=current.note_id,
            title=title,
            created_at=current.created_at,
            updated_at=_now_iso(),
            body=current.body,
            tags=current.tags,
        )

    def move_note(self, note_id: str, directory: str) -> NotebookNote:
        current_path = self._find_note_path(note_id)
        current = self._build_note(current_path)
        target_dir = self._resolve_directory(directory)
        moved_path = target_dir / current_path.name
        current_attachment_dir = self._attachment_dir_for_path(current_path, note_id)
        moved_attachment_dir = self._attachment_dir_for_path(moved_path, note_id)
        if moved_path != current_path:
            moved_path.parent.mkdir(parents=True, exist_ok=True)
            current_path.rename(moved_path)
            if current_attachment_dir.exists() and current_attachment_dir != moved_attachment_dir:
                moved_attachment_dir.parent.mkdir(parents=True, exist_ok=True)
                current_attachment_dir.rename(moved_attachment_dir)
        return self._write_note(
            moved_path,
            note_id=current.note_id,
            title=current.title,
            created_at=current.created_at,
            updated_at=_now_iso(),
            body=current.body,
            tags=current.tags,
        )

    def list_note_summaries(self) -> list[NotebookNoteSummary]:
        summaries: list[NotebookNoteSummary] = []
        for path in sorted(self._paths.notebook_root_dir.rglob("*.md"), key=lambda item: item.as_posix().lower()):
            relative = path.resolve().relative_to(self._paths.notebook_root_dir.resolve())
            if not is_visible_notebook_relative_path(relative):
                continue
            note = self._build_note(path)
            compact = " ".join(note.body.strip().split())
            summary = compact[:140] + ("..." if len(compact) > 140 else "")
            summaries.append(
                NotebookNoteSummary(
                    note_id=note.note_id,
                    title=note.title,
                    relative_path=note.relative_path,
                    created_at=note.created_at,
                    updated_at=note.updated_at,
                    summary=summary,
                    tags=note.tags,
                    is_pinned=note.is_pinned,
                )
            )
        return summaries

    def build_inbox_items(
        self,
        *,
        notes: list[NotebookNote],
        assets: list[NotebookAsset],
    ) -> list[NotebookInboxItem]:
        note_items = [self._build_inbox_item_from_note(note) for note in notes]
        asset_items = [
            NotebookInboxItem(
                inbox_id=f"asset:{asset.asset_id}",
                entry_type="asset",
                asset_id=asset.asset_id,
                title=asset.title,
                relative_path=asset.relative_path,
                created_at=asset.created_at,
                updated_at=asset.updated_at,
                mime_type=asset.mime_type,
                tags=asset.tags,
            )
            for asset in assets
        ]
        return sorted(
            [*note_items, *asset_items],
            key=lambda item: (item.updated_at, item.created_at),
            reverse=True,
        )

    def archive_asset(self, *, source_path: str, directory: str) -> NotebookAsset:
        source = Path(source_path).expanduser().resolve()
        if not source.exists():
            raise FileNotFoundError(f"Notebook asset source not found: {source}")
        if not source.is_file():
            raise ValueError(f"Notebook asset source must be a file: {source}")

        target_dir = self._resolve_default_note_directory(directory)
        target_dir.mkdir(parents=True, exist_ok=True)

        suffix = "".join(source.suffixes)
        stem = source.name[: -len(suffix)] if suffix else source.name
        candidate = target_dir / source.name
        copy_index = 2
        while candidate.exists():
            next_name = f"{stem}-{copy_index}{suffix}" if stem else f"asset-{copy_index}{suffix}"
            candidate = target_dir / next_name
            copy_index += 1

        shutil.copy2(source, candidate)
        stats = candidate.stat()
        now = _now_iso()
        asset = NotebookAsset(
            asset_id=_asset_id(),
            title=candidate.name,
            relative_path=self._relative_path(candidate),
            absolute_path=str(candidate.resolve()),
            source_kind="workspace_copy",
            mime_type=mimetypes.guess_type(candidate.name)[0],
            created_at=now,
            updated_at=now,
            file_size=stats.st_size,
            provenance={
                "source_kind": "workspace_artifact",
                "source_path": str(source),
            },
            tags=[],
        )
        self._upsert_asset(asset)
        return asset

    def list_assets(self) -> list[NotebookAsset]:
        with self._connect_metadata() as conn:
            rows = conn.execute(
                """
                SELECT asset_id, title, relative_path, source_kind, mime_type,
                       created_at, updated_at, file_size, tags_json
                FROM notebook_assets
                ORDER BY updated_at DESC, created_at DESC
                """
            ).fetchall()
        assets: list[NotebookAsset] = []
        for row in rows:
            asset = self._build_asset(row)
            if Path(asset.absolute_path).exists():
                assets.append(asset)
        return assets

    def read_asset(self, asset_id: str) -> NotebookAsset:
        with self._connect_metadata() as conn:
            row = conn.execute(
                """
                SELECT asset_id, title, relative_path, source_kind, mime_type,
                       created_at, updated_at, file_size, tags_json
                FROM notebook_assets
                WHERE asset_id = ?
                """,
                (asset_id,),
            ).fetchone()
        if row is None:
            raise NotebookAssetNotFoundError(f"Notebook asset not found: {asset_id}")
        asset = self._build_asset(row)
        if not Path(asset.absolute_path).exists():
            raise NotebookAssetNotFoundError(f"Notebook asset file not found: {asset.relative_path}")
        return asset

    def move_asset(self, asset_id: str, directory: str) -> NotebookAsset:
        current = self.read_asset(asset_id)
        current_path = Path(current.absolute_path)
        target_dir = self._resolve_directory(directory)
        moved_path = target_dir / current_path.name
        if moved_path != current_path:
            moved_path.parent.mkdir(parents=True, exist_ok=True)
            current_path.rename(moved_path)
        moved = NotebookAsset(
            asset_id=current.asset_id,
            title=moved_path.name,
            relative_path=self._relative_path(moved_path),
            absolute_path=str(moved_path.resolve()),
            source_kind=current.source_kind,
            mime_type=current.mime_type,
            created_at=current.created_at,
            updated_at=_now_iso(),
            file_size=current.file_size,
            provenance=current.provenance,
            tags=current.tags,
        )
        self._upsert_asset(moved)
        return moved

    def list_inbox_items(self) -> list[NotebookInboxItem]:
        notes = [
            self._build_note(path)
            for path in sorted(self._paths.notebook_root_dir.rglob("*.md"), key=lambda item: item.as_posix().lower())
            if is_visible_notebook_relative_path(
                path.resolve().relative_to(self._paths.notebook_root_dir.resolve())
            )
            and self._relative_path(path).startswith(f"{INBOX_DIRECTORY_NAME}/")
        ]
        assets = [
            asset for asset in self.list_assets() if asset.relative_path.startswith(f"{INBOX_DIRECTORY_NAME}/")
        ]
        return self.build_inbox_items(notes=notes, assets=assets)

    def note_attachment_dir(self, note_id: str) -> Path:
        note_path = self._find_note_path(note_id)
        attachment_dir = self._attachment_dir_for_path(note_path, note_id)
        attachment_dir.mkdir(parents=True, exist_ok=True)
        return attachment_dir

    def update_note_metadata(
        self,
        note_id: str,
        *,
        tags: list[str] | None = None,
        is_pinned: bool | None = None,
    ) -> NotebookNote:
        current = self.read_note(note_id)
        next_tags = current.tags if tags is None else [str(tag) for tag in tags]
        note = self._write_note(
            Path(current.absolute_path),
            note_id=current.note_id,
            title=current.title,
            created_at=current.created_at,
            updated_at=_now_iso(),
            body=current.body,
            tags=next_tags,
        )
        if is_pinned is not None:
            self._write_pinned_state(note.note_id, is_pinned=is_pinned)
        return self.read_note(note_id)
