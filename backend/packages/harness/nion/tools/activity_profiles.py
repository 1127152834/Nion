from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class ToolActivityProfile:
    activity_label: str
    summary_label: str
    result_class: str
    visibility: str = "full"


_PROFILES = {
    "task": ToolActivityProfile("Running subtask", "Completed subtask", "subtask"),
    "tool_search": ToolActivityProfile("Searching deferred tools", "Matched deferred tools", "search"),
    "read_file": ToolActivityProfile("Reading file", "Read file", "read"),
    "write_file": ToolActivityProfile("Writing file", "Wrote file", "write"),
    "str_replace": ToolActivityProfile("Editing file", "Edited file", "edit"),
    "ls": ToolActivityProfile("Listing files", "Listed files", "read"),
    "bash": ToolActivityProfile("Running command", "Ran command", "shell"),
    "web_search": ToolActivityProfile("Searching web", "Searched web", "search"),
    "web_fetch": ToolActivityProfile("Fetching page", "Fetched page", "fetch"),
    "present_files": ToolActivityProfile("Preparing file preview", "Presented files", "present"),
    "view_image": ToolActivityProfile("Opening image", "Viewed image", "media"),
}


def get_tool_activity_profile(tool_name: str) -> ToolActivityProfile:
    return _PROFILES.get(
        tool_name,
        ToolActivityProfile("Running tool", "Completed tool", "generic"),
    )
