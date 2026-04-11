from __future__ import annotations

from langchain.tools import tool

from nion.memory.soul.console_service import patch_soul_setting_value
from nion.memory_os.clock import utcnow_z
from nion.memory_os.compat import get_memory_os_repository
from nion.memory_os.soul_artifacts import MemoryOSSoulArtifactStore


@tool("initialize_soul_profile", parse_docstring=True)
def initialize_soul_profile(
    personality_summary: str,
    values: list[str] | None = None,
    style_preferences: list[str] | None = None,
) -> str:
    """Initialize or refresh the assistant's core soul profile from explicit user guidance.

    Use this tool when the user is clearly expressing how they want the assistant's
    personality, tone, values, or long-term answer style to be configured.

    Args:
        personality_summary: One concise summary of the desired assistant personality.
        values: Optional list of stable values the assistant should hold.
        style_preferences: Optional list of answer-style or interaction preferences.
    """
    summary = personality_summary.strip()
    if not summary:
        raise ValueError("personality_summary")

    repo = get_memory_os_repository()
    store = MemoryOSSoulArtifactStore(repository=repo, base_dir=repo._db_path.parent.parent)
    created_at = utcnow_z()

    body_lines = [
        "# Core Soul",
        "",
        "## Identity",
        summary,
    ]
    if values:
        body_lines.extend(["", "## Values", *[f"- {item.strip()}" for item in values if item.strip()]])
    if style_preferences:
        body_lines.extend(
            ["", "## Style Preferences", *[f"- {item.strip()}" for item in style_preferences if item.strip()]]
        )

    artifact = store.write_core_soul(
        body="\n".join(body_lines) + "\n",
        created_at=created_at,
    )
    record = dict(artifact["memory_record"])
    record["provenance"] = {
        **dict(record.get("provenance", {})),
        "initialized": True,
        "source_type": "user_soul_onboarding",
        "generated_by": "initialize_soul_profile",
    }
    repo.save_memory_record(record)
    patch_soul_setting_value(repo, field="core_identity", value=summary, created_at=created_at)
    if style_preferences:
        patch_soul_setting_value(
            repo,
            field="speech_style",
            value="；".join(item.strip() for item in style_preferences if item.strip()),
            created_at=created_at,
        )
    if values:
        patch_soul_setting_value(
            repo,
            field="values_and_boundaries",
            value="；".join(item.strip() for item in values if item.strip()),
            created_at=created_at,
        )
    return (
        "Soul profile initialized: "
        + summary
    )
