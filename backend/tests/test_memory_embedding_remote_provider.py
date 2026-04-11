from __future__ import annotations

from nion.memory.embedding.remote_provider import RemoteManagedEmbeddingProvider


class _HTTPXMockResponse:
    def __init__(self, payload: dict[str, object]) -> None:
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict[str, object]:
        return self._payload


def test_remote_provider_calls_endpoint_and_returns_vectors(monkeypatch) -> None:
    def fake_post(url, *, headers, json, timeout):
        assert url == "https://api.example.com/v1/embeddings"
        assert headers["Authorization"] == "Bearer secret"
        assert json["model"] == "text-embedding-3-large"
        assert json["input"] == ["foo", "bar"]
        assert timeout == 30.0
        return _HTTPXMockResponse(
            {"data": [{"embedding": [0.1, 0.2]}, {"embedding": [0.3, 0.4]}]}
        )

    monkeypatch.setattr("nion.memory.embedding.remote_provider.httpx.post", fake_post)
    provider = RemoteManagedEmbeddingProvider(
        provider_id="remote-default",
        endpoint="https://api.example.com/v1/embeddings",
        api_key="secret",
        model_name="text-embedding-3-large",
        dimensions=2,
    )

    vectors = provider.embed(["foo", "bar"])

    assert vectors == [[0.1, 0.2], [0.3, 0.4]]

