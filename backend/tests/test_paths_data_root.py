from pathlib import Path

from nion.config.paths import Paths


def test_paths_default_base_dir_uses_nion_data(monkeypatch, tmp_path):
    monkeypatch.delenv("NION_HOME", raising=False)
    monkeypatch.setattr(Path, "home", classmethod(lambda cls: tmp_path))

    paths = Paths()

    assert paths.base_dir == tmp_path / ".nion-data"
    assert paths.app_workspace_dir == tmp_path / ".nion-data" / "workspace"


def test_sandbox_work_dir_uses_workdir_with_legacy_workspace_fallback(tmp_path):
    paths = Paths(base_dir=tmp_path)
    thread_id = "thread-123"

    workdir_path = paths.thread_dir(thread_id) / "user-data" / "workdir"
    legacy_path = paths.thread_dir(thread_id) / "user-data" / "workspace"

    assert paths.sandbox_work_dir(thread_id) == workdir_path

    legacy_path.mkdir(parents=True, exist_ok=True)
    assert paths.sandbox_work_dir(thread_id) == legacy_path


def test_openviking_dirs_do_not_create_legacy_maintenance_directories(tmp_path):
    paths = Paths(base_dir=tmp_path)

    paths.ensure_openviking_dirs()

    assert paths.openviking_dir.is_dir()
    assert not (tmp_path / "self-maintenance").exists()
