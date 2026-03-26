from __future__ import annotations

import base64
import hashlib
import os
import secrets
from pathlib import Path

from cryptography.fernet import Fernet

from nion.config.paths import get_paths


LOCAL_MODEL_MANAGEMENT_SECRET_FILE = ".model_management_secret"


def build_model_management_secret(raw_secret: str) -> bytes:
    normalized = raw_secret.strip()
    if not normalized:
        raise ValueError("Model-management secret must not be empty")
    digest = hashlib.sha256(normalized.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def _load_or_create_local_model_management_secret(secret_file: Path) -> str:
    secret_file.parent.mkdir(parents=True, exist_ok=True)
    if secret_file.exists():
        existing = secret_file.read_text(encoding="utf-8").strip()
        if existing:
            return existing

    generated = secrets.token_urlsafe(32)
    secret_file.write_text(generated, encoding="utf-8")
    try:
        secret_file.chmod(0o600)
    except OSError:
        pass
    return generated


def get_model_management_secret() -> bytes:
    raw_secret = os.getenv("NION_MODEL_MANAGEMENT_SECRET", "").strip()
    if not raw_secret:
        secret_file = get_paths().base_dir / LOCAL_MODEL_MANAGEMENT_SECRET_FILE
        raw_secret = _load_or_create_local_model_management_secret(secret_file)
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
