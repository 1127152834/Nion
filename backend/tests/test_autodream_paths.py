from nion.config.paths import Paths


def test_autodream_paths_alias_canonical_self_maintenance_locations(tmp_path):
    paths = Paths(tmp_path)

    assert paths.self_maintenance_journal_dir == tmp_path / "self-maintenance" / "journal" / "reflective"
    assert paths.self_maintenance_state_file == tmp_path / "self-maintenance" / "state.json"
    assert paths.autodream_journal_dir == paths.self_maintenance_journal_dir
    assert paths.autodream_state_file == paths.self_maintenance_state_file
