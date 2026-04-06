# RAGflow 智能体分享站 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个供用户分享、发现、点赞和评论 RAGflow 智能体链接的社区站点，支持链接自动解析、管理员审核和 JWT 认证。

**Architecture:** FastAPI 后端提供 REST API，SQLite + SQLModel 做持久化，React + TypeScript + Vite 编译为静态文件后由 FastAPI 直接托管，单进程 `uvicorn` 启动。

**Tech Stack:** Python 3.11+, FastAPI, SQLModel, python-jose, passlib[bcrypt], httpx, python-multipart, React 18, TypeScript, Vite, React Router v6, Tailwind CSS

---

## 文件结构总览

```
ragflow-agent-web/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── auth.py
│   ├── deps.py
│   └── routers/
│       ├── auth.py
│       ├── agents.py
│       ├── likes.py
│       ├── comments.py
│       └── admin.py
├── tests/
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_agents.py
│   ├── test_likes.py
│   ├── test_comments.py
│   └── test_admin.py
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api.ts
│   │   ├── types.ts
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── AgentDetail.tsx
│   │   │   ├── Submit.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   └── Admin.tsx
│   │   └── components/
│   │       ├── AgentCard.tsx
│   │       ├── SearchBar.tsx
│   │       ├── LikeButton.tsx
│   │       ├── CommentList.tsx
│   │       ├── CommentForm.tsx
│   │       └── ProtectedRoute.tsx
│   └── dist/          # 编译产物，由 FastAPI 托管
├── uploads/
│   └── avatars/
├── requirements.txt
└── data.db            # 运行时自动创建
```

---

## Task 1: 项目脚手架

**Files:**
- Create: `requirements.txt`
- Create: `backend/__init__.py`
- Create: `tests/__init__.py`
- Create: `uploads/avatars/.gitkeep`

- [ ] **Step 1: 创建目录结构**

```bash
cd E:/ragflow-agent-web
mkdir -p backend/routers tests uploads/avatars
touch backend/__init__.py backend/routers/__init__.py tests/__init__.py uploads/avatars/.gitkeep
```

- [ ] **Step 2: 创建 requirements.txt**

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlmodel==0.0.21
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.12
httpx==0.27.2
aiofiles==23.2.1
pytest==8.3.3
pytest-asyncio==0.24.0
```

- [ ] **Step 3: 安装依赖**

```bash
pip install -r requirements.txt
```

Expected: 所有包安装成功，无报错。

- [ ] **Step 4: 验证安装**

```bash
python -c "import fastapi, sqlmodel, jose, passlib, httpx; print('OK')"
```

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git init
git add requirements.txt backend/ tests/ uploads/
git commit -m "chore: project scaffold"
```

---

## Task 2: 数据库模型

**Files:**
- Create: `backend/models.py`
- Create: `backend/database.py`

- [ ] **Step 1: 写失败测试**

Create `tests/test_models.py`:

```python
from sqlmodel import Session, select
from backend.database import engine, create_db_and_tables
from backend.models import User, Agent, Comment, Like, AgentStatus


def test_create_user():
    create_db_and_tables()
    with Session(engine) as session:
        user = User(username="alice", email="alice@example.com", password_hash="hash")
        session.add(user)
        session.commit()
        session.refresh(user)
        assert user.id is not None
        assert user.is_admin is False


def test_create_agent():
    create_db_and_tables()
    with Session(engine) as session:
        user = User(username="bob", email="bob@example.com", password_hash="hash")
        session.add(user)
        session.commit()

        agent = Agent(name="Test Agent", url="http://example.com/share", submitter_id=user.id)
        session.add(agent)
        session.commit()
        session.refresh(agent)
        assert agent.id is not None
        assert agent.status == AgentStatus.pending
        assert agent.likes_count == 0


def test_like_unique_constraint():
    create_db_and_tables()
    with Session(engine) as session:
        user = User(username="carol", email="carol@example.com", password_hash="hash")
        session.add(user)
        session.commit()

        agent = Agent(name="Agent2", url="http://example.com/s2", submitter_id=user.id)
        session.add(agent)
        session.commit()

        like1 = Like(agent_id=agent.id, user_id=user.id)
        session.add(like1)
        session.commit()

        import pytest
        from sqlalchemy.exc import IntegrityError
        with pytest.raises(IntegrityError):
            like2 = Like(agent_id=agent.id, user_id=user.id)
            session.add(like2)
            session.commit()
```

- [ ] **Step 2: 运行确认失败**

```bash
pytest tests/test_models.py -v
```

Expected: `ImportError: cannot import name 'User' from 'backend.models'`

- [ ] **Step 3: 实现 backend/database.py**

```python
import os
from sqlmodel import SQLModel, create_engine

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
```

- [ ] **Step 4: 实现 backend/models.py**

```python
from datetime import datetime
from enum import Enum
from typing import Optional
from sqlmodel import Field, SQLModel, UniqueConstraint


class AgentStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    is_admin: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Agent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    url: str
    description: Optional[str] = None
    tags: Optional[str] = None
    avatar_path: Optional[str] = None
    usage_guide: Optional[str] = None
    status: AgentStatus = Field(default=AgentStatus.pending)
    submitter_id: int = Field(foreign_key="user.id")
    likes_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Comment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    content: str
    agent_id: int = Field(foreign_key="agent.id")
    user_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Like(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("agent_id", "user_id"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    agent_id: int = Field(foreign_key="agent.id")
    user_id: int = Field(foreign_key="user.id")
```

- [ ] **Step 5: 运行测试确认通过**

```bash
pytest tests/test_models.py -v
```

Expected: `3 passed`

- [ ] **Step 6: 删除测试用 DB 文件**

```bash
rm -f data.db
```

- [ ] **Step 7: Commit**

```bash
git add backend/models.py backend/database.py tests/test_models.py
git commit -m "feat: database models (User, Agent, Comment, Like)"
```

---

## Task 3: JWT 认证工具

**Files:**
- Create: `backend/auth.py`

- [ ] **Step 1: 写失败测试**

Create `tests/test_auth_utils.py`:

```python
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
```

- [ ] **Step 2: 运行确认失败**

```bash
pytest tests/test_auth_utils.py -v
```

Expected: `ImportError: cannot import name 'hash_password' from 'backend.auth'`

- [ ] **Step 3: 实现 backend/auth.py**

```python
import os
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt, JWTError

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production-please")
ALGORITHM = "HS256"
DEFAULT_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(data: dict, expires_minutes: int = DEFAULT_EXPIRE_MINUTES) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=expires_minutes)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pytest tests/test_auth_utils.py -v
```

Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add backend/auth.py tests/test_auth_utils.py
git commit -m "feat: JWT and password hashing utilities"
```

---

## Task 4: 依赖注入 + 测试基础设施

**Files:**
- Create: `backend/deps.py`
- Create: `tests/conftest.py`

- [ ] **Step 1: 创建 tests/conftest.py**

```python
import os
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

