from __future__ import annotations

from nion.memory_payloads import create_empty_memory_payload


class OpenVikingRemoteClient:
    def __init__(self, *, base_url: str, api_key: str | None = None):
        self.base_url = base_url
        self.api_key = api_key

    def get_memory(self):
        return create_empty_memory_payload()

    def save_memory(self, payload: dict):
        return True

    def clear_memory(self):
        return create_empty_memory_payload()

    def delete_fact(self, fact_id: str):
        raise KeyError(fact_id)

    def on_after_chat(self, *, thread_id, messages, agent_name=None):
        return None

    def status(self):
        return {"ok": True, "base_url": self.base_url}
