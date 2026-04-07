from pathlib import Path

from nion.config.paths import Paths


def test_memory_os_paths_are_resolved_under_base_dir(tmp_path: Path):
    paths = Paths(base_dir=tmp_path)

    assert paths.memory_os_dir == tmp_path / "memory-os"
    assert paths.memory_os_index_db_file == tmp_path / "memory-os" / "index.sqlite3"
    assert paths.memory_os_access_log_db_file == tmp_path / "memory-os" / "access_logs.sqlite3"
    assert paths.memory_os_artifacts_dir == tmp_path / "memory-os" / "artifacts"
