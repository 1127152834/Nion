from importlib import import_module


def test_nion_cli_module_is_importable() -> None:
    module = import_module("nion.cli.main")
    assert hasattr(module, "main")
