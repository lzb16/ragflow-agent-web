from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlmodel import select
from backend.deps import SessionDep
from backend.models import User
from backend.auth import hash_password, verify_password, create_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_admin: bool


class LoginResponse(BaseModel):
    token: str
    is_admin: bool


@router.post("/register", response_model=UserResponse)
def register(req: RegisterRequest, session: SessionDep):
    existing = session.exec(
        select(User).where(
            (User.email == req.email) | (User.username == req.username)
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email or username already exists")

    user = User(
        username=req.username,
        email=req.email,
        password_hash=hash_password(req.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return UserResponse(id=user.id, username=user.username, email=user.email, is_admin=user.is_admin)


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, session: SessionDep):
    user = session.exec(select(User).where(User.email == req.email)).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token({"sub": str(user.id), "is_admin": user.is_admin})
    return LoginResponse(token=token, is_admin=user.is_admin)
