from __future__ import annotations

import json
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import urlopen


def build_agent_card_url(base_url: str) -> str:
    return base_url.rstrip("/") + "/.well-known/agent-card.json"


def _default_agent_card_fetcher(url: str) -> dict[str, Any]:
    try:
        with urlopen(url, timeout=10) as response:  # noqa: S310 - A2A discovery explicitly fetches remote agent cards
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:  # pragma: no cover - exercised through wrapped RuntimeError
        raise RuntimeError(f"A2A agent card returned HTTP {exc.code}") from exc
    except URLError as exc:  # pragma: no cover - exercised through wrapped RuntimeError
        raise RuntimeError(f"A2A agent card request failed: {exc.reason}") from exc
    except json.JSONDecodeError as exc:  # pragma: no cover - exercised through wrapped RuntimeError
        raise RuntimeError("A2A agent card did not return valid JSON") from exc

    if not isinstance(payload, dict):
        raise RuntimeError("A2A agent card payload must be a JSON object")
    return payload


@dataclass(slots=True, frozen=True)
class A2AAgentCard:
    url: str
    payload: dict[str, Any]
    name: str | None = None
    version: str | None = None


class A2ADiscoveryTransport:
    kind = "a2a"

    def __init__(
        self,
        *,
        base_url: str,
        agent_card_fetcher: Callable[[str], dict[str, Any]] | None = None,
    ) -> None:
        self.base_url = base_url
        self._agent_card_fetcher = agent_card_fetcher or _default_agent_card_fetcher

    def fetch_agent_card(self) -> A2AAgentCard:
        url = build_agent_card_url(self.base_url)
        try:
            payload = self._agent_card_fetcher(url)
        except Exception as exc:  # pragma: no cover - specific failures normalized above
            raise RuntimeError(f"Failed to fetch A2A agent card from {url}: {exc}") from exc

        return A2AAgentCard(
            url=url,
            payload=payload,
            name=payload.get("name") if isinstance(payload.get("name"), str) else None,
            version=payload.get("version") if isinstance(payload.get("version"), str) else None,
        )

    async def run(self, prompt: str, *, thread_id: str | None = None) -> str:
        del prompt, thread_id
        raise NotImplementedError(
            "A2A transport is discovery-only in this phase; remote execution, session negotiation, and streaming are not implemented."
        )
