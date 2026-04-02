from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, field_validator
from sqlmodel import select
from backend.deps import SessionDep, CurrentUserDep
from backend.models import User
from backend.auth import hash_password, verify_password, create_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator('password')
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('密码至少 8 位')
        return v


class LoginRequest(BaseModel):
    login: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_admin: bool


class LoginResponse(BaseModel):
    token: str
    is_admin: bool
    user_id: int


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
    user = session.exec(select(User).where(User.email == req.login)).first()
    if not user:
        user = session.exec(select(User).where(User.username == req.login)).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="用户名/邮箱或密码错误")

    token = create_token({"sub": str(user.id), "is_admin": user.is_admin})
    return LoginResponse(token=token, is_admin=user.is_admin, user_id=user.id)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator('new_password')
    @classmethod
    def new_password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('新密码至少 8 位')
        return v


@router.patch("/change-password", status_code=204)
def change_password(req: ChangePasswordRequest, user_id: CurrentUserDep, session: SessionDep):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if not verify_password(req.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="当前密码错误")
    user.password_hash = hash_password(req.new_password)
    session.add(user)
    session.commit()
