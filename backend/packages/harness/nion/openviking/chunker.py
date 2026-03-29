from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class NotebookChunk:
    chunk_index: int
    text: str
    heading_path: list[str]
    char_start: int
    char_end: int


def chunk_notebook_markdown(text: str) -> list[NotebookChunk]:
    chunks: list[NotebookChunk] = []
    current_heading_path: list[str] = []
    current_start = 0
    current_lines: list[str] = []
    current_chunk_start = 0

    def flush_chunk(end_offset: int) -> None:
        nonlocal current_lines, current_chunk_start
        chunk_text = "\n".join(current_lines).strip()
        if not chunk_text:
            current_lines = []
            current_chunk_start = end_offset
            return
        chunks.append(
            NotebookChunk(
                chunk_index=len(chunks),
                text=chunk_text,
                heading_path=[*current_heading_path],
                char_start=current_chunk_start,
                char_end=end_offset,
            )
        )
        current_lines = []
        current_chunk_start = end_offset

    for line in text.splitlines(keepends=True):
        stripped = line.strip()
        next_offset = current_start + len(line)
        if stripped.startswith("#"):
            flush_chunk(current_start)
            level = len(stripped) - len(stripped.lstrip("#"))
            title = stripped[level:].strip()
            current_heading_path = current_heading_path[: level - 1] + [title]
            current_chunk_start = next_offset
        elif stripped == "":
            flush_chunk(current_start)
            current_chunk_start = next_offset
        else:
            if not current_lines:
                current_chunk_start = current_start
            current_lines.append(line.rstrip("\n"))
        current_start = next_offset

    flush_chunk(len(text))
    return chunks
