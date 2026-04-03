from pathlib import Path

from nion.memory_os.access_log import MemoryOSAccessLogger
from nion.memory_os.models import AccessLogEntry
from nion.memory_os.repository import MemoryOSRepository


def test_access_logger_persists_log_entries(tmp_path: Path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    logger = MemoryOSAccessLogger(repo)
    entry = AccessLogEntry(
        access_id="acc_01",
        actor_type="runtime",
        actor_id="lead_agent",
        action="context_assembly_read",
        target_kind="memory_record",
        target_id="mem_01",
        created_at="2026-04-04T00:00:00Z",
    )

    logger.record(entry)
    rows = repo.list_access_logs()

    assert len(rows) == 1
    assert rows[0].access_id == "acc_01"
