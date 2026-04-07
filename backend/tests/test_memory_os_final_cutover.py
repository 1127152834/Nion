from unittest.mock import patch

from nion.agents.lead_agent.agent import _build_middlewares
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
