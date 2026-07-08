"""Unit tests for security module — JWT, API keys, password hashing."""
import pytest
from datetime import timedelta
from unittest.mock import patch

from deploypilot.modules.security.service import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_api_key,
    hash_api_key,
)


class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        pw = "MySecurePassword123!"
        assert hash_password(pw) != pw

    def test_verify_correct_password(self):
        pw = "MySecurePassword123!"
        hashed = hash_password(pw)
        assert verify_password(pw, hashed) is True

    def test_verify_wrong_password(self):
        hashed = hash_password("correct_password")
        assert verify_password("wrong_password", hashed) is False

    def test_different_hashes_for_same_password(self):
        pw = "SamePassword"
        assert hash_password(pw) != hash_password(pw)


class TestJWT:
    def test_access_token_decode(self):
        payload = {"sub": "user-uuid-123", "org_id": "org-uuid-456"}
        token = create_access_token(payload)
        decoded = decode_token(token)
        assert decoded["sub"] == "user-uuid-123"
        assert decoded["type"] == "access"

    def test_refresh_token_type(self):
        token = create_refresh_token({"sub": "user-uuid-123"})
        decoded = decode_token(token)
        assert decoded["type"] == "refresh"

    def test_expired_token_raises(self):
        token = create_access_token({"sub": "u"}, expires_delta=timedelta(seconds=-1))
        with pytest.raises(Exception):
            decode_token(token)

    def test_tampered_token_raises(self):
        token = create_access_token({"sub": "u"})
        tampered = token[:-5] + "XXXXX"
        with pytest.raises(Exception):
            decode_token(tampered)


class TestApiKey:
    def test_key_has_dp_prefix(self):
        raw, _ = generate_api_key()
        assert raw.startswith("dp_")

    def test_hash_is_deterministic(self):
        _, hashed = generate_api_key()
        raw, _ = generate_api_key()
        assert hash_api_key(raw) == hash_api_key(raw)

    def test_raw_and_hash_differ(self):
        raw, hashed = generate_api_key()
        assert raw != hashed

    def test_key_length(self):
        raw, _ = generate_api_key()
        assert len(raw) > 20
