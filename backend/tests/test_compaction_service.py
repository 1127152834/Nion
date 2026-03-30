from nion.compaction.service import CompactionService


def test_compaction_service_compacts_memory_payload(tmp_path):
    service = CompactionService(base_dir=tmp_path)

    result = service.compact(ratio=0.8, decay_days=0)

    assert "status" in result
    assert "summary" in result
