"""
Unit tests for security utilities: password hashing, JWT tokens, API key generation.
"""
import pytest
from jose import JWTError

from deploypilot.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_api_key,
    hash_password,
    verify_api_key,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        hashed = hash_password("MySecret123!")
        assert hashed != "MySecret123!"

    def test_verify_correct_password(self):
        hashed = hash_password("Correct123!")
        assert verify_password("Correct123!", hashed) is True

    def test_reject_wrong_password(self):
        hashed = hash_password("Correct123!")
        assert verify_password("Wrong999!", hashed) is False

    def test_hashes_are_unique_per_call(self):
        h1 = hash_password("same-password")
        h2 = hash_password("same-password")
        assert h1 != h2  # bcrypt uses random salt


class TestJWT:
    def test_access_token_round_trip(self):
        user_id = "550e8400-e29b-41d4-a716-446655440000"
        token = create_access_token(user_id)
        payload = decode_token(token)
        assert payload["sub"] == user_id
        assert payload["typ"] == "access"

    def test_refresh_token_has_correct_type(self):
        token = create_refresh_token("some-user-id")
        payload = decode_token(token)
        assert payload["typ"] == "refresh"

    def test_tampered_token_raises(self):
        token = create_access_token("user-1") + "tampered"
        with pytest.raises(JWTError):
            decode_token(token)

    def test_extra_claims_included(self):
        token = create_access_token("user-1", extra={"role": "admin", "email": "a@b.com"})
        payload = decode_token(token)
        assert payload["role"] == "admin"
        assert payload["email"] == "a@b.com"


class TestApiKeys:
    def test_raw_key_has_prefix(self):
        raw, _ = generate_api_key()
        assert raw.startswith("dp_")

    def test_verify_correct_key(self):
        raw, hashed = generate_api_key()
        assert verify_api_key(raw, hashed) is True

    def test_reject_wrong_key(self):
        raw, hashed = generate_api_key()
        assert verify_api_key("dp_wrong_key", hashed) is False

    def test_two_keys_have_different_hashes(self):
        _, h1 = generate_api_key()
        _, h2 = generate_api_key()
        assert h1 != h2
