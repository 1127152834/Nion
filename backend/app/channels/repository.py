"""Repository for channel control-plane state."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from secrets import randbelow
from typing import Any, Literal
import sqlite3

from app.channels.db import ChannelDatabase

ChannelPlatform = Literal["lark", "dingtalk", "telegram"]
ChannelMode = Literal["webhook", "stream"]


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


class ChannelRepository:
    def __init__(self, db: ChannelDatabase | None = None):
        self._db = db or ChannelDatabase()

    def get_channel_config(self, platform: ChannelPlatform) -> dict[str, Any]:
        with self._db.connect() as conn:
            row = conn.execute(
                """
                SELECT platform, enabled, mode, credentials_json, default_workspace_id,
                       session_json, created_at, updated_at
                FROM channel_configs
                WHERE platform = ?
                """,
                (platform,),
            ).fetchone()

        if row is None:
            return {
                "platform": platform,
                "enabled": False,
                "mode": "webhook",
                "credentials": {},
                "default_workspace_id": None,
                "session": None,
                "created_at": None,
                "updated_at": None,
            }

        return {
            "platform": row["platform"],
            "enabled": bool(row["enabled"]),
            "mode": row["mode"],
            "credentials": json.loads(row["credentials_json"] or "{}"),
            "default_workspace_id": row["default_workspace_id"],
            "session": json.loads(row["session_json"]) if row["session_json"] else None,
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    def upsert_channel_config(
        self,
        platform: ChannelPlatform,
        *,
        enabled: bool,
        mode: ChannelMode,
        credentials: dict[str, str],
        default_workspace_id: str | None = None,
        session: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        existing = self.get_channel_config(platform)
        created_at = existing["created_at"] or _now_iso()
        updated_at = _now_iso()

        with self._db.connect() as conn:
            conn.execute(
                """
                INSERT INTO channel_configs (
                  platform, enabled, mode, credentials_json, default_workspace_id,
                  session_json, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(platform) DO UPDATE SET
                  enabled = excluded.enabled,
                  mode = excluded.mode,
                  credentials_json = excluded.credentials_json,
                  default_workspace_id = excluded.default_workspace_id,
                  session_json = excluded.session_json,
                  updated_at = excluded.updated_at
                """,
                (
                    platform,
                    1 if enabled else 0,
                    mode,
                    json.dumps(credentials, ensure_ascii=False),
                    default_workspace_id,
                    json.dumps(session, ensure_ascii=False) if session is not None else None,
                    created_at,
                    updated_at,
                ),
            )

        return self.get_channel_config(platform)

    def create_pairing_code(
        self,
        platform: ChannelPlatform,
        *,
        code: str,
        expires_at: str,
    ) -> dict[str, Any]:
        created_at = _now_iso()
        with self._db.connect() as conn:
            cursor = conn.execute(
                """
                INSERT INTO pairing_codes (platform, code, expires_at, consumed_at, created_at)
                VALUES (?, ?, ?, NULL, ?)
                """,
                (platform, code, expires_at, created_at),
            )
            pairing_id = int(cursor.lastrowid)
        return self.get_pairing_code(pairing_id)

    def issue_pairing_code(
        self,
        platform: ChannelPlatform,
        *,
        ttl_minutes: int = 10,
        max_attempts: int = 20,
    ) -> dict[str, Any]:
        expires_at = datetime.now(UTC).replace(microsecond=0)
        expires_at = expires_at.timestamp() + (ttl_minutes * 60)
        expires_at_iso = datetime.fromtimestamp(expires_at, UTC).isoformat()

        last_error: Exception | None = None
        for _ in range(max_attempts):
            code = f"{randbelow(1_000_000):06d}"
            try:
                return self.create_pairing_code(
                    platform,
                    code=code,
                    expires_at=expires_at_iso,
                )
            except sqlite3.IntegrityError as exc:
                last_error = exc
                continue

        if last_error is not None:
            raise RuntimeError("Failed to generate unique pairing code") from last_error
        raise RuntimeError("Failed to generate pairing code")

    def get_pairing_code(self, pairing_id: int) -> dict[str, Any]:
        with self._db.connect() as conn:
            row = conn.execute(
                """
                SELECT id, platform, code, expires_at, consumed_at, created_at
                FROM pairing_codes
                WHERE id = ?
                """,
                (pairing_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Pairing code {pairing_id} not found")
        return dict(row)

    def create_pair_request(
        self,
        platform: ChannelPlatform,
        *,
        code: str,
        external_user_id: str,
        external_user_name: str | None,
        chat_id: str,
        conversation_type: str | None,
        source_event_id: str | None,
    ) -> dict[str, Any]:
        created_at = _now_iso()
        with self._db.connect() as conn:
            cursor = conn.execute(
                """
                INSERT INTO pair_requests (
                  platform, code, external_user_id, external_user_name,
                  chat_id, conversation_type, source_event_id,
                  status, note, created_at, handled_at, handled_by
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?, NULL, NULL)
                """,
                (
                    platform,
                    code,
                    external_user_id,
                    external_user_name,
                    chat_id,
                    conversation_type,
                    source_event_id,
                    created_at,
                ),
            )
            request_id = int(cursor.lastrowid)
        return self.get_pair_request(request_id)

    def get_pair_request(self, request_id: int) -> dict[str, Any]:
        with self._db.connect() as conn:
            row = conn.execute(
                """
                SELECT *
                FROM pair_requests
                WHERE id = ?
                """,
                (request_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Pair request {request_id} not found")
        return dict(row)

    def list_pair_requests(
        self,
        platform: ChannelPlatform,
        *,
        status: str | None = None,
    ) -> list[dict[str, Any]]:
        sql = "SELECT * FROM pair_requests WHERE platform = ?"
        params: list[Any] = [platform]
        if status:
            sql += " AND status = ?"
            params.append(status)
        sql += " ORDER BY created_at DESC"
        with self._db.connect() as conn:
            rows = conn.execute(sql, params).fetchall()
        return [dict(row) for row in rows]

    def decide_pair_request(
        self,
        request_id: int,
        *,
        status: Literal["approved", "rejected"],
        handled_by: str | None = None,
        note: str | None = None,
        workspace_id: str | None = None,
    ) -> dict[str, Any]:
        handled_at = _now_iso()
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT * FROM pair_requests WHERE id = ?",
                (request_id,),
            ).fetchone()
            if row is None:
                raise KeyError(f"Pair request {request_id} not found")

            conn.execute(
                """
                UPDATE pair_requests
                SET status = ?, note = ?, handled_at = ?, handled_by = ?
                WHERE id = ?
                """,
                (status, note, handled_at, handled_by, request_id),
            )

            conn.execute(
                """
                UPDATE pairing_codes
                SET consumed_at = COALESCE(consumed_at, ?)
                WHERE platform = ? AND code = ?
                """,
                (handled_at, row["platform"], row["code"]),
            )

            if status == "approved":
                conn.execute(
                    """
                    INSERT INTO authorized_users (
                      platform, external_user_id, external_user_name, chat_id,
                      conversation_type, workspace_id, session_override_json,
                      granted_at, revoked_at, source_request_id
                    )
                    VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?)
                    """,
                    (
                        row["platform"],
                        row["external_user_id"],
                        row["external_user_name"],
                        row["chat_id"],
                        row["conversation_type"],
                        workspace_id,
                        handled_at,
                        request_id,
                    ),
                )
        return self.get_pair_request(request_id)

    def list_authorized_users(
        self,
        platform: ChannelPlatform,
        *,
        active_only: bool = True,
    ) -> list[dict[str, Any]]:
        sql = "SELECT * FROM authorized_users WHERE platform = ?"
        params: list[Any] = [platform]
        if active_only:
            sql += " AND revoked_at IS NULL"
        sql += " ORDER BY granted_at DESC"
        with self._db.connect() as conn:
            rows = conn.execute(sql, params).fetchall()
        return [
            {
                **dict(row),
                "session_override": json.loads(row["session_override_json"])
                if row["session_override_json"]
                else None,
            }
            for row in rows
        ]

    def revoke_authorized_user(self, user_id: int) -> dict[str, Any]:
        revoked_at = _now_iso()
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT * FROM authorized_users WHERE id = ?",
                (user_id,),
            ).fetchone()
            if row is None:
                raise KeyError(f"Authorized user {user_id} not found")
            conn.execute(
                "UPDATE authorized_users SET revoked_at = ? WHERE id = ?",
                (revoked_at, user_id),
            )
        return self.get_authorized_user(user_id)

    def get_authorized_user(self, user_id: int) -> dict[str, Any]:
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT * FROM authorized_users WHERE id = ?",
                (user_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Authorized user {user_id} not found")
        item = dict(row)
        item["session_override"] = (
            json.loads(row["session_override_json"])
            if row["session_override_json"]
            else None
        )
        return item

    def update_authorized_user_session_override(
        self,
        user_id: int,
        payload: dict[str, Any] | None,
    ) -> dict[str, Any]:
        normalized_payload = payload or None
        with self._db.connect() as conn:
            row = conn.execute(
                "SELECT * FROM authorized_users WHERE id = ?",
                (user_id,),
            ).fetchone()
            if row is None:
                raise KeyError(f"Authorized user {user_id} not found")
            conn.execute(
                "UPDATE authorized_users SET session_override_json = ? WHERE id = ?",
                (
                    json.dumps(normalized_payload, ensure_ascii=False)
                    if normalized_payload is not None
                    else None,
                    user_id,
                ),
            )
        return self.get_authorized_user(user_id)
