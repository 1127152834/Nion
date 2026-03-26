from __future__ import annotations

import shutil
import stat
import tempfile
import zipfile
from pathlib import Path

from nion.skills.loader import get_skills_root_path
from nion.skills.validation import _validate_skill_frontmatter


class SkillAlreadyExistsError(ValueError):
    """Raised when installing a skill that already exists."""


def _is_unsafe_zip_member(info: zipfile.ZipInfo) -> bool:
    name = info.filename
    if not name:
        return False
    path = Path(name)
    return path.is_absolute() or ".." in path.parts


def _is_symlink_member(info: zipfile.ZipInfo) -> bool:
    mode = info.external_attr >> 16
    return stat.S_ISLNK(mode)


def safe_extract_skill_archive(
    zip_ref: zipfile.ZipFile,
    dest_path: Path,
    max_total_size: int = 512 * 1024 * 1024,
) -> None:
    dest_root = dest_path.resolve()
    total_size = 0

    for info in zip_ref.infolist():
        if _is_unsafe_zip_member(info):
            raise ValueError(f"Archive contains unsafe member path: {info.filename!r}")

        if _is_symlink_member(info):
            continue

        total_size += max(info.file_size, 0)
        if total_size > max_total_size:
            raise ValueError("Skill archive is too large or appears highly compressed.")

        member_path = dest_root / info.filename
        member_path.parent.mkdir(parents=True, exist_ok=True)

        if info.is_dir():
            member_path.mkdir(parents=True, exist_ok=True)
            continue

        with zip_ref.open(info) as src, open(member_path, "wb") as dst:
            shutil.copyfileobj(src, dst)


def _should_ignore_archive_entry(path: Path) -> bool:
    return path.name.startswith(".") or path.name == "__MACOSX"


def resolve_skill_dir_from_archive_root(temp_path: Path) -> Path:
    extracted_items = [
        item for item in temp_path.iterdir() if not _should_ignore_archive_entry(item)
    ]
    if len(extracted_items) == 0:
        raise ValueError("Skill archive is empty")
    if len(extracted_items) == 1 and extracted_items[0].is_dir():
        return extracted_items[0]
    return temp_path


def install_skill_from_archive(
    zip_path: str | Path,
    *,
    skills_root: Path | None = None,
) -> dict[str, str]:
    path = Path(zip_path)
    if not path.exists():
        raise FileNotFoundError(f"Skill file not found: {zip_path}")
    if not path.is_file():
        raise ValueError(f"Path is not a file: {zip_path}")
    if path.suffix != ".skill":
        raise ValueError("File must have .skill extension")
    if not zipfile.is_zipfile(path):
        raise ValueError("File is not a valid ZIP archive")

    resolved_skills_root = skills_root or get_skills_root_path()
    custom_skills_dir = resolved_skills_root / "custom"
    custom_skills_dir.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        with zipfile.ZipFile(path, "r") as zip_ref:
            safe_extract_skill_archive(zip_ref, temp_path)

        skill_dir = resolve_skill_dir_from_archive_root(temp_path)
        is_valid, message, skill_name = _validate_skill_frontmatter(skill_dir)
        if not is_valid:
            raise ValueError(f"Invalid skill: {message}")
        if not skill_name:
            raise ValueError("Could not determine skill name")

        target_dir = custom_skills_dir / skill_name
        if target_dir.exists():
            raise SkillAlreadyExistsError(
                f"Skill '{skill_name}' already exists. Please remove it first or use a different name."
            )

        shutil.copytree(skill_dir, target_dir)

    return {
        "skill_name": skill_name,
        "message": f"Skill '{skill_name}' installed successfully",
    }
