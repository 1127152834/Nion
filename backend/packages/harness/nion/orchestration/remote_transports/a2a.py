from __future__ import annotations

import asyncio
import json
import uuid
from collections.abc import AsyncIterator, Callable
from dataclasses import asdict, dataclass
from typing import Any, Literal
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

import httpx

from nion.config.a2a_config import A2AAgentConfig
from nion.config.paths import get_paths
from nion.memory_os.clock import utcnow_z


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


@dataclass(slots=True, frozen=True)
class A2ASessionRecord:
    context_id: str
    task_id: str
    updated_at: str


class A2ASessionStore:
    def load(self, thread_id: str | None, agent_name: str) -> dict[str, str] | None:
        if thread_id is None:
            return None
        path = get_paths().a2a_session_file(thread_id, agent_name)
        if not path.exists():
            return None
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return None
        context_id = payload.get("context_id")
        task_id = payload.get("task_id")
        if not isinstance(context_id, str) or not isinstance(task_id, str):
            return None
        return {"context_id": context_id, "task_id": task_id}

    def save(self, thread_id: str | None, agent_name: str, session: dict[str, str]) -> None:
        if thread_id is None:
            return
        path = get_paths().a2a_session_file(thread_id, agent_name)
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = A2ASessionRecord(
            context_id=session["context_id"],
            task_id=session["task_id"],
            updated_at=utcnow_z(),
        )
        path.write_text(json.dumps(asdict(payload), indent=2), encoding="utf-8")


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


def _normalize_transport(value: str | None) -> Literal["jsonrpc", "http+json"]:
    normalized = (value or "").strip().lower()
    if normalized in {"http+json", "httpjson", "http_json"}:
        return "http+json"
    return "jsonrpc"


def _dedupe_preserving_order(items: list[str]) -> list[str]:
    seen: set[str] = set()
    deduped: list[str] = []
    for item in items:
        if item in seen:
            continue
        seen.add(item)
        deduped.append(item)
    return deduped


def _collect_text_parts(node: Any) -> list[str]:
    parts: list[str] = []
    if isinstance(node, dict):
        kind = node.get("kind") or node.get("type")
        text = node.get("text")
        if kind == "text" and isinstance(text, str) and text.strip():
            parts.append(text.strip())
        for value in node.values():
            parts.extend(_collect_text_parts(value))
    elif isinstance(node, list):
        for item in node:
            parts.extend(_collect_text_parts(item))
    return parts


def _extract_text(node: Any) -> str:
    parts = _dedupe_preserving_order(_collect_text_parts(node))
    return "\n".join(parts)


def _find_first_string(node: Any, key: str) -> str | None:
    if isinstance(node, dict):
        value = node.get(key)
        if isinstance(value, str) and value:
            return value
        for nested in node.values():
            found = _find_first_string(nested, key)
            if found:
                return found
    elif isinstance(node, list):
        for item in node:
            found = _find_first_string(item, key)
            if found:
                return found
    return None


def _extract_session(node: Any) -> dict[str, str] | None:
    context_id = _find_first_string(node, "contextId")
    task_id = _find_first_string(node, "taskId")
    if task_id is None and isinstance(node, dict):
        task_candidate = node.get("id")
        if isinstance(task_candidate, str) and (
            "status" in node or "artifacts" in node or "history" in node
        ):
            task_id = task_candidate
    if not context_id or not task_id:
        return None
    return {"context_id": context_id, "task_id": task_id}


def _extract_result(payload: dict[str, Any]) -> dict[str, Any]:
    if isinstance(payload.get("result"), dict):
        return payload["result"]
    return payload


def _extract_state(payload: dict[str, Any]) -> str | None:
    state = _find_first_string(payload, "state")
    return state.lower() if state else None


def _is_terminal_state(state: str | None) -> bool:
    return state in {
        "completed",
        "failed",
        "canceled",
        "cancelled",
        "input-required",
        "input_required",
        "auth-required",
        "auth_required",
    }


def _extract_error(payload: dict[str, Any]) -> str | None:
    error = payload.get("error")
    if not isinstance(error, dict):
        return None
    message = error.get("message")
    code = error.get("code")
    details = message if isinstance(message, str) else str(error)
    if isinstance(code, int):
        return f"A2A error {code}: {details}"
    return f"A2A error: {details}"


