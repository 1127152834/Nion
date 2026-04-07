from pathlib import Path

from nion.memory_os.compat import finalize_legacy_cutover
from nion.memory_os.repository import MemoryOSRepository
from nion.tools.builtins.soul_onboarding_tool import initialize_soul_profile


def test_initialize_soul_profile_replaces_default_seed_with_user_initialized_core_soul(
    monkeypatch,
    tmp_path: Path,
):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    finalize_legacy_cutover()

    payload = initialize_soul_profile.func(
        personality_summary="温柔但清晰，先理解再表达，尽量陪伴式沟通。",
        values=["长期陪伴", "真诚", "克制"],
        style_preferences=["少说教", "少压迫感", "结论先行"],
    )

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    record = next(
        row for row in repo.list_memory_records(domain="soul")
        if row["memory_id"] == "soul_core_main"
    )

    assert "温柔但清晰" in payload
    assert record["status"] == "active"
    assert record["provenance"]["initialized"] is True
    assert "温柔但清晰" in record["summary"]
