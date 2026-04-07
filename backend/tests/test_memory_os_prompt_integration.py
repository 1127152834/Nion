from pathlib import Path
from unittest.mock import patch

from nion.agents.lead_agent.prompt import _get_memory_context
from nion.memory_os.repository import MemoryOSRepository


def test_get_memory_context_prefers_memory_os_pack(tmp_path: Path, monkeypatch):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "mem_01",
            "domain": "user_model",
            "subtype": "communication_preference",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "用户偏好直接表达。",
            "confidence": 0.9,
            "created_at": "2026-04-04T00:00:00Z",
            "updated_at": "2026-04-04T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )

    monkeypatch.setenv("NION_HOME", str(tmp_path))
    result = _get_memory_context()

    assert "memory_os_context" in result
    assert "用户偏好直接表达" in result


def test_get_memory_context_does_not_fall_back_to_legacy_memory_in_final_cutover(
    tmp_path: Path,
    monkeypatch,
):
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    with (
        patch("nion.agents.memory.updater.get_memory_data") as mock_get_memory_data,
        patch("nion.agents.memory.format_memory_for_injection") as mock_format,
    ):
        result = _get_memory_context()

    assert result == ""
    mock_get_memory_data.assert_not_called()
    mock_format.assert_not_called()