# 使用内存数据库测试
TEST_DATABASE_URL = "sqlite://"

@pytest.fixture(name="engine")
def engine_fixture():
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="session")
def session_fixture(engine):
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(engine):
    from backend.main import app
    from backend.database import get_session

    def get_session_override():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_token():
    from backend.auth import create_token
    return create_token({"sub": "1", "is_admin": True})


@pytest.fixture
def user_token():
    from backend.auth import create_token
    return create_token({"sub": "2", "is_admin": False})
```

- [ ] **Step 2: 创建 backend/deps.py**

```python
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
    except (JWTError, KeyError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


CurrentUserDep = Annotated[int, Depends(get_current_user_id)]
AdminDep = Annotated[int, Depends(get_current_admin_id)]
```

- [ ] **Step 3: 创建最小化 backend/main.py（后续任务会扩展）**

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from backend.database import create_db_and_tables

app = FastAPI(title="RAGflow Agent Hub")


@app.on_event("startup")
def on_startup():
    create_db_and_tables()
```

- [ ] **Step 4: 验证 conftest 可导入**

```bash
pytest tests/conftest.py --collect-only
```

Expected: 无报错，显示 collected fixtures。

- [ ] **Step 5: Commit**

```bash
git add backend/deps.py backend/main.py tests/conftest.py
git commit -m "feat: dependency injection and test infrastructure"
```

---

## Task 5: 认证路由（注册 + 登录）

**Files:**
- Create: `backend/routers/auth.py`
- Create: `tests/test_auth.py`
- Modify: `backend/main.py`

- [ ] **Step 1: 写失败测试**

Create `tests/test_auth.py`:

```python
def test_register(client):
    resp = client.post("/api/auth/register", json={
        "username": "alice",
        "email": "alice@example.com",
        "password": "secret123"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == "alice"
    assert "password" not in data


def test_register_duplicate_email(client):
    client.post("/api/auth/register", json={
        "username": "alice",
        "email": "alice@example.com",
        "password": "secret123"
    })
    resp = client.post("/api/auth/register", json={
        "username": "alice2",
        "email": "alice@example.com",
        "password": "secret123"
    })
    assert resp.status_code == 400


def test_login(client):
    client.post("/api/auth/register", json={
        "username": "bob",
        "email": "bob@example.com",
        "password": "mypassword"
    })
    resp = client.post("/api/auth/login", json={
        "email": "bob@example.com",
        "password": "mypassword"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert "is_admin" in data


def test_login_wrong_password(client):
    client.post("/api/auth/register", json={
        "username": "carol",
        "email": "carol@example.com",
        "password": "correct"
    })
    resp = client.post("/api/auth/login", json={
        "email": "carol@example.com",
        "password": "wrong"
    })
    assert resp.status_code == 401
```

- [ ] **Step 2: 运行确认失败**

```bash
pytest tests/test_auth.py -v
```

Expected: `404 Not Found` 或路由不存在错误。

- [ ] **Step 3: 实现 backend/routers/auth.py**

```python
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
```

- [ ] **Step 4: 更新 backend/main.py 挂载路由**

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from backend.database import create_db_and_tables
from backend.routers import auth as auth_router

app = FastAPI(title="RAGflow Agent Hub")


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


app.include_router(auth_router.router)
```

- [ ] **Step 5: 运行测试确认通过**

```bash
pytest tests/test_auth.py -v
```

Expected: `4 passed`

- [ ] **Step 6: Commit**

```bash
git add backend/routers/auth.py backend/main.py tests/test_auth.py
git commit -m "feat: auth routes (register, login)"
```

---

## Task 6: 智能体路由（列表/详情/提交）

**Files:**
- Create: `backend/routers/agents.py`
- Create: `tests/test_agents.py`
- Modify: `backend/main.py`

- [ ] **Step 1: 写失败测试**

Create `tests/test_agents.py`:

```python
import pytest


def _register_and_login(client, username="user1", email="u1@test.com", password="pass123"):
    client.post("/api/auth/register", json={"username": username, "email": email, "password": password})
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    return resp.json()["token"]


def test_list_agents_empty(client):
    resp = client.get("/api/agents")
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["total"] == 0


def test_submit_agent_requires_auth(client):
    resp = client.post("/api/agents", data={"name": "Test", "url": "http://x.com"})
    assert resp.status_code == 403


def test_submit_and_list_agent(client):
    token = _register_and_login(client)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post(
        "/api/agents",
        data={"name": "My Agent", "url": "http://rag.local/share?shared_id=abc"},
        headers=headers,
    )
    assert resp.status_code == 200
    agent = resp.json()
    assert agent["name"] == "My Agent"
    assert agent["status"] == "pending"

    # pending 状态不出现在公开列表
    list_resp = client.get("/api/agents")
    assert list_resp.json()["total"] == 0


def test_get_agent_detail(client):
    token = _register_and_login(client, "u2", "u2@test.com")
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.post(
        "/api/agents",
        data={"name": "Detail Agent", "url": "http://rag.local/share?shared_id=xyz"},
        headers=headers,
    )
    agent_id = resp.json()["id"]

    detail = client.get(f"/api/agents/{agent_id}")
    assert detail.status_code == 200
    assert detail.json()["name"] == "Detail Agent"
```

- [ ] **Step 2: 运行确认失败**

```bash
pytest tests/test_agents.py -v
```

Expected: `404 Not Found`

- [ ] **Step 3: 实现 backend/routers/agents.py**

```python
import os
import uuid
from typing import Optional, List
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel
from sqlmodel import select
from backend.deps import SessionDep, CurrentUserDep
from backend.models import Agent, AgentStatus
import aiofiles

router = APIRouter(prefix="/api/agents", tags=["agents"])

UPLOAD_DIR = "uploads/avatars"
os.makedirs(UPLOAD_DIR, exist_ok=True)
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


class AgentResponse(BaseModel):
    id: int
    name: str
    url: str
    description: Optional[str]
    tags: Optional[str]
    avatar_path: Optional[str]
    usage_guide: Optional[str]
    status: str
    submitter_id: int
    likes_count: int
    created_at: str


class AgentListResponse(BaseModel):
    items: List[AgentResponse]
    total: int


def _to_response(agent: Agent) -> AgentResponse:
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        url=agent.url,
        description=agent.description,
        tags=agent.tags,
        avatar_path=agent.avatar_path,
        usage_guide=agent.usage_guide,
        status=agent.status.value,
        submitter_id=agent.submitter_id,
        likes_count=agent.likes_count,
        created_at=agent.created_at.isoformat(),
    )


