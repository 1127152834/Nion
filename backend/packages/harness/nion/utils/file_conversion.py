"""File conversion utilities.

Converts document files (PDF, PPT, Excel, Word) to Markdown using
PyMuPDF4LLM/MarkItDown.
No FastAPI or HTTP dependencies — pure utility functions.
"""

import asyncio
import logging
import re
from pathlib import Path
from types import SimpleNamespace

logger = logging.getLogger(__name__)

# File extensions that should be converted to markdown
CONVERTIBLE_EXTENSIONS = {
    ".pdf",
    ".ppt",
    ".pptx",
    ".xls",
    ".xlsx",
    ".doc",
    ".docx",
}

DEFAULT_THREAD_OFFLOAD_THRESHOLD_BYTES = 5 * 1024 * 1024
_MARKDOWN_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")
_SPLIT_BOLD_HEADING_RE = re.compile(r"^\*\*((?:\d+\.)*\d+)\*\*\s+\*\*(.+?)\*\*\s*$")


def _convert_with_markitdown(file_path: Path) -> str:
    from markitdown import MarkItDown

    md = MarkItDown()
    result = md.convert(str(file_path))
    return result.text_content


def _convert_pdf_with_pymupdf4llm(file_path: Path) -> str:
    import pymupdf4llm

    return pymupdf4llm.to_markdown(str(file_path))


def _convert_document_to_markdown_text(file_path: Path) -> str:
    if file_path.suffix.lower() == ".pdf":
        try:
            return _convert_pdf_with_pymupdf4llm(file_path)
        except Exception:
            logger.warning(
                "PyMuPDF4LLM conversion failed for %s, falling back to MarkItDown",
                file_path.name,
                exc_info=True,
            )

    return _convert_with_markitdown(file_path)


def _get_thread_offload_threshold_bytes() -> int:
    try:
        from nion.config.app_config import get_app_config

        return get_app_config().document_conversion.thread_offload_threshold_bytes
    except Exception:
        return DEFAULT_THREAD_OFFLOAD_THRESHOLD_BYTES


def _should_offload_to_thread(file_path: Path) -> bool:
    try:
        return file_path.stat().st_size >= _get_thread_offload_threshold_bytes()
    except OSError:
        return False


def extract_outline(md_path: Path) -> list[SimpleNamespace]:
    """Extract a shallow outline from a markdown file.

    Supports standard markdown headings and split-bold numbered headings like:
    `**1** **实验设置**`.
    """
    outline: list[SimpleNamespace] = []
    for line_number, raw_line in enumerate(md_path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw_line.strip()
        if not line:
            continue

        markdown_match = _MARKDOWN_HEADING_RE.match(line)
        if markdown_match is not None:
            outline.append(
                SimpleNamespace(
                    level=len(markdown_match.group(1)),
                    title=markdown_match.group(2).strip(),
                    line=line_number,
                )
            )
            continue

        split_bold_match = _SPLIT_BOLD_HEADING_RE.match(line)
        if split_bold_match is not None:
            number = split_bold_match.group(1).strip()
            title = split_bold_match.group(2).strip()
            outline.append(
                SimpleNamespace(
                    level=min(number.count(".") + 2, 6),
                    title=f"{number} {title}",
                    line=line_number,
                )
            )

    return outline


async def convert_file_to_markdown(file_path: Path) -> Path | None:
    """Convert a file to markdown.

    Args:
        file_path: Path to the file to convert.

    Returns:
        Path to the markdown file if conversion was successful, None otherwise.
    """
    try:
        if _should_offload_to_thread(file_path):
            markdown_text = await asyncio.to_thread(
                _convert_document_to_markdown_text,
                file_path,
            )
        else:
            markdown_text = _convert_document_to_markdown_text(file_path)

        # Save as .md file with same name
        md_path = file_path.with_suffix(".md")
        md_path.write_text(markdown_text, encoding="utf-8")

        logger.info(f"Converted {file_path.name} to markdown: {md_path.name}")
        return md_path
    except Exception as e:
        logger.error(f"Failed to convert {file_path.name} to markdown: {e}")
        return None
