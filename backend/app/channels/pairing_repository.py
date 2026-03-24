"""Persistence for channel pairing and authorization state."""

from __future__ import annotations

import json
import tempfile
import threading
import time
from dataclasses import asdict
from pathlib import Path
from typing import Any


class PairingRepository:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        if base_dir is None:
            from nion.config.paths import get_paths

            path = Path(get_paths().base_dir) / "channels" / "pairing.json"
        else:
            path = Path(base_dir) / "pairing.json"

        self._path = path
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._data: dict[str, dict[str, Any]] = self._load()

    def _load(self) -> dict[str, dict[str, Any]]:
        if self._path.exists():
            try:
                return json.loads(self._path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                return {"requests": {}}
        return {"requests": {}}

    def _save(self) -> None:
        fd = tempfile.NamedTemporaryFile(
            mode="w",
            dir=self._path.parent,
            suffix=".tmp",
            delete=False,
        )
        try:
            json.dump(self._data, fd, indent=2)
            fd.close()
            Path(fd.name).replace(self._path)
        except BaseException:
            fd.close()
            Path(fd.name).unlink(missing_ok=True)
            raise

    def save_request(self, request: Any) -> None:
        with self._lock:
            now = time.time()
            payload = asdict(request)
            payload.setdefault("created_at", now)
            payload["updated_at"] = now
            self._data.setdefault("requests", {})[request.request_id] = payload
            self._save()

    def approve(self, request_id: str) -> None:
        with self._lock:
            request = self._data.setdefault("requests", {}).get(request_id)
            if request is None:
                raise KeyError(request_id)
            request["status"] = "approved"
            request["updated_at"] = time.time()
            self._save()

    def revoke(self, request_id: str) -> None:
        with self._lock:
            request = self._data.setdefault("requests", {}).get(request_id)
            if request is None:
                raise KeyError(request_id)
            request["status"] = "revoked"
            request["updated_at"] = time.time()
            self._save()

    def is_authorized(self, channel_name: str, chat_id: str, user_id: str) -> bool:
        for request in self._data.get("requests", {}).values():
            if (
                request.get("status") == "approved"
                and request.get("channel_name") == channel_name
                and request.get("chat_id") == chat_id
                and request.get("user_id") == user_id
            ):
                return True
        return False

    def get_pending_request_count(self) -> int:
        return sum(
            1
            for request in self._data.get("requests", {}).values()
            if request.get("status") == "pending"
        )

    def get_channel_counts(self, channel_name: str) -> dict[str, int]:
        approved_subjects = set()
        pending_count = 0
        for request in self._data.get("requests", {}).values():
            if request.get("channel_name") != channel_name:
                continue
            if request.get("status") == "approved":
                approved_subjects.add((request.get("chat_id"), request.get("user_id")))
            elif request.get("status") == "pending":
                pending_count += 1

        return {
            "authorized_user_count": len(approved_subjects),
            "pending_pair_request_count": pending_count,
        }