@router.get("", response_model=AgentListResponse)
def list_agents(
    session: SessionDep,
    q: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
):
    page_size = 12
    stmt = select(Agent).where(Agent.status == AgentStatus.approved)
    if q:
        stmt = stmt.where(
            (Agent.name.contains(q)) | (Agent.description.contains(q))
        )
    stmt = stmt.order_by(Agent.likes_count.desc())
    all_items = session.exec(stmt).all()
    total = len(all_items)
    start = (page - 1) * page_size
    items = all_items[start: start + page_size]
    return AgentListResponse(items=[_to_response(a) for a in items], total=total)


@router.get("/{agent_id}", response_model=AgentResponse)
def get_agent(agent_id: int, session: SessionDep):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return _to_response(agent)


@router.post("", response_model=AgentResponse)
async def create_agent(
    session: SessionDep,
    user_id: CurrentUserDep,
    name: str = Form(...),
    url: str = Form(...),
    description: Optional[str] = Form(default=None),
    tags: Optional[str] = Form(default=None),
    usage_guide: Optional[str] = Form(default=None),
    avatar: Optional[UploadFile] = File(default=None),
):
    avatar_path = None
    if avatar and avatar.filename:
        content = await avatar.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large (max 5MB)")
        ext = os.path.splitext(avatar.filename)[1] or ".png"
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        async with aiofiles.open(filepath, "wb") as f:
            await f.write(content)
        avatar_path = filepath

    agent = Agent(
        name=name,
        url=url,
        description=description,
        tags=tags,
        usage_guide=usage_guide,
        avatar_path=avatar_path,
        submitter_id=user_id,
    )
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return _to_response(agent)
```

- [ ] **Step 4: 更新 backend/main.py**

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from backend.database import create_db_and_tables
from backend.routers import auth as auth_router
from backend.routers import agents as agents_router

app = FastAPI(title="RAGflow Agent Hub")


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


app.include_router(auth_router.router)
app.include_router(agents_router.router)
```

- [ ] **Step 5: 运行测试确认通过**

```bash
pytest tests/test_agents.py -v
```

Expected: `4 passed`

- [ ] **Step 6: Commit**

```bash
git add backend/routers/agents.py backend/main.py tests/test_agents.py
git commit -m "feat: agent CRUD routes (list, get, create)"
```

---

## Task 7: 链接解析路由

**Files:**
- Modify: `backend/routers/agents.py`
- Modify: `tests/test_agents.py`

- [ ] **Step 1: 在 test_agents.py 追加测试**

在 `tests/test_agents.py` 末尾添加：

```python
from unittest.mock import patch, AsyncMock


def test_parse_requires_auth(client):
    resp = client.post("/api/agents/parse", json={"url": "http://rag.local/next-chats/share?shared_id=abc&from=chat&auth=tok"})
    assert resp.status_code == 403


def test_parse_chat_link(client):
    token = _register_and_login(client, "u3", "u3@test.com")
    headers = {"Authorization": f"Bearer {token}"}

    mock_response = {"code": 0, "data": {"title": "My Chat", "prologue": "Hello!", "avatar": ""}}

    with patch("backend.routers.agents.httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client_cls.return_value.__aenter__.return_value = mock_client
        mock_client.get.return_value.json.return_value = mock_response
        mock_client.get.return_value.status_code = 200

        resp = client.post(
            "/api/agents/parse",
            json={"url": "http://rag.local/next-chats/share?shared_id=abc123&from=chat&auth=token123"},
            headers=headers,
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "My Chat"
    assert data["description"] == "Hello!"


def test_parse_invalid_url(client):
    token = _register_and_login(client, "u4", "u4@test.com")
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.post(
        "/api/agents/parse",
        json={"url": "not-a-valid-ragflow-url"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["error"] is not None
```

- [ ] **Step 2: 运行确认新测试失败**

```bash
pytest tests/test_agents.py::test_parse_requires_auth -v
```

Expected: `404 Not Found`

- [ ] **Step 3: 在 backend/routers/agents.py 顶部添加 import**

在文件顶部 import 区添加：

```python
from urllib.parse import urlparse, parse_qs
import httpx
from pydantic import BaseModel as PydanticBase
```

在文件末尾（`create_agent` 函数后）添加：

```python
class ParseRequest(PydanticBase):
    url: str


class ParseResponse(PydanticBase):
    name: Optional[str] = None
    description: Optional[str] = None
    avatar_base64: Optional[str] = None
    error: Optional[str] = None


@router.post("/parse", response_model=ParseResponse)
async def parse_agent_link(_user_id: CurrentUserDep, req: ParseRequest):
    try:
        parsed = urlparse(req.url)
        params = parse_qs(parsed.query)
        shared_id = params.get("shared_id", [None])[0]
        from_type = params.get("from", [None])[0]
        auth_token = params.get("auth", [None])[0]

        if not shared_id or not from_type or not auth_token:
            return ParseResponse(error="链接格式不正确，缺少必要参数")

        base = f"{parsed.scheme}://{parsed.netloc}"
        if from_type == "chat":
            api_url = f"{base}/api/v1/chatbots/{shared_id}/info"
        elif from_type == "agent":
            api_url = f"{base}/api/v1/agentbots/{shared_id}/inputs"
        else:
            return ParseResponse(error=f"不支持的链接类型: {from_type}")

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(api_url, headers={"Authorization": f"Bearer {auth_token}"})
            result = resp.json()

        if result.get("code") != 0 or not result.get("data"):
            return ParseResponse(error="RAGflow 返回错误，请手动填写")

        data = result["data"]
        avatar_b64 = data.get("avatar", "") or ""
        if avatar_b64 and not avatar_b64.startswith("data:"):
            avatar_b64 = f"data:image/png;base64,{avatar_b64}"

        return ParseResponse(
            name=data.get("title"),
            description=data.get("prologue"),
            avatar_base64=avatar_b64 if avatar_b64 else None,
        )
    except Exception as e:
        return ParseResponse(error=f"解析失败，请手动填写")
```

- [ ] **Step 4: 运行所有 agents 测试**

```bash
pytest tests/test_agents.py -v
```

Expected: `7 passed`

- [ ] **Step 5: Commit**

```bash
git add backend/routers/agents.py tests/test_agents.py
git commit -m "feat: link parsing endpoint (chat and agent types)"
```

---

## Task 8: 点赞路由

**Files:**
- Create: `backend/routers/likes.py`
- Create: `tests/test_likes.py`
- Modify: `backend/main.py`

- [ ] **Step 1: 写失败测试**

Create `tests/test_likes.py`:

