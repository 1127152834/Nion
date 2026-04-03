from pathlib import Path

from nion.memory_os.import_legacy import import_legacy_memory_payload
from nion.memory_os.repository import MemoryOSRepository


def test_import_legacy_memory_payload_creates_memory_records(tmp_path: Path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    payload = {
        "version": "1.0",
        "lastUpdated": "2026-04-04T00:00:00Z",
        "user": {
            "workContext": {"summary": "负责财务汇报", "updatedAt": "2026-04-04T00:00:00Z"},
            "personalContext": {"summary": "偏好中文", "updatedAt": "2026-04-04T00:00:00Z"},
            "topOfMind": {"summary": "正在推进月度复盘", "updatedAt": "2026-04-04T00:00:00Z"},
        },
        "history": {
            "recentMonths": {"summary": "近期频繁处理财务总结", "updatedAt": "2026-04-04T00:00:00Z"},
            "earlierContext": {"summary": "", "updatedAt": ""},
            "longTermBackground": {"summary": "", "updatedAt": ""},
        },
        "facts": [
            {
                "id": "fact_1",
                "content": "用户偏好直接表达",
                "category": "preference",
                "confidence": 0.9,
                "createdAt": "2026-04-04T00:00:00Z",
                "source": "manual",
            }
        ],
    }

    imported = import_legacy_memory_payload(repo, payload)

    assert imported["records_created"] >= 2
