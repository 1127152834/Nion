from __future__ import annotations

from nion.retrieval.models.status_service import build_retrieval_models_status


def test_build_retrieval_models_status_returns_active_profile_and_consumers(
    tmp_path,
) -> None:
    payload = build_retrieval_models_status(base_dir=tmp_path)

    assert payload["active_profile"]["embedding"]["mode"] == "remote_managed"
    assert payload["consumers"][0]["consumer_id"] == "memory"
    assert payload["consumers"][1]["consumer_id"] == "knowledge_base"
