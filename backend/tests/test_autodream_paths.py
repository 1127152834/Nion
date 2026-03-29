from nion.config.paths import Paths


def test_autodream_paths_live_under_openviking_journal(tmp_path):
    paths = Paths(tmp_path)

    assert paths.autodream_journal_dir == tmp_path / "openviking" / "journal" / "autodream"
    assert paths.autodream_state_file == tmp_path / "openviking" / "autodream-state.json"
