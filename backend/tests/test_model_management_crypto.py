from __future__ import annotations

from nion.model_management.crypto import (
    build_model_management_secret,
    decrypt_provider_secret,
    encrypt_provider_secret,
    mask_provider_secret,
)


def test_encrypt_and_decrypt_provider_api_key_round_trip():
    secret = build_model_management_secret("test-secret")

    encrypted = encrypt_provider_secret("sk-test-123", secret)

    assert encrypted != "sk-test-123"
    assert decrypt_provider_secret(encrypted, secret) == "sk-test-123"


def test_mask_provider_secret_only_keeps_last_four_characters():
    assert mask_provider_secret("sk-test-123456") == "••••3456"
    assert mask_provider_secret("abcd") == "••••"
