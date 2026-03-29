from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any

from nion.config.paths import Paths, get_paths


def create_hook_package(
    *,
    hook_id: str,
    package_files: list[dict[str, Any]],
    paths: Paths | None = None,
) -> dict[str, Any]:
    resolved_paths = paths or get_paths()
    package_dir = ensure_hook_package_dir(hook_id, paths=resolved_paths)
    write_hook_package_files(package_dir=package_dir, package_files=package_files)
    return {
        "package_dir": str(package_dir),
        "package_manifest": build_hook_package_manifest(package_dir),
    }


def delete_hook_package(package_dir: str | Path, *, paths: Paths | None = None) -> None:
    resolved_paths = paths or get_paths()
    hook_root = resolved_paths.automation_hooks_dir.resolve()
    actual = Path(package_dir).resolve()
    try:
        actual.relative_to(hook_root)
    except ValueError as exc:
        raise ValueError(f"Hook package path must live under {hook_root}") from exc

    if actual.exists():
        shutil.rmtree(actual)


def ensure_hook_package_dir(hook_id: str, *, paths: Paths | None = None) -> Path:
    resolved_paths = paths or get_paths()
    package_dir = resolved_paths.automation_hook_dir(hook_id)
    package_dir.mkdir(parents=True, exist_ok=True)
    return package_dir


def write_hook_package_files(*, package_dir: str | Path, package_files: list[dict[str, Any]]) -> dict[str, Any]:
    resolved_package_dir = Path(package_dir).resolve()

    for package_file in package_files:
        relative_path = _normalize_relative_path(str(package_file["path"]))
        destination = (resolved_package_dir / relative_path).resolve()
        destination.parent.mkdir(parents=True, exist_ok=True)

        try:
            destination.relative_to(resolved_package_dir)
        except ValueError as exc:
            raise ValueError(f"Package file escapes hook directory: {relative_path}") from exc

        if "content_bytes" in package_file and package_file["content_bytes"] is not None:
            destination.write_bytes(package_file["content_bytes"])
        elif "content" in package_file and package_file["content"] is not None:
            destination.write_text(str(package_file["content"]))
        elif "source_path" in package_file and package_file["source_path"]:
            source = Path(str(package_file["source_path"])).resolve()
            shutil.copy2(source, destination)
        else:
            raise ValueError(f"Package file '{relative_path}' must provide content, content_bytes, or source_path")

    return build_hook_package_manifest(resolved_package_dir)


def delete_hook_package_files(*, package_dir: str | Path, relative_paths: list[str]) -> dict[str, Any]:
    resolved_package_dir = Path(package_dir).resolve()
    for relative_path in relative_paths:
        normalized = _normalize_relative_path(relative_path)
        target = (resolved_package_dir / normalized).resolve()
        try:
            target.relative_to(resolved_package_dir)
        except ValueError as exc:
            raise ValueError(f"Package file escapes hook directory: {relative_path}") from exc
        target.unlink(missing_ok=True)
    return build_hook_package_manifest(resolved_package_dir)


def build_hook_package_manifest(package_dir: str | Path) -> dict[str, Any]:
    resolved_package_dir = Path(package_dir).resolve()
    if not resolved_package_dir.exists():
        return {"files": []}

    files = sorted(
        path.relative_to(resolved_package_dir).as_posix()
        for path in resolved_package_dir.rglob("*")
        if path.is_file()
    )
    return {"files": files}


def _normalize_relative_path(path: str) -> str:
    normalized = path.strip().lstrip("/")
    if not normalized or normalized in {".", ".."}:
        raise ValueError("Package file path must not be empty")
    path_obj = Path(normalized)
    if any(part == ".." for part in path_obj.parts):
        raise ValueError("Package file path must not contain '..'")
    return path_obj.as_posix()
