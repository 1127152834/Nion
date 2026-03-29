from nion.config.paths import Paths


def test_openviking_paths_are_local_and_separate_from_notebook(tmp_path):
    paths = Paths(tmp_path)

    assert paths.openviking_dir == tmp_path / "openviking"
    assert paths.openviking_resources_db_file == tmp_path / "openviking" / "resources.sqlite3"
    assert paths.openviking_chunks_db_file == tmp_path / "openviking" / "chunks.sqlite3"
    assert paths.openviking_ingest_state_db_file == tmp_path / "openviking" / "ingest-state.sqlite3"