```python
def _setup(client):
    client.post("/api/auth/register", json={"username": "liker", "email": "liker@test.com", "password": "pass"})
    token = client.post("/api/auth/login", json={"email": "liker@test.com", "password": "pass"}).json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    agent_resp = client.post("/api/agents", data={"name": "Likeable", "url": "http://x.com"}, headers=headers)
    return token, headers, agent_resp.json()["id"]


def test_like_agent(client):
    token, headers, agent_id = _setup(client)
    resp = client.post(f"/api/agents/{agent_id}/like", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["likes_count"] == 1
    assert resp.json()["liked"] is True


def test_unlike_agent(client):
    token, headers, agent_id = _setup(client)
    client.post(f"/api/agents/{agent_id}/like", headers=headers)
    resp = client.post(f"/api/agents/{agent_id}/like", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["likes_count"] == 0
    assert resp.json()["liked"] is False


def test_like_requires_auth(client):
    _, headers, agent_id = _setup(client)
    resp = client.post(f"/api/agents/{agent_id}/like")
    assert resp.status_code == 403
```

- [ ] **Step 2: 运行确认失败**

```bash
pytest tests/test_likes.py -v
```

Expected: `404 Not Found`

- [ ] **Step 3: 实现 backend/routers/likes.py**

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select
from backend.deps import SessionDep, CurrentUserDep
from backend.models import Agent, Like

router = APIRouter(tags=["likes"])


class LikeResponse(BaseModel):
    likes_count: int
    liked: bool


@router.post("/api/agents/{agent_id}/like", response_model=LikeResponse)
def toggle_like(agent_id: int, session: SessionDep, user_id: CurrentUserDep):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    existing = session.exec(
        select(Like).where(Like.agent_id == agent_id, Like.user_id == user_id)
    ).first()

    if existing:
        session.delete(existing)
        agent.likes_count = max(0, agent.likes_count - 1)
        liked = False
    else:
        like = Like(agent_id=agent_id, user_id=user_id)
        session.add(like)
        agent.likes_count += 1
        liked = True

    session.add(agent)
    session.commit()
    session.refresh(agent)
    return LikeResponse(likes_count=agent.likes_count, liked=liked)
```

- [ ] **Step 4: 更新 backend/main.py**

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from backend.database import create_db_and_tables
from backend.routers import auth as auth_router
from backend.routers import agents as agents_router
from backend.routers import likes as likes_router

app = FastAPI(title="RAGflow Agent Hub")


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


app.include_router(auth_router.router)
app.include_router(agents_router.router)
app.include_router(likes_router.router)
```

- [ ] **Step 5: 运行测试确认通过**

```bash
pytest tests/test_likes.py -v
```

Expected: `3 passed`

- [ ] **Step 6: Commit**

```bash
git add backend/routers/likes.py backend/main.py tests/test_likes.py
git commit -m "feat: like/unlike toggle route"
```

---

## Task 9: 评论路由

**Files:**
- Create: `backend/routers/comments.py`
- Create: `tests/test_comments.py`
- Modify: `backend/main.py`

- [ ] **Step 1: 写失败测试**

Create `tests/test_comments.py`:

```python
def _setup(client):
    client.post("/api/auth/register", json={"username": "commenter", "email": "c@test.com", "password": "pass"})
    token = client.post("/api/auth/login", json={"email": "c@test.com", "password": "pass"}).json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    agent_id = client.post("/api/agents", data={"name": "Commented", "url": "http://x.com"}, headers=headers).json()["id"]
    return token, headers, agent_id


def test_list_comments_empty(client):
    _, _, agent_id = _setup(client)
    resp = client.get(f"/api/agents/{agent_id}/comments")
    assert resp.status_code == 200
    assert resp.json() == []


def test_post_comment(client):
    _, headers, agent_id = _setup(client)
    resp = client.post(
        f"/api/agents/{agent_id}/comments",
        json={"content": "Great agent!"},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["content"] == "Great agent!"
    assert "created_at" in data


def test_comment_requires_auth(client):
    _, _, agent_id = _setup(client)
    resp = client.post(f"/api/agents/{agent_id}/comments", json={"content": "No auth"})
    assert resp.status_code == 403


def test_list_comments_after_post(client):
    _, headers, agent_id = _setup(client)
    client.post(f"/api/agents/{agent_id}/comments", json={"content": "First"}, headers=headers)
    client.post(f"/api/agents/{agent_id}/comments", json={"content": "Second"}, headers=headers)
    resp = client.get(f"/api/agents/{agent_id}/comments")
    assert resp.status_code == 200
    assert len(resp.json()) == 2
```

- [ ] **Step 2: 运行确认失败**

```bash
pytest tests/test_comments.py -v
```

Expected: `404 Not Found`

- [ ] **Step 3: 实现 backend/routers/comments.py**

```python
from typing import List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select
from backend.deps import SessionDep, CurrentUserDep
from backend.models import Agent, Comment

router = APIRouter(tags=["comments"])


class CommentRequest(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: int
    content: str
    agent_id: int
    user_id: int
    created_at: str


@router.get("/api/agents/{agent_id}/comments", response_model=List[CommentResponse])
def list_comments(agent_id: int, session: SessionDep):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    comments = session.exec(
        select(Comment).where(Comment.agent_id == agent_id).order_by(Comment.created_at)
    ).all()
    return [
        CommentResponse(
            id=c.id, content=c.content, agent_id=c.agent_id,
            user_id=c.user_id, created_at=c.created_at.isoformat()
        )
        for c in comments
    ]


@router.post("/api/agents/{agent_id}/comments", response_model=CommentResponse)
def create_comment(agent_id: int, req: CommentRequest, session: SessionDep, user_id: CurrentUserDep):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    comment = Comment(content=req.content, agent_id=agent_id, user_id=user_id)
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return CommentResponse(
        id=comment.id, content=comment.content, agent_id=comment.agent_id,
        user_id=comment.user_id, created_at=comment.created_at.isoformat()
    )
```

- [ ] **Step 4: 更新 backend/main.py**

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from backend.database import create_db_and_tables
from backend.routers import auth as auth_router
from backend.routers import agents as agents_router
from backend.routers import likes as likes_router
from backend.routers import comments as comments_router

app = FastAPI(title="RAGflow Agent Hub")


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


app.include_router(auth_router.router)
app.include_router(agents_router.router)
app.include_router(likes_router.router)
app.include_router(comments_router.router)
```

- [ ] **Step 5: 运行测试确认通过**

```bash
pytest tests/test_comments.py -v
```

Expected: `4 passed`

- [ ] **Step 6: Commit**

```bash
git add backend/routers/comments.py backend/main.py tests/test_comments.py
git commit -m "feat: comment routes (list, create)"
```

---

## Task 10: 管理员路由

**Files:**
- Create: `backend/routers/admin.py`
- Create: `tests/test_admin.py`
- Modify: `backend/main.py`

- [ ] **Step 1: 写失败测试**

Create `tests/test_admin.py`:

```python
from backend.auth import create_token


def _make_admin_token():
    return create_token({"sub": "999", "is_admin": True})


def _make_user_token():
    return create_token({"sub": "1", "is_admin": False})


def _submit_agent(client, token):
    headers = {"Authorization": f"Bearer {token}"}
    return client.post("/api/agents", data={"name": "ReviewMe", "url": "http://rag.local"}, headers=headers).json()["id"]


