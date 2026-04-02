from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session
from jose import JWTError
from backend.auth import decode_token
from backend.database import engine

bearer_scheme = HTTPBearer()


def get_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]


def get_current_user_id(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
) -> int:
    try:
        payload = decode_token(credentials.credentials)
        user_id = int(payload["sub"])
        return user_id
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def get_current_admin_id(
    user_id: Annotated[int, Depends(get_current_user_id)],
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
) -> int:
    try:
        payload = decode_token(credentials.credentials)
        if not payload.get("is_admin"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
        return user_id
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


CurrentUserDep = Annotated[int, Depends(get_current_user_id)]
AdminDep = Annotated[int, Depends(get_current_admin_id)]


def get_current_user_full(
    user_id: Annotated[int, Depends(get_current_user_id)],
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
) -> tuple[int, bool]:
    try:
        payload = decode_token(credentials.credentials)
        is_admin = bool(payload.get("is_admin", False))
        return user_id, is_admin
    except Exception:
        return user_id, False


CurrentUserFullDep = Annotated[tuple[int, bool], Depends(get_current_user_full)]
