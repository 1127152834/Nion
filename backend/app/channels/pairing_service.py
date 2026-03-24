from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

from app.channels.pairing_repository import PairingRepository


@dataclass(slots=True)
class PairRequest:
    request_id: str
    channel_name: str
    chat_id: str
    user_id: str
    status: str


class PairingService:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._repo = PairingRepository(base_dir=base_dir)

    def create_request(self, *, channel_name: str, chat_id: str, user_id: str) -> PairRequest:
        request = PairRequest(
            request_id=str(uuid4()),
            channel_name=channel_name,
            chat_id=chat_id,
            user_id=user_id,
            status="pending",
        )
        self._repo.save_request(request)
        return request

    def approve(self, request_id: str) -> None:
        self._repo.approve(request_id)

    def revoke(self, request_id: str) -> None:
        self._repo.revoke(request_id)

    def is_authorized(self, channel_name: str, chat_id: str, user_id: str) -> bool:
        return self._repo.is_authorized(channel_name, chat_id, user_id)

    def get_pending_request_count(self) -> int:
        return self._repo.get_pending_request_count()

    def get_channel_counts(self, channel_name: str) -> dict[str, int]:
        return self._repo.get_channel_counts(channel_name)
