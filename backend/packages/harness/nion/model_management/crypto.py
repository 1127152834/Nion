from __future__ import annotations

import base64
import hashlib
import os

from cryptography.fernet import Fernet


def build_model_management_secret(raw_secret: str) -> bytes:
    normalized = raw_secret.strip()
    if not normalized:
        raise ValueError("Model-management secret must not be empty")
    digest = hashlib.sha256(normalized.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def get_model_management_secret() -> bytes:
    raw_secret = os.getenv("NION_MODEL_MANAGEMENT_SECRET", "").strip()
    if not raw_secret:
        raise RuntimeError("NION_MODEL_MANAGEMENT_SECRET is required")
    return build_model_management_secret(raw_secret)


def encrypt_provider_secret(value: str, secret: bytes) -> str:
    return Fernet(secret).encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_provider_secret(value: str, secret: bytes) -> str:
    return Fernet(secret).decrypt(value.encode("utf-8")).decode("utf-8")


def mask_provider_secret(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        return ""
    if len(normalized) <= 4:
        return "••••"
    return f"••••{normalized[-4:]}"
