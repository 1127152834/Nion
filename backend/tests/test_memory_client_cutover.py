from unittest.mock import MagicMock, patch

from nion.client import NionClient


def _client() -> NionClient:
    with patch("nion.client.get_app_config", return_value=MagicMock()):
        return NionClient()


def test_client_get_memory_uses_canonical_memory_surface():
    client = _client()
    with patch("nion.memory_os.compat.build_legacy_memory_view") as legacy_view, patch(
        "nion.memory_os.compat.build_canonical_memory_payload"
    ) as canonical_view:
        canonical_view.return_value = {"version": "2.0", "facts": []}

        result = client.get_memory()

    canonical_view.assert_called_once()
    legacy_view.assert_not_called()
    assert result == {"version": "2.0", "facts": []}


def test_client_reload_memory_uses_canonical_memory_surface():
    client = _client()
    with patch("nion.memory_os.compat.build_legacy_memory_view") as legacy_view, patch(
        "nion.memory_os.compat.build_canonical_memory_payload"
    ) as canonical_view:
        canonical_view.return_value = {"version": "2.0", "facts": [{"id": "fact_1"}]}

        result = client.reload_memory()

    canonical_view.assert_called_once()
    legacy_view.assert_not_called()
    assert result["facts"] == [{"id": "fact_1"}]
