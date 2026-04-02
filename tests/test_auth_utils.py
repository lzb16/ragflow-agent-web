from backend.auth import hash_password, verify_password, create_token, decode_token


def test_password_hash_and_verify():
    hashed = hash_password("secret123")
    assert hashed != "secret123"
    assert verify_password("secret123", hashed) is True
    assert verify_password("wrong", hashed) is False


def test_create_and_decode_token():
    payload = {"sub": "42", "is_admin": False}
    token = create_token(payload)
    assert isinstance(token, str)
    decoded = decode_token(token)
    assert decoded["sub"] == "42"
    assert decoded["is_admin"] is False


def test_expired_token_raises():
    import pytest
    from jose import JWTError
    from backend.auth import create_token, decode_token
    token = create_token({"sub": "1"}, expires_minutes=-1)
    with pytest.raises(JWTError):
        decode_token(token)