def test_admin_list_pending(client):
    user_token = _make_user_token()
    agent_id = _submit_agent(client, user_token)

    admin_headers = {"Authorization": f"Bearer {_make_admin_token()}"}
    resp = client.get("/api/admin/agents?status=pending", headers=admin_headers)
    assert resp.status_code == 200
    assert any(a["id"] == agent_id for a in resp.json()["items"])


def test_non_admin_cannot_access(client):
    user_token = _make_user_token()
    headers = {"Authorization": f"Bearer {user_token}"}
    resp = client.get("/api/admin/agents", headers=headers)
    assert resp.status_code == 403


def test_approve_agent(client):
    user_token = _make_user_token()
    agent_id = _submit_agent(client, user_token)

    admin_headers = {"Authorization": f"Bearer {_make_admin_token()}"}
    resp = client.post(f"/api/admin/agents/{agent_id}/approve", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "approved"

    # approved 后出现在公开列表
    list_resp = client.get("/api/agents")
    assert any(a["id"] == agent_id for a in list_resp.json()["items"])


def test_reject_agent(client):
    user_token = _make_user_token()
    agent_id = _submit_agent(client, user_token)

    admin_headers = {"Authorization": f"Bearer {_make_admin_token()}"}
    resp = client.post(f"/api/admin/agents/{agent_id}/reject", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"
```

- [ ] **Step 2: 运行确认失败**

```bash
pytest tests/test_admin.py -v
```

Expected: `404 Not Found`

- [ ] **Step 3: 实现 backend/routers/admin.py**

```python
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import select
from backend.deps import SessionDep, AdminDep
from backend.models import Agent, AgentStatus
from backend.routers.agents import AgentResponse, _to_response

router = APIRouter(prefix="/api/admin", tags=["admin"])


class AgentListResponse(BaseModel):
    items: List[AgentResponse]
    total: int


@router.get("/agents", response_model=AgentListResponse)
def list_agents_admin(
    session: SessionDep,
    _admin: AdminDep,
    status: Optional[str] = Query(default=None),
):
    stmt = select(Agent)
    if status:
        try:
            stmt = stmt.where(Agent.status == AgentStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    stmt = stmt.order_by(Agent.created_at.desc())
    items = session.exec(stmt).all()
    return AgentListResponse(items=[_to_response(a) for a in items], total=len(items))


@router.post("/agents/{agent_id}/approve", response_model=AgentResponse)
def approve_agent(agent_id: int, session: SessionDep, _admin: AdminDep):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.status = AgentStatus.approved
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return _to_response(agent)


@router.post("/agents/{agent_id}/reject", response_model=AgentResponse)
def reject_agent(agent_id: int, session: SessionDep, _admin: AdminDep):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.status = AgentStatus.rejected
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return _to_response(agent)
```

- [ ] **Step 4: 更新 backend/main.py（最终版本）**

```python
import os
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from backend.database import create_db_and_tables
from backend.routers import auth as auth_router
from backend.routers import agents as agents_router
from backend.routers import likes as likes_router
from backend.routers import comments as comments_router
from backend.routers import admin as admin_router

app = FastAPI(title="RAGflow Agent Hub")


@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    os.makedirs("uploads/avatars", exist_ok=True)


app.include_router(auth_router.router)
app.include_router(agents_router.router)
app.include_router(likes_router.router)
app.include_router(comments_router.router)
app.include_router(admin_router.router)

# 托管上传文件
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# 托管前端静态文件（前端编译后）
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(FRONTEND_DIST):
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
```

- [ ] **Step 5: 运行全部后端测试**

```bash
pytest tests/ -v --ignore=tests/test_models.py
```

Expected: 全部通过（约 18 个测试）

- [ ] **Step 6: Commit**

```bash
git add backend/routers/admin.py backend/main.py tests/test_admin.py
git commit -m "feat: admin routes (list, approve, reject) + frontend hosting"
```

---

## Task 11: 前端项目初始化

**Files:**
- Create: `frontend/` (via Vite)
- Create: `frontend/src/types.ts`
- Create: `frontend/src/api.ts`

- [ ] **Step 1: 初始化 Vite + React + TypeScript 项目**

```bash
cd E:/ragflow-agent-web
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install react-router-dom
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 2: 配置 Tailwind（frontend/tailwind.config.js）**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 3: 替换 frontend/src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: 配置 Vite 代理（frontend/vite.config.ts）**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/uploads': 'http://localhost:8000',
    },
  },
})
```

- [ ] **Step 5: 创建 frontend/src/types.ts**

```ts
export interface Agent {
  id: number
  name: string
  url: string
  description: string | null
  tags: string | null
  avatar_path: string | null
  usage_guide: string | null
  status: 'pending' | 'approved' | 'rejected'
  submitter_id: number
  likes_count: number
  created_at: string
}

export interface Comment {
  id: number
  content: string
  agent_id: number
  user_id: number
  created_at: string
}

export interface AgentListResponse {
  items: Agent[]
  total: number
}

export interface ParseResponse {
  name?: string
  description?: string
  avatar_base64?: string
  error?: string
}

export interface AuthUser {
  token: string
  is_admin: boolean
}
```

- [ ] **Step 6: 创建 frontend/src/api.ts**

```ts
const BASE = ''

function getToken(): string | null {
  return localStorage.getItem('token')
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const resp = await fetch(`${BASE}${path}`, { ...options, headers })
  if (resp.status === 401) {
    localStorage.removeItem('token')
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
    throw new Error('Unauthorized')
  }
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return resp.json()
}

