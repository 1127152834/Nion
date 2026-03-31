from nion.rebuild.service import RebuildService


def test_rebuild_service_restores_memory_runtime(tmp_path):
    service = RebuildService(base_dir=tmp_path)

    result = service.rebuild()

    assert "status" in result
    assert "restored_count" in result
