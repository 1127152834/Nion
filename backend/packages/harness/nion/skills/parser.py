import logging
import re
from pathlib import Path

from .types import Skill
from .validation import parse_and_validate_skill_frontmatter_text

logger = logging.getLogger(__name__)


def parse_skill_file(skill_file: Path, category: str, relative_path: Path | None = None) -> Skill | None:
    """
    Parse a SKILL.md file and extract metadata.

    Args:
        skill_file: Path to the SKILL.md file
        category: Category of the skill ('public' or 'custom')

    Returns:
        Skill object if parsing succeeds, None otherwise
    """
    if not skill_file.exists() or skill_file.name != "SKILL.md":
        return None

    try:
        content = skill_file.read_text(encoding="utf-8")

        # Extract YAML front matter
        # Pattern: ---\nkey: value\n---
        front_matter_match = re.match(r"^---\s*\n(.*?)\n---\s*\n", content, re.DOTALL)

        if not front_matter_match:
            return None

        valid, _message, metadata = parse_and_validate_skill_frontmatter_text(content)
        if not valid or metadata is None:
            return None

        # Extract required fields
        name = metadata.get("name")
        description = metadata.get("description")

        if not isinstance(name, str) or not name.strip():
            return None
        if not isinstance(description, str) or not description.strip():
            return None

        license_text = metadata.get("license")
        allowed_tools = metadata.get("allowed-tools")
        skill_metadata = metadata.get("metadata")
        compatibility = metadata.get("compatibility")
        version = metadata.get("version")
        author = metadata.get("author")
        model = metadata.get("model")
        effort = metadata.get("effort")
        user_invocable = metadata.get("user-invocable")
        hooks = metadata.get("hooks")
        context_mode = metadata.get("context")

        normalized_allowed_tools: list[str] | None = None
        if isinstance(allowed_tools, list):
            normalized_allowed_tools = [item.strip() for item in allowed_tools if isinstance(item, str) and item.strip()] or None
        normalized_hooks: list[str] | None = None
        if isinstance(hooks, list):
            normalized_hooks = [item.strip() for item in hooks if isinstance(item, str) and item.strip()] or None

        return Skill(
            name=name.strip(),
            description=description.strip(),
            license=license_text,
            skill_dir=skill_file.parent,
            skill_file=skill_file,
            relative_path=relative_path or Path(skill_file.parent.name),
            category=category,
            enabled=True,  # Default to enabled, actual state comes from config file
            allowed_tools=normalized_allowed_tools,
            metadata=skill_metadata if isinstance(skill_metadata, dict) else None,
            compatibility=compatibility if isinstance(compatibility, dict) else None,
            version=version if isinstance(version, str) else None,
            author=author if isinstance(author, str) else None,
            model=model if isinstance(model, str) else None,
            effort=effort if isinstance(effort, str) else None,
            user_invocable=user_invocable if isinstance(user_invocable, bool) else None,
            hooks=normalized_hooks,
            context_mode=context_mode if isinstance(context_mode, str) else None,
        )

    except Exception as e:
        logger.warning("Error parsing skill file %s: %s", skill_file, e)
        return None