def _build_message_payload(prompt: str, session: dict[str, str] | None) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "messageId": f"msg-{uuid.uuid4().hex}",
        "role": "user",
        "parts": [{"kind": "text", "text": prompt}],
    }
    if session:
        payload["contextId"] = session["context_id"]
        payload["taskId"] = session["task_id"]
    return payload


def _build_jsonrpc_payload(method: str, *, prompt: str, session: dict[str, str] | None) -> dict[str, Any]:
    return {
        "jsonrpc": "2.0",
        "id": f"rpc-{uuid.uuid4().hex}",
        "method": method,
        "params": {"message": _build_message_payload(prompt, session)},
    }


def _build_http_json_payload(prompt: str, *, session: dict[str, str] | None) -> dict[str, Any]:
    return {"message": _build_message_payload(prompt, session)}


class A2ATransport(A2ADiscoveryTransport):
    kind = "a2a"

    def __init__(
        self,
        *,
        agent_name: str,
        agent_config: A2AAgentConfig,
        agent_card_fetcher: Callable[[str], dict[str, Any]] | None = None,
        client_factory: Callable[..., Any] | None = None,
        session_store: A2ASessionStore | Any | None = None,
    ) -> None:
        super().__init__(
            base_url=agent_config.base_url,
            agent_card_fetcher=agent_card_fetcher,
        )
        self.agent_name = agent_name
        self.agent_config = agent_config
        self._client_factory = client_factory or httpx.AsyncClient
        self._session_store = session_store or A2ASessionStore()

    @classmethod
    def from_config(
        cls,
        *,
        agent_name: str,
        agent_config: A2AAgentConfig,
    ) -> "A2ATransport":
        return cls(agent_name=agent_name, agent_config=agent_config)

    async def run(self, prompt: str, *, thread_id: str | None = None) -> str:
        if not prompt.strip():
            return "A2A prompt cannot be empty."

        try:
            card = await asyncio.to_thread(self.fetch_agent_card)
            headers = {"content-type": "application/json", **self.agent_config.headers}
            timeout = self.agent_config.timeout_seconds
            async with self._client_factory(timeout=timeout, headers=headers) as client:
                session = self._session_store.load(thread_id, self.agent_name)
                if self.agent_config.streaming:
                    text, updated_session = await self._run_stream(
                        client,
                        card=card,
                        prompt=prompt,
                        session=session,
                    )
                else:
                    text, updated_session = await self._run_send(
                        client,
                        card=card,
                        prompt=prompt,
                        session=session,
                    )
            if updated_session is not None:
                self._session_store.save(thread_id, self.agent_name, updated_session)
            return text or "(no response)"
        except Exception as exc:
            return f"Error invoking A2A agent '{self.agent_name}': {exc}"

    def _resolve_transport_kind(self, card: A2AAgentCard) -> Literal["jsonrpc", "http+json"]:
        if self.agent_config.transport != "auto":
            return _normalize_transport(self.agent_config.transport)
        preferred = card.payload.get("preferredTransport")
        if isinstance(preferred, str):
            return _normalize_transport(preferred)
        return "jsonrpc"

    def _resolve_rpc_url(self, card: A2AAgentCard) -> str:
        url = card.payload.get("url")
        if isinstance(url, str) and url.strip():
            return url.strip()
        return self.base_url.rstrip("/")

    async def _run_send(
        self,
        client,
        *,
        card: A2AAgentCard,
        prompt: str,
        session: dict[str, str] | None,
    ) -> tuple[str, dict[str, str] | None]:
        transport = self._resolve_transport_kind(card)
        rpc_url = self._resolve_rpc_url(card)
        if transport == "jsonrpc":
            body = _build_jsonrpc_payload("message/send", prompt=prompt, session=session)
            response = await client.post(rpc_url, json=body)
        else:
            body = _build_http_json_payload(prompt, session=session)
            response = await client.post(f"{rpc_url.rstrip('/')}/message:send", json=body)
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict):
            raise RuntimeError("A2A send response must be a JSON object")
        error = _extract_error(payload)
        if error:
            raise RuntimeError(error)
        result = _extract_result(payload)
        text = _extract_text(result)
        updated_session = _extract_session(result) or session
        state = _extract_state(result)
        if updated_session and state and not _is_terminal_state(state):
            result, text, updated_session = await self._poll_task(
                client,
                transport=transport,
                rpc_url=rpc_url,
                task_id=updated_session["task_id"],
                current_session=updated_session,
            )
        return text, updated_session

    async def _run_stream(
        self,
        client,
        *,
        card: A2AAgentCard,
        prompt: str,
        session: dict[str, str] | None,
    ) -> tuple[str, dict[str, str] | None]:
        transport = self._resolve_transport_kind(card)
        rpc_url = self._resolve_rpc_url(card)
        if transport == "jsonrpc":
            body = _build_jsonrpc_payload("message/stream", prompt=prompt, session=session)
            stream_ctx = client.stream("POST", rpc_url, json=body)
        else:
            body = _build_http_json_payload(prompt, session=session)
            stream_ctx = client.stream("POST", f"{rpc_url.rstrip('/')}/message:stream", json=body)

        async with stream_ctx as response:
            response.raise_for_status()
            content_type = response.headers.get("content-type", "")
            if "text/event-stream" not in content_type:
                payload = response.json()
                if not isinstance(payload, dict):
                    raise RuntimeError("A2A stream response must be a JSON object")
                error = _extract_error(payload)
                if error:
                    raise RuntimeError(error)
                result = _extract_result(payload)
                return _extract_text(result), _extract_session(result) or session

            terminal_text = ""
            latest_text = ""
            updated_session = session
            async for payload in self._iter_sse_payloads(response.aiter_lines()):
                error = _extract_error(payload)
                if error:
                    raise RuntimeError(error)
                result = _extract_result(payload)
                candidate = _extract_text(result)
                if candidate:
                    latest_text = candidate
                state = _extract_state(result)
                if _is_terminal_state(state) and candidate:
                    terminal_text = candidate
                updated_session = _extract_session(result) or updated_session
            return terminal_text or latest_text, updated_session

    async def _poll_task(
        self,
        client,
        *,
        transport: Literal["jsonrpc", "http+json"],
        rpc_url: str,
        task_id: str,
        current_session: dict[str, str],
    ) -> tuple[dict[str, Any], str, dict[str, str]]:
        latest_result: dict[str, Any] = {}
        latest_text = ""
        updated_session = current_session
        for _ in range(self.agent_config.max_poll_attempts):
            if self.agent_config.poll_interval_seconds:
                await asyncio.sleep(self.agent_config.poll_interval_seconds)
            if transport == "jsonrpc":
                response = await client.post(
                    rpc_url,
                    json={
                        "jsonrpc": "2.0",
                        "id": f"rpc-{uuid.uuid4().hex}",
                        "method": "tasks/get",
                        "params": {
                            "taskId": task_id,
                            "contextId": current_session.get("context_id"),
                        },
                    },
                )
            else:
                response = await client.post(
                    f"{rpc_url.rstrip('/')}/tasks:get",
                    json={
                        "taskId": task_id,
                        "contextId": current_session.get("context_id"),
                    },
                )
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict):
                raise RuntimeError("A2A task polling response must be a JSON object")
            error = _extract_error(payload)
            if error:
                raise RuntimeError(error)
            latest_result = _extract_result(payload)
            latest_text = _extract_text(latest_result)
            updated_session = _extract_session(latest_result) or updated_session
            state = _extract_state(latest_result)
            if _is_terminal_state(state):
                return latest_result, latest_text, updated_session
        raise RuntimeError(f"A2A task '{task_id}' did not reach a terminal state before timeout")

    async def _iter_sse_payloads(
        self,
        lines: AsyncIterator[str],
    ) -> AsyncIterator[dict[str, Any]]:
        data_lines: list[str] = []
        async for line in lines:
            if line == "":
                if not data_lines:
                    continue
                payload = "\n".join(data_lines)
                data_lines.clear()
                if payload == "[DONE]":
                    break
                decoded = json.loads(payload)
                if not isinstance(decoded, dict):
                    raise RuntimeError("A2A stream event must decode to a JSON object")
                yield decoded
                continue
            if line.startswith("data:"):
                data_lines.append(line[5:].lstrip())
        if data_lines:
            payload = "\n".join(data_lines)
            if payload != "[DONE]":
                decoded = json.loads(payload)
                if not isinstance(decoded, dict):
                    raise RuntimeError("A2A stream event must decode to a JSON object")
                yield decoded
