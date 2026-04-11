from __future__ import annotations

import httpx

from nion.memory.embedding.remote_managed import RemoteManagedEmbeddingProviderMetadata


class RemoteManagedEmbeddingProvider:
    def __init__(
        self,
        *,
        provider_id: str,
        endpoint: str,
        api_key: str,
        model_name: str,
        dimensions: int,
    ) -> None:
        self.provider_id = provider_id
        self._endpoint = endpoint
        self._api_key = api_key
        self._model_name = model_name
        self._dimensions = dimensions

    def metadata(self) -> RemoteManagedEmbeddingProviderMetadata:
        return RemoteManagedEmbeddingProviderMetadata(
            provider_id=self.provider_id,
            model_name=self._model_name,
            endpoint=self._endpoint,
            dimensions=self._dimensions,
            revision="2026-04-11",
            metadata={"transport": "httpx"},
        )

    def embed(self, texts: list[str]) -> list[list[float]]:
        response = httpx.post(
            self._endpoint,
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": self._model_name,
                "input": texts,
            },
            timeout=30.0,
        )
        response.raise_for_status()
        payload = response.json()
        rows = payload.get("data", [])
        return [
            [float(value) for value in item.get("embedding", [])]
            for item in rows
        ]
