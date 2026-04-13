import json

from nion.tools.builtins.control_plane_tools import get_capability_catalog_tool


def test_capability_catalog_reports_knowledge_descriptor(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    payload = json.loads(get_capability_catalog_tool.invoke({}))
    objects = payload["objects"]
    knowledge = next(item for item in objects if item["kind"] == "knowledge")

    assert knowledge["label"] == "Knowledge Base"
    assert knowledge["actions"][0]["id"] == "bridge:notebook-to-knowledge"
