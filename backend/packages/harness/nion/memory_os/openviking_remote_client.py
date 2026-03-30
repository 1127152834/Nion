from __future__ import annotations


class OpenVikingRemoteClient:
    def __init__(self, *, base_url: str, api_key: str | None = None):
        self.base_url = base_url
        self.api_key = api_key

    def get_memory(self):
        return {"version": "1.0", "facts": []}

    def status(self):
        return {"ok": True, "base_url": self.base_url}
