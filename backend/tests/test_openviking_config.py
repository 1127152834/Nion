from nion.config.openviking_config import OpenVikingConfig


def test_openviking_config_defaults() -> None:
    config = OpenVikingConfig()

    assert config.enabled is False
    assert config.mode == "http"
    assert config.endpoint == "http://localhost:1933"
    assert config.recall_enabled is True
