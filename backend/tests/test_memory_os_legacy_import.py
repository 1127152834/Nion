import json

from nion.memory_os.service import MemoryOSService


def _legacy_payload() -> dict:
    return {
        "version": "1.0",
        "lastUpdated": "2026-03-30T00:00:00Z",
        "user": {
            "workContext": {"summary": "Working on Memory OS", "updatedAt": ""},
            "personalContext": {"summary": "", "updatedAt": ""},
            "topOfMind": {"summary": "", "updatedAt": ""},
        },
        "history": {
            "recentMonths": {"summary": "", "updatedAt": ""},
            "earlierContext": {"summary": "", "updatedAt": ""},
            "longTermBackground": {"summary": "", "updatedAt": ""},
        },
        "facts": [
            {
                "id": "fact-1",
                "content": "prefers concise responses",
                "category": "preference",
                "confidence": 0.9,
                "createdAt": "2026-03-30T00:00:00Z",
                "source": "thread-1",
            }
        ],
    }


def test_import_legacy_memory_file_round_trips_into_active_provider(tmp_path):
    legacy_file = tmp_path / "memory.json"
    legacy_file.write_text(json.dumps(_legacy_payload()), encoding="utf-8")

    imported = MemoryOSService().import_legacy_memory_file(base_dir=tmp_path)
    current = MemoryOSService().get_memory_payload(base_dir=tmp_path)

    assert imported is True
    assert current["user"]["workContext"]["summary"] == "Working on Memory OS"
    assert len(current["facts"]) == 1


def test_import_legacy_memory_file_returns_false_when_legacy_file_missing(tmp_path):
    imported = MemoryOSService().import_legacy_memory_file(base_dir=tmp_path)

    assert imported is False
