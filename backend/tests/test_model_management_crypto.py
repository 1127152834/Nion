from __future__ import annotations

from nion.config.paths import reset_paths
from nion.model_management.crypto import (
    LOCAL_MODEL_MANAGEMENT_SECRET_FILE,
    build_model_management_secret,
    decrypt_provider_secret,
    encrypt_provider_secret,
    get_model_management_secret,
    mask_provider_secret,
)


def test_encrypt_and_decrypt_provider_api_key_round_trip():
    secret = build_model_management_secret("test-secret")

    encrypted = encrypt_provider_secret("sk-test-123", secret)

    assert encrypted != "sk-test-123"
    assert decrypt_provider_secret(encrypted, secret) == "sk-test-123"


def test_mask_provider_secret_only_keeps_last_four_characters():
    assert mask_provider_secret("sk-test-123456") == "sk-te******456"
    assert mask_provider_secret("abcd") == "****"


def test_get_model_management_secret_falls_back_to_local_secret_file(
    monkeypatch,
    tmp_path,
):
    monkeypatch.delenv("NION_MODEL_MANAGEMENT_SECRET", raising=False)
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    try:
        first = get_model_management_secret()
        second = get_model_management_secret()
        secret_file = tmp_path / LOCAL_MODEL_MANAGEMENT_SECRET_FILE

        assert secret_file.exists()
        assert secret_file.read_text(encoding="utf-8").strip() != ""
        assert first == second
    finally:
        reset_paths()
