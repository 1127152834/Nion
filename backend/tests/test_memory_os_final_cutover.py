from unittest.mock import patch

from nion.agents.lead_agent.agent import _build_middlewares
from nion.memory_os.compat import finalize_legacy_cutover
from nion.memory_os.repository import MemoryOSRepository
from nion.memory_os.soul_runtime import compile_soul_runtime
from nion.tools.builtins.control_plane_tools import get_capability_catalog_tool


def test_lead_agent_middlewares_do_not_include_legacy_memory_middleware():
    with patch("nion.agents.lead_agent.agent.get_app_config"), patch(
        "nion.agents.lead_agent.agent.get_model_registry_service"
    ) as mock_registry:
        mock_registry.return_value.get_default_model.side_effect = ValueError("no model")
        middlewares = _build_middlewares({"configurable": {}}, model_name="test-model")

    middleware_names = [type(middleware).__name__ for middleware in middlewares]
    assert "MemoryMiddleware" not in middleware_names


def test_capability_catalog_reports_memory_os_descriptor(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    payload = get_capability_catalog_tool.invoke({})

    assert "memory-os/index.sqlite3" in payload
    assert "FileMemoryStorage" not in payload


def test_finalize_legacy_cutover_seeds_default_core_soul_when_missing(
    monkeypatch,
    tmp_path,
):
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    result = finalize_legacy_cutover()
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    runtime = compile_soul_runtime(repo)

    assert result["soul_records_imported"] == 1
    assert "soul_runtime" in runtime
    assert "长期陪伴" in runtime


def test_finalize_legacy_cutover_reactivates_core_soul_when_historically_invalidated(
    monkeypatch,
    tmp_path,
):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "soul_core_main",
            "domain": "soul",
            "subtype": "core",
            "owner_type": "system",
            "scope": "agent",
            "memory_type": "semantic",
            "subject_id": "agent:main",
            "status": "invalidated",
            "summary": "长期陪伴、克制稳定、结论先行、以用户长期价值为先。",
            "confidence": 1.0,
            "created_at": "2026-04-07T00:00:00Z",
            "updated_at": "2026-04-07T00:00:00Z",
            "artifact_uri": "nion://memory-os/artifacts/soul/core/core_soul.md",
            "provenance": {"source_type": "test"},
        }
    )

    finalize_legacy_cutover(repo)
    record = next(
        row for row in repo.list_memory_records(domain="soul")
        if row["memory_id"] == "soul_core_main"
    )

    assert record["status"] == "active"
