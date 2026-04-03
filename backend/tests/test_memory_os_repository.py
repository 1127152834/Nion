from pathlib import Path

from nion.memory_os.repository import MemoryOSRepository


def test_repository_bootstraps_metadata_database(tmp_path: Path):
    db_path = tmp_path / "memory-os" / "index.sqlite3"
    repo = MemoryOSRepository(db_path)

    status = repo.healthcheck()

    assert db_path.exists()
    assert status["ok"] is True
    assert "memory_records" in status["tables"]
