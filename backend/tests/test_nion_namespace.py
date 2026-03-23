from importlib import import_module
from pathlib import Path
import json


def test_nion_client_is_importable():
    module = import_module("nion.client")
    assert hasattr(module, "NionClient")


def test_langgraph_config_points_to_nion_namespace():
    config_path = Path(__file__).resolve().parents[1] / "langgraph.json"
    config = json.loads(config_path.read_text(encoding="utf-8"))
    payload = json.dumps(config)
    assert "nion.agents" in payload
