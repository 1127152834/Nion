"""Middleware to inject uploaded files information into agent context."""

import logging
from pathlib import Path
from typing import NotRequired, override

from langchain.agents import AgentState
from langchain.agents.middleware import AgentMiddleware
from langchain_core.messages import HumanMessage
from langgraph.runtime import Runtime

from nion.config.paths import Paths, get_paths
from nion.utils.file_conversion import extract_outline

logger = logging.getLogger(__name__)
_PREVIEW_LINE_LIMIT = 3


class UploadsMiddlewareState(AgentState):
    """State schema for uploads middleware."""

    uploaded_files: NotRequired[list[dict] | None]


class UploadsMiddleware(AgentMiddleware[UploadsMiddlewareState]):
    """Middleware to inject uploaded files information into the agent context.

    Reads file metadata from the current message's additional_kwargs.files
    (set by the frontend after upload) and prepends an <uploaded_files> block
    to the last human message so the model knows which files are available.
    """

    state_schema = UploadsMiddlewareState

    def __init__(self, base_dir: str | None = None):
        """Initialize the middleware.

        Args:
            base_dir: Base directory for thread data. Defaults to Paths resolution.
        """
        super().__init__()
        self._paths = Paths(base_dir) if base_dir else get_paths()

    def _extract_outline_or_preview(self, file_path: Path) -> dict[str, list]:
        """Read outline metadata from a same-name markdown sidecar when available."""
        md_path = file_path.with_suffix(".md")
        if not md_path.is_file():
            return {}

        try:
            outline = extract_outline(md_path)
        except Exception:
            logger.warning("Failed to extract outline from markdown sidecar for %s", file_path.name, exc_info=True)
            outline = []

        if outline:
            return {"outline": outline}

        try:
            preview_lines = [
                line.strip()
                for line in md_path.read_text(encoding="utf-8").splitlines()
                if line.strip()
            ][: _PREVIEW_LINE_LIMIT]
        except Exception:
            logger.warning("Failed to read preview lines from markdown sidecar for %s", file_path.name, exc_info=True)
            return {}

        return {"preview_lines": preview_lines} if preview_lines else {}

    def _build_file_entry(self, file_path: Path, size: int) -> dict:
        """Build file metadata for prompt injection."""
        entry = {
            "filename": file_path.name,
            "size": size,
            "path": f"/mnt/user-data/uploads/{file_path.name}",
            "extension": file_path.suffix,
        }
        entry.update(self._extract_outline_or_preview(file_path))
        return entry

    def _collect_markdown_sidecars(self, uploads_dir: Path) -> set[str]:
        """Collect markdown sidecar filenames so they are not exposed as uploads."""
        file_paths = [path for path in uploads_dir.iterdir() if path.is_file()]
        sidecar_stems = {
            path.stem
            for path in file_paths
            if path.suffix.lower() != ".md"
        }
        return {
            path.name
            for path in file_paths
            if path.suffix.lower() == ".md" and path.stem in sidecar_stems
        }

    def _create_files_message(self, new_files: list[dict], historical_files: list[dict]) -> str:
        """Create a formatted message listing uploaded files.

        Args:
            new_files: Files uploaded in the current message.
            historical_files: Files uploaded in previous messages.

        Returns:
            Formatted string inside <uploaded_files> tags.
        """
        def append_file_details(file: dict) -> None:
            size_kb = file["size"] / 1024
            size_str = f"{size_kb:.1f} KB" if size_kb < 1024 else f"{size_kb / 1024:.1f} MB"
            lines.append(f"- {file['filename']} ({size_str})")
            lines.append(f"  Path: {file['path']}")

            outline = file.get("outline") or []
            if outline:
                lines.append("  Document structure:")
                for item in outline:
                    indent = "    " * max(int(item.get("level", 1)) - 1, 0)
                    title = str(item.get("title", "")).strip()
                    line_number = item.get("line")
                    lines.append(f"  {indent}- {title} (line {line_number})")
            else:
                preview_lines = file.get("preview_lines") or []
                if preview_lines:
                    lines.append("  Preview lines:")
                    for preview_line in preview_lines:
                        lines.append(f"    - {preview_line}")

            lines.append("")

        lines = ["<uploaded_files>"]

        lines.append("The following files were uploaded in this message:")
        lines.append("")
        if new_files:
            for file in new_files:
                append_file_details(file)
        else:
            lines.append("(empty)")

        if historical_files:
            lines.append("The following files were uploaded in previous messages and are still available:")
            lines.append("")
            for file in historical_files:
                append_file_details(file)

        lines.append("Use a file-first workflow: inspect the structure or preview above, then use `read_file` on the exact path you need.")
        lines.append("</uploaded_files>")

        return "\n".join(lines)

    def _files_from_kwargs(self, message: HumanMessage, uploads_dir: Path | None = None) -> list[dict] | None:
        """Extract file info from message additional_kwargs.files.

        The frontend sends uploaded file metadata in additional_kwargs.files
        after a successful upload. Each entry has: filename, size (bytes),
        path (virtual path), status.

        Args:
            message: The human message to inspect.
            uploads_dir: Physical uploads directory used to verify file existence.
                         When provided, entries whose files no longer exist are skipped.

        Returns:
            List of file dicts with virtual paths, or None if the field is absent or empty.
        """
        kwargs_files = (message.additional_kwargs or {}).get("files")
        if not isinstance(kwargs_files, list) or not kwargs_files:
            return None

        files = []
        for f in kwargs_files:
            if not isinstance(f, dict):
                continue
            filename = f.get("filename") or ""
            if not filename or Path(filename).name != filename:
                continue
            physical_path = uploads_dir / filename if uploads_dir is not None else None
            if uploads_dir is not None and not physical_path.is_file():
                continue
            if physical_path is not None:
                files.append(self._build_file_entry(physical_path, int(f.get("size") or 0)))
                continue

            virtual_path = Path(filename)
            files.append(
                {
                    "filename": filename,
                    "size": int(f.get("size") or 0),
                    "path": f"/mnt/user-data/uploads/{filename}",
                    "extension": virtual_path.suffix,
                }
            )
        return files if files else None

    @override
    def before_agent(self, state: UploadsMiddlewareState, runtime: Runtime) -> dict | None:
        """Inject uploaded files information before agent execution.

        New files come from the current message's additional_kwargs.files.
        Historical files are scanned from the thread's uploads directory,
        excluding the new ones.

        Prepends <uploaded_files> context to the last human message content.
        The original additional_kwargs (including files metadata) is preserved
        on the updated message so the frontend can read it from the stream.

        Args:
            state: Current agent state.
            runtime: Runtime context containing thread_id.

        Returns:
            State updates including uploaded files list.
        """
        messages = list(state.get("messages", []))
        if not messages:
            return None

        last_message_index = len(messages) - 1
        last_message = messages[last_message_index]

        if not isinstance(last_message, HumanMessage):
            return None

        # Resolve uploads directory for existence checks
        thread_id = runtime.context.get("thread_id") if runtime.context else None
        uploads_dir = self._paths.sandbox_uploads_dir(thread_id) if thread_id else None

        # Get newly uploaded files from the current message's additional_kwargs.files
        new_files = self._files_from_kwargs(last_message, uploads_dir) or []

        # Collect historical files from the uploads directory (all except the new ones)
        new_filenames = {f["filename"] for f in new_files}
        historical_files: list[dict] = []
        if uploads_dir and uploads_dir.exists():
            markdown_sidecars = self._collect_markdown_sidecars(uploads_dir)
            for file_path in sorted(uploads_dir.iterdir()):
                if (
                    file_path.is_file()
                    and file_path.name not in new_filenames
                    and file_path.name not in markdown_sidecars
                ):
                    stat = file_path.stat()
                    historical_files.append(self._build_file_entry(file_path, stat.st_size))

        if not new_files and not historical_files:
            return None

        logger.debug(f"New files: {[f['filename'] for f in new_files]}, historical: {[f['filename'] for f in historical_files]}")

        # Create files message and prepend to the last human message content
        files_message = self._create_files_message(new_files, historical_files)

        # Extract original content - handle both string and list formats
        original_content = ""
        if isinstance(last_message.content, str):
            original_content = last_message.content
        elif isinstance(last_message.content, list):
            text_parts = []
            for block in last_message.content:
                if isinstance(block, dict) and block.get("type") == "text":
                    text_parts.append(block.get("text", ""))
            original_content = "\n".join(text_parts)

        # Create new message with combined content.
        # Preserve additional_kwargs (including files metadata) so the frontend
        # can read structured file info from the streamed message.
        updated_message = HumanMessage(
            content=f"{files_message}\n\n{original_content}",
            id=last_message.id,
            additional_kwargs=last_message.additional_kwargs,
        )

        messages[last_message_index] = updated_message

        return {
            "uploaded_files": new_files,
            "messages": messages,
        }
