from nion.memory_os.openviking_models import OpenVikingProviderConfig
from nion.memory_os.openviking_provider import OpenVikingMemoryProvider


def test_openviking_provider_config_accepts_embedded_mode():
    config = OpenVikingProviderConfig(mode="embedded")

    assert config.mode == "embedded"
    assert config.base_url is None


def test_openviking_provider_config_requires_base_url_for_remote_mode():
    config = OpenVikingProviderConfig(
        mode="remote",
        base_url="https://memory.example.com",
    )

    assert config.mode == "remote"
    assert config.base_url == "https://memory.example.com"


def test_openviking_memory_provider_embedded_mode_reads_memory_payload(tmp_path):
    provider = OpenVikingMemoryProvider(
        base_dir=tmp_path,
        config={"mode": "embedded"},
    )

    payload = provider.get_memory()

    assert payload["version"] == "1.0"
    assert "user" in payload


def test_openviking_memory_provider_embedded_mode_reports_autodream_domain():
    provider = OpenVikingMemoryProvider(config={"mode": "embedded"})

    assert "autodream_journal" in provider.supported_domains()


def test_openviking_memory_provider_remote_mode_uses_base_url(monkeypatch):
    calls = {"base_url": None}

    class FakeRemoteClient:
        def __init__(self, *, base_url, api_key=None):
            calls["base_url"] = base_url

        def get_memory(self):
            return {"version": "1.0", "facts": []}

    monkeypatch.setattr(
        "nion.memory_os.openviking_provider.OpenVikingRemoteClient",
        FakeRemoteClient,
        raising=False,
    )

    provider = OpenVikingMemoryProvider(
        config={"mode": "remote", "base_url": "https://memory.example.com"},
    )
    provider.get_memory()

    assert calls["base_url"] == "https://memory.example.com"
