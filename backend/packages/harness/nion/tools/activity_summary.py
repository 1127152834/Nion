from __future__ import annotations

from nion.tools.activity_batches import ToolBatchSummary


def summarize_tool_batch(tool_names: list[str]) -> ToolBatchSummary:
    names = set(tool_names)
    if names <= {"read_file", "ls"}:
        return ToolBatchSummary("Inspected project files", "read")
    if names <= {"task"}:
        return ToolBatchSummary("Delegated and tracked subtasks", "subtask")
    if names <= {"tool_search", "web_search", "web_fetch"}:
        return ToolBatchSummary("Searched runtime surfaces", "search")
    if "bash" in names:
        return ToolBatchSummary("Ran workspace commands", "shell")
    return ToolBatchSummary("Completed tool batch", "generic")
