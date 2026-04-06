from __future__ import annotations

import fnmatch
from pathlib import Path, PurePosixPath
from typing import TypedDict

_IGNORE_PATTERNS = [
    ".git",
    ".svn",
    ".hg",
    ".bzr",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    ".env",
    "env",
    ".tox",
    ".nox",
    ".eggs",
    "*.egg-info",
    "site-packages",
    "dist",
    "build",
    ".next",
    ".nuxt",
    ".output",
    ".turbo",
    "target",
    "out",
    ".idea",
    ".vscode",
    "*.swp",
    "*.swo",
    "*~",
    ".project",
    ".classpath",
    ".settings",
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini",
    "*.lnk",
    "*.log",
    "*.tmp",
    "*.temp",
    "*.bak",
    "*.cache",
    ".cache",
    "logs",
    ".coverage",
    "coverage",
    ".nyc_output",
    "htmlcov",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
]


class GrepMatch(TypedDict):
    path: str
    line_number: int
    line: str


def _should_ignore(name: str) -> bool:
    for pattern in _IGNORE_PATTERNS:
        if fnmatch.fnmatch(name, pattern):
            return True
    return False


def _iter_searchable_paths(root: Path):
    if not root.exists():
        raise FileNotFoundError(root)

    if root.is_file():
        if not root.is_symlink() and not _should_ignore(root.name):
            yield root.resolve()
        return

    for current_root, dir_names, file_names in root.walk():
        dir_names[:] = sorted(name for name in dir_names if not _should_ignore(name))
        for file_name in sorted(file_names):
            if _should_ignore(file_name):
                continue
            candidate = current_root / file_name
            if candidate.is_symlink():
                continue
            resolved = candidate.resolve()
            try:
                resolved.relative_to(root)
            except ValueError:
                continue
            yield resolved


def glob_search(path: str, pattern: str) -> list[str]:
    requested_root = Path(path)
    if requested_root.is_symlink():
        return []

    root = requested_root.resolve()
    matches: list[str] = []

    if root.is_file():
        if PurePosixPath(root.name).match(pattern):
            return [str(root)]
        return []

    for candidate in _iter_searchable_paths(root):
        relative = candidate.relative_to(root).as_posix()
        if PurePosixPath(relative).match(pattern):
            matches.append(str(candidate))

    return sorted(matches)


def grep_search(path: str, query: str) -> list[GrepMatch]:
    requested_root = Path(path)
    if requested_root.is_symlink():
        return []

    root = requested_root.resolve()
    matches: list[GrepMatch] = []

    for candidate in _iter_searchable_paths(root):
        try:
            with candidate.open(encoding="utf-8", errors="ignore") as handle:
                for index, line in enumerate(handle, start=1):
                    text = line.rstrip("\n")
                    if query in text:
                        matches.append(
                            {
                                "path": str(candidate),
                                "line_number": index,
                                "line": text,
                            }
                        )
        except OSError:
            continue

    return matches
