from __future__ import annotations

from pathlib import Path, PurePosixPath
from typing import TypedDict

from nion.sandbox.local.list_dir import _should_ignore


class GrepMatch(TypedDict):
    path: str
    line_number: int
    line: str


def _iter_searchable_paths(root: Path):
    if not root.exists():
        raise FileNotFoundError(root)

    if root.is_file():
        if not _should_ignore(root.name):
            yield root.resolve()
        return

    for current_root, dir_names, file_names in root.walk():
        dir_names[:] = sorted(name for name in dir_names if not _should_ignore(name))
        for file_name in sorted(file_names):
            if _should_ignore(file_name):
                continue
            yield (current_root / file_name).resolve()


def glob_search(path: str, pattern: str) -> list[str]:
    root = Path(path).resolve()
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
    root = Path(path).resolve()
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
