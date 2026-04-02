import os
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import jwt

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production-please")
ALGORITHM = "HS256"
DEFAULT_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(data: dict, expires_minutes: int = DEFAULT_EXPIRE_MINUTES) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