export const api = {
  register: (username: string, email: string, password: string) =>
    request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string; is_admin: boolean }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  listAgents: (q?: string, page = 1) => {
    const params = new URLSearchParams({ page: String(page) })
    if (q) params.set('q', q)
    return request<{ items: import('./types').Agent[]; total: number }>(`/api/agents?${params}`)
  },

  getAgent: (id: number) =>
    request<import('./types').Agent>(`/api/agents/${id}`),

  parseLink: (url: string) =>
    request<import('./types').ParseResponse>('/api/agents/parse', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),

  submitAgent: (formData: FormData) =>
    request<import('./types').Agent>('/api/agents', {
      method: 'POST',
      body: formData,
    }),

  toggleLike: (agentId: number) =>
    request<{ likes_count: number; liked: boolean }>(`/api/agents/${agentId}/like`, {
      method: 'POST',
    }),

  listComments: (agentId: number) =>
    request<import('./types').Comment[]>(`/api/agents/${agentId}/comments`),

  postComment: (agentId: number, content: string) =>
    request<import('./types').Comment>(`/api/agents/${agentId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  adminListAgents: (status?: string) => {
    const params = status ? `?status=${status}` : ''
    return request<{ items: import('./types').Agent[]; total: number }>(`/api/admin/agents${params}`)
  },

  adminApprove: (id: number) =>
    request<import('./types').Agent>(`/api/admin/agents/${id}/approve`, { method: 'POST' }),

  adminReject: (id: number) =>
    request<import('./types').Agent>(`/api/admin/agents/${id}/reject`, { method: 'POST' }),
}
```

- [ ] **Step 7: 验证前端启动**

```bash
cd E:/ragflow-agent-web/frontend && npm run dev
```

Expected: Vite 启动成功，访问 `http://localhost:5173` 显示 Vite 默认页。Ctrl+C 停止。

- [ ] **Step 8: Commit**

```bash
cd E:/ragflow-agent-web
git add frontend/
git commit -m "feat: frontend scaffold (Vite + React + TS + Tailwind + api.ts)"
```

---

## Task 12: 路由 + 认证页面

**Files:**
- Modify: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/components/ProtectedRoute.tsx`
- Create: `frontend/src/pages/Login.tsx`
- Create: `frontend/src/pages/Register.tsx`

- [ ] **Step 1: 更新 frontend/src/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
```

- [ ] **Step 2: 创建 frontend/src/App.tsx**

```tsx
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import AgentDetail from './pages/AgentDetail'
import Submit from './pages/Submit'
import Login from './pages/Login'
import Register from './pages/Register'
import Admin from './pages/Admin'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/agents/:id" element={<AgentDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/submit" element={<ProtectedRoute><Submit /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
      </Routes>
    </div>
  )
}
```

- [ ] **Step 3: 创建 frontend/src/components/ProtectedRoute.tsx**

```tsx
import { Navigate, useLocation } from 'react-router-dom'

interface Props {
  children: React.ReactNode
  adminOnly?: boolean
}

export default function ProtectedRoute({ children, adminOnly = false }: Props) {
  const token = localStorage.getItem('token')
  const isAdmin = localStorage.getItem('is_admin') === 'true'
  const location = useLocation()

  if (!token) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }
  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
```

- [ ] **Step 4: 创建 frontend/src/pages/Login.tsx**

```tsx
import { useState, FormEvent } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { api } from '../api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const [params] = useSearchParams()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const data = await api.login(email, password)
      localStorage.setItem('token', data.token)
      localStorage.setItem('is_admin', String(data.is_admin))
      const redirect = params.get('redirect') || '/'
      navigate(redirect, { replace: true })
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-white p-8 rounded-xl shadow w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">登录</h1>
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">邮箱</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">密码</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <button type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 font-medium">
            登录
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          还没有账号？<Link to="/register" className="text-blue-500 hover:underline">注册</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 创建 frontend/src/pages/Register.tsx**

```tsx
import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api'

export default function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await api.register(username, email, password)
      navigate('/login')
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-white p-8 rounded-xl shadow w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">注册</h1>
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">用户名</label>
            <input type="text" required value={username} onChange={e => setUsername(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">邮箱</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">密码</label>
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <button type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 font-medium">
            注册
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          已有账号？<Link to="/login" className="text-blue-500 hover:underline">登录</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: 验证编译通过**

```bash
cd E:/ragflow-agent-web/frontend && npm run build 2>&1 | tail -5
```

Expected: `built in Xs` 无 TypeScript 报错。

- [ ] **Step 7: Commit**

```bash
cd E:/ragflow-agent-web
git add frontend/src/
git commit -m "feat: routing, ProtectedRoute, Login, Register pages"
```

---

## Task 13: 首页 + AgentCard + SearchBar

**Files:**
- Create: `frontend/src/components/AgentCard.tsx`
- Create: `frontend/src/components/SearchBar.tsx`
- Create: `frontend/src/pages/Home.tsx`

- [ ] **Step 1: 创建 frontend/src/components/AgentCard.tsx**

```tsx
import { Link } from 'react-router-dom'
import { Agent } from '../types'

interface Props {
  agent: Agent
}

export default function AgentCard({ agent }: Props) {
  const tags = agent.tags ? agent.tags.split(',').map(t => t.trim()).filter(Boolean) : []

  return (
    <Link to={`/agents/${agent.id}`}
      className="bg-white rounded-xl shadow hover:shadow-md transition-shadow p-4 flex gap-4 items-start">
      <div className="flex-shrink-0">
        {agent.avatar_path ? (
          <img src={`/${agent.avatar_path}`} alt={agent.name}
            className="w-14 h-14 rounded-full object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 text-xl font-bold">
            {agent.name[0]}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{agent.name}</h3>
        {agent.description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{agent.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {tags.map(tag => (
            <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 mt-2 text-sm text-gray-400">
          <span>👍</span>
          <span>{agent.likes_count}</span>
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: 创建 frontend/src/components/SearchBar.tsx**

```tsx
import { useState, FormEvent } from 'react'

interface Props {
  onSearch: (q: string) => void
  initialValue?: string
}

export default function SearchBar({ onSearch, initialValue = '' }: Props) {
  const [value, setValue] = useState(initialValue)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSearch(value.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="搜索智能体名称或描述..."
        className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <button type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
        搜索
      </button>
    </form>
  )
}
```

- [ ] **Step 3: 创建 frontend/src/pages/Home.tsx**

```tsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { Agent } from '../types'
import AgentCard from '../components/AgentCard'
import SearchBar from '../components/SearchBar'

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('token')
  const isAdmin = localStorage.getItem('is_admin') === 'true'
  const pageSize = 12

  useEffect(() => {
    setLoading(true)
    api.listAgents(query || undefined, page)
      .then(data => { setAgents(data.items); setTotal(data.total) })
      .finally(() => setLoading(false))
  }, [query, page])

  function handleSearch(q: string) {
    setQuery(q)
    setPage(1)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">RAGflow 智能体广场</h1>
        <div className="flex gap-2">
          {token ? (
            <>
              <Link to="/submit"
                className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600">
                + 分享智能体
              </Link>
              {isAdmin && (
                <Link to="/admin"
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800">
                  管理
                </Link>
              )}
              <button
                onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('is_admin'); window.location.reload() }}
                className="text-sm text-gray-500 hover:text-gray-700 px-2">
                退出
              </button>
            </>
          ) : (
            <Link to="/login"
              className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600">
              登录
            </Link>
          )}
        </div>
      </div>

      <div className="mb-6">
        <SearchBar onSearch={handleSearch} initialValue={query} />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">加载中...</div>
      ) : agents.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {query ? `没有找到与"${query}"相关的智能体` : '还没有智能体，快来分享第一个吧！'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {agents.map(agent => <AgentCard key={agent.id} agent={agent} />)}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-full text-sm ${p === page ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 验证编译**

```bash
cd E:/ragflow-agent-web/frontend && npm run build 2>&1 | tail -5
```

Expected: 无报错。

- [ ] **Step 5: Commit**

```bash
cd E:/ragflow-agent-web
git add frontend/src/
git commit -m "feat: Home page with search, AgentCard, SearchBar"
```

---

## Task 14: 智能体详情页 + LikeButton + 评论组件

**Files:**
- Create: `frontend/src/components/LikeButton.tsx`
- Create: `frontend/src/components/CommentList.tsx`
- Create: `frontend/src/components/CommentForm.tsx`
- Create: `frontend/src/pages/AgentDetail.tsx`

- [ ] **Step 1: 创建 frontend/src/components/LikeButton.tsx**

```tsx
import { useState } from 'react'
import { api } from '../api'

interface Props {
  agentId: number
  initialCount: number
  initialLiked?: boolean
}

export default function LikeButton({ agentId, initialCount, initialLiked = false }: Props) {
  const [count, setCount] = useState(initialCount)
  const [liked, setLiked] = useState(initialLiked)
  const [loading, setLoading] = useState(false)
  const token = localStorage.getItem('token')

  async function handleClick() {
    if (!token) { window.location.href = '/login'; return }
    if (loading) return
    setLoading(true)
    try {
      const data = await api.toggleLike(agentId)
      setCount(data.likes_count)
      setLiked(data.liked)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={handleClick} disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${liked ? 'bg-blue-50 border-blue-300 text-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
      <span>{liked ? '👍' : '👍'}</span>
      <span>{count}</span>
    </button>
  )
}
```

- [ ] **Step 2: 创建 frontend/src/components/CommentList.tsx**

```tsx
import { Comment } from '../types'

interface Props {
  comments: Comment[]
}

export default function CommentList({ comments }: Props) {
  if (comments.length === 0) {
    return <p className="text-gray-400 text-sm py-4">暂无评论</p>
  }
  return (
    <ul className="space-y-4">
      {comments.map(c => (
        <li key={c.id} className="bg-gray-50 rounded-lg px-4 py-3">
          <p className="text-gray-800 text-sm">{c.content}</p>
          <p className="text-xs text-gray-400 mt-1">{new Date(c.created_at).toLocaleString('zh-CN')}</p>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 3: 创建 frontend/src/components/CommentForm.tsx**

```tsx
import { useState, FormEvent } from 'react'
import { api } from '../api'
import { Comment } from '../types'

interface Props {
  agentId: number
  onCommentAdded: (comment: Comment) => void
}

export default function CommentForm({ agentId, onCommentAdded }: Props) {
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const token = localStorage.getItem('token')

  if (!token) {
    return (
      <p className="text-sm text-gray-500">
        <a href="/login" className="text-blue-500 hover:underline">登录</a>后发表评论
      </p>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setError('')
    setLoading(true)
    try {
      const comment = await api.postComment(agentId, content.trim())
      onCommentAdded(comment)
      setContent('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="写下你的评论..."
        rows={3}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
      />
      <button type="submit" disabled={loading || !content.trim()}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50">
        {loading ? '提交中...' : '发表评论'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: 创建 frontend/src/pages/AgentDetail.tsx**

```tsx
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { Agent, Comment } from '../types'
import LikeButton from '../components/LikeButton'
import CommentList from '../components/CommentList'
import CommentForm from '../components/CommentForm'

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    const agentId = Number(id)
    Promise.all([api.getAgent(agentId), api.listComments(agentId)])
      .then(([a, c]) => { setAgent(a); setComments(c) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>
  if (notFound || !agent) return (
    <div className="text-center py-20">
      <p className="text-gray-500">智能体不存在</p>
      <Link to="/" className="text-blue-500 hover:underline mt-2 block">返回首页</Link>
    </div>
  )

  const tags = agent.tags ? agent.tags.split(',').map(t => t.trim()).filter(Boolean) : []

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 mb-6 block">← 返回首页</Link>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          {agent.avatar_path ? (
            <img src={`/${agent.avatar_path}`} alt={agent.name}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 text-2xl font-bold flex-shrink-0">
              {agent.name[0]}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{agent.name}</h1>
            {tags.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-1">
                {tags.map(tag => (
                  <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {agent.description && (
          <p className="text-gray-600 text-sm mb-4 whitespace-pre-line">{agent.description}</p>
        )}

        {agent.usage_guide && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h2>
            <p className="text-sm text-gray-600 whitespace-pre-line">{agent.usage_guide}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <LikeButton agentId={agent.id} initialCount={agent.likes_count} />
          <a href={agent.url} target="_blank" rel="noopener noreferrer"
            className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600">
            去使用 →
          </a>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">评论 ({comments.length})</h2>
        <div className="mb-6">
          <CommentForm agentId={agent.id} onCommentAdded={c => setComments(prev => [...prev, c])} />
        </div>
        <CommentList comments={comments} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 验证编译**

```bash
cd E:/ragflow-agent-web/frontend && npm run build 2>&1 | tail -5
```

Expected: 无报错。

- [ ] **Step 6: Commit**

```bash
cd E:/ragflow-agent-web
git add frontend/src/
git commit -m "feat: AgentDetail page with LikeButton and comments"
```

---

## Task 15: 提交页（链接解析 + 表单）

**Files:**
- Create: `frontend/src/pages/Submit.tsx`

- [ ] **Step 1: 创建 frontend/src/pages/Submit.tsx**

```tsx
import { useState, useRef, ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function Submit() {
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [usageGuide, setUsageGuide] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [parseError, setParseError] = useState('')
  const [parsing, setParsing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  async function handleParse() {
    if (!url.trim()) return
    setParsing(true)
    setParseError('')
    try {
      const data = await api.parseLink(url.trim())
      if (data.error) {
        setParseError(data.error)
      } else {
        if (data.name) setName(data.name)
        if (data.description) setDescription(data.description)
        if (data.avatar_base64) {
          setAvatarPreview(data.avatar_base64)
          // Convert base64 to File
          const res = await fetch(data.avatar_base64)
          const blob = await res.blob()
          const file = new File([blob], 'avatar.png', { type: blob.type })
          setAvatarFile(file)
        }
      }
    } catch (err: any) {
      setParseError('解析失败，请手动填写')
    } finally {
      setParsing(false)
    }
  }

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = ev => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !url.trim()) return
    setError('')
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('name', name.trim())
      fd.append('url', url.trim())
      if (description) fd.append('description', description)
      if (tags) fd.append('tags', tags)
      if (usageGuide) fd.append('usage_guide', usageGuide)
      if (avatarFile) fd.append('avatar', avatarFile)
      const agent = await api.submitAgent(fd)
      navigate(`/agents/${agent.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">分享智能体</h1>

      <div className="bg-white rounded-xl shadow p-6">
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}

        {/* 链接解析 */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">
            RAGflow 分享链接 <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input type="url" value={url} onChange={e => setUrl(e.target.value)}
              placeholder="http://your-ragflow/share?shared_id=..."
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <button type="button" onClick={handleParse} disabled={parsing || !url}
              className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50">
              {parsing ? '解析中...' : '解析'}
            </button>
          </div>
          {parseError && <p className="text-orange-500 text-xs mt-1">{parseError}</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 头像 */}
          <div>
            <label className="block text-sm font-medium mb-1">头像</label>
            <div className="flex items-center gap-4">
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-2xl">?</div>
              )}
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="text-sm text-blue-500 hover:underline">
                {avatarPreview ? '更换图片' : '上传图片'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
          </div>

          {/* 名称 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              名称 <span className="text-red-500">*</span>
            </label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium mb-1">描述</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-sm font-medium mb-1">标签（逗号分隔）</label>
            <input type="text" value={tags} onChange={e => setTags(e.target.value)}
              placeholder="办公,法律,代码"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          {/* 使用说明 */}
          <div>
            <label className="block text-sm font-medium mb-1">使用说明</label>
            <textarea value={usageGuide} onChange={e => setUsageGuide(e.target.value)} rows={4}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
          </div>

          <button type="submit" disabled={submitting || !name.trim() || !url.trim()}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium">
            {submitting ? '提交中...' : '提交审核'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
cd E:/ragflow-agent-web/frontend && npm run build 2>&1 | tail -5
```

Expected: 无报错。

- [ ] **Step 3: Commit**

```bash
cd E:/ragflow-agent-web
git add frontend/src/pages/Submit.tsx
git commit -m "feat: Submit page with link parsing and form"
```

---

## Task 16: 管理后台页面

**Files:**
- Create: `frontend/src/pages/Admin.tsx`

- [ ] **Step 1: 创建 frontend/src/pages/Admin.tsx**

```tsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { Agent } from '../types'

export default function Admin() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')

  useEffect(() => {
    setLoading(true)
    api.adminListAgents(filter)
      .then(data => setAgents(data.items))
      .finally(() => setLoading(false))
  }, [filter])

  async function handleApprove(id: number) {
    const updated = await api.adminApprove(id)
    setAgents(prev => prev.map(a => a.id === id ? updated : a))
  }

  async function handleReject(id: number) {
    const updated = await api.adminReject(id)
    setAgents(prev => prev.map(a => a.id === id ? updated : a))
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">管理后台</h1>
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">← 返回首页</Link>
      </div>

      <div className="flex gap-2 mb-6">
        {(['pending', 'approved', 'rejected'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === s ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s === 'pending' ? '待审核' : s === 'approved' ? '已通过' : '已拒绝'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12 text-gray-400">暂无数据</div>
      ) : (
        <div className="space-y-3">
          {agents.map(agent => (
            <div key={agent.id} className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
              {agent.avatar_path ? (
                <img src={`/${agent.avatar_path}`} alt={agent.name}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 font-bold flex-shrink-0">
                  {agent.name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{agent.name}</p>
                <a href={agent.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline truncate block">{agent.url}</a>
                <p className="text-xs text-gray-400 mt-0.5">
                  提交于 {new Date(agent.created_at).toLocaleString('zh-CN')}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {agent.status === 'pending' && (
                  <>
                    <button onClick={() => handleApprove(agent.id)}
                      className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-600">
                      通过
                    </button>
                    <button onClick={() => handleReject(agent.id)}
                      className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-red-600">
                      拒绝
                    </button>
                  </>
                )}
                {agent.status !== 'pending' && (
                  <span className={`text-sm px-3 py-1.5 rounded-lg ${agent.status === 'approved' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {agent.status === 'approved' ? '已通过' : '已拒绝'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
cd E:/ragflow-agent-web/frontend && npm run build 2>&1 | tail -5
```

Expected: 无报错。

- [ ] **Step 3: Commit**

```bash
cd E:/ragflow-agent-web
git add frontend/src/pages/Admin.tsx
git commit -m "feat: Admin page for reviewing agent submissions"
```

---

## Task 17: 构建集成 + 启动验证

**Files:**
- Modify: `backend/main.py`（确认静态文件路径正确）

- [ ] **Step 1: 编译前端**

```bash
cd E:/ragflow-agent-web/frontend && npm run build
```

Expected: `dist/` 目录生成，包含 `index.html` 和 `assets/`。

- [ ] **Step 2: 运行所有后端测试**

```bash
cd E:/ragflow-agent-web && pytest tests/ -v --ignore=tests/test_models.py
```

Expected: 全部通过，无失败。

- [ ] **Step 3: 启动后端**

```bash
cd E:/ragflow-agent-web && uvicorn backend.main:app --reload --port 8000
```

Expected: 输出 `Application startup complete.`

- [ ] **Step 4: 验证 API 可访问**

新终端执行：

```bash
curl http://localhost:8000/api/agents
```

Expected: `{"items":[],"total":0}`

- [ ] **Step 5: 验证前端页面**

浏览器访问 `http://localhost:8000`，应看到"RAGflow 智能体广场"首页，无报错。

- [ ] **Step 6: 创建第一个管理员账号**

```bash
# 注册普通账号
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@local.com","password":"admin123"}'

# 手动将该账号设为管理员（SQLite）
python3 -c "
from sqlmodel import Session
from backend.database import engine
from backend.models import User
from sqlmodel import select
with Session(engine) as s:
    u = s.exec(select(User).where(User.email=='admin@local.com')).first()
    u.is_admin = True
    s.add(u)
    s.commit()
    print('Done:', u.username, 'is_admin=', u.is_admin)
"
```

Expected: `Done: admin is_admin= True`

- [ ] **Step 7: 端到端冒烟测试**

1. 访问 `http://localhost:8000/register` → 注册一个普通用户
2. 登录 → 进入首页
3. 点"+ 分享智能体" → 粘贴 RAGflow 链接 → 点"解析" → 表单预填
4. 填写完整后提交 → 跳转到详情页（状态为 pending）
5. 用 admin 账号登录 → 点"管理" → 进入管理后台
6. 找到刚提交的智能体 → 点"通过"
7. 返回首页 → 搜索该智能体 → 可见
8. 点进详情页 → 点赞 → 发表评论

- [ ] **Step 8: 最终 Commit**

```bash
cd E:/ragflow-agent-web
git add .
git commit -m "feat: complete integration - full stack RAGflow agent hub"
```

---

## 附：日常启动命令

```bash
# 启动后端（项目根目录）
uvicorn backend.main:app --reload --port 8000

# 前端开发模式（热更新，访问 localhost:5173）
cd frontend && npm run dev

# 前端生产构建
cd frontend && npm run build

# 运行后端测试
pytest tests/ -v
```

---

## 附：.gitignore

```
data.db
uploads/avatars/*.png
uploads/avatars/*.jpg
uploads/avatars/*.jpeg
uploads/avatars/*.gif
uploads/avatars/*.webp
__pycache__/
*.pyc
.env
frontend/node_modules/
frontend/dist/
.venv/
```
