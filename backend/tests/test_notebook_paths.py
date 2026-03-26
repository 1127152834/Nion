from pathlib import Path

from nion.config.paths import Paths


def test_notebook_paths_default_to_nion_data_root(monkeypatch, tmp_path):
    monkeypatch.delenv("NION_HOME", raising=False)
    monkeypatch.setattr(Path, "home", classmethod(lambda cls: tmp_path))

    paths = Paths()

    assert paths.notebook_root_dir == tmp_path / ".nion-data" / "notebook"
    assert paths.notebook_meta_dir == paths.notebook_root_dir / ".nion"
    assert paths.notebook_history_dir == paths.notebook_meta_dir / "history"
    assert paths.notebook_trash_dir == paths.notebook_meta_dir / "trash"
    assert paths.notebook_index_dir == paths.notebook_meta_dir / "index"


def test_ensure_notebook_dirs_creates_required_directories(tmp_path):
    paths = Paths(base_dir=tmp_path)

    paths.ensure_notebook_dirs()

    assert paths.notebook_root_dir.is_dir()
    assert paths.notebook_meta_dir.is_dir()
    assert paths.notebook_history_dir.is_dir()
    assert paths.notebook_trash_dir.is_dir()
    assert paths.notebook_index_dir.is_dir()
