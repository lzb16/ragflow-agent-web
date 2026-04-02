# 管理员创建与用户权限管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 通过环境变量引导首位管理员，并在管理后台提供用户权限管理界面。

**Architecture:** 后端在启动时读取 `ADMIN_EMAIL`/`ADMIN_PASSWORD` 环境变量引导管理员账号；新增两个 admin API 端点管理用户权限；前端新增 `/admin/users` 页面，管理员可在表格中提升或撤销其他用户的管理员权限。

**Tech Stack:** Python/FastAPI, SQLModel, SQLite, React/TypeScript, Tailwind CSS

---

## 文件清单

| 操作 | 文件 | 职责 |
|------|------|------|
| 修改 | `backend/main.py` | 在 `on_startup` 中调用 `seed_admin()` |
| 修改 | `backend/routers/admin.py` | 新增用户列表和设置权限两个端点 |
| 修改 | `frontend/src/types.ts` | 新增 `AdminUser` 类型 |
| 修改 | `frontend/src/api.ts` | 新增 `adminListUsers`、`adminSetAdmin` |
| 新建 | `frontend/src/pages/AdminUsers.tsx` | 用户管理页面 |
| 修改 | `frontend/src/App.tsx` | 注册 `/admin/users` 路由 |
| 修改 | `frontend/src/pages/Admin.tsx` | 添加导航链接到用户管理页 |
| 修改 | `tests/test_admin.py` | 新增用户管理相关测试 |
| 新建 | `.env.example` | 文档化环境变量 |

---

## Task 1: 后端 Bootstrap — 环境变量引导管理员

**Files:**
- Modify: `backend/main.py`
- Modify: `tests/test_admin.py`

- [ ] **Step 1: 写失败测试**

在 `tests/test_admin.py` 末尾追加：

```python
import os
from unittest.mock import patch
from sqlmodel import Session, select
from backend.models import User


def test_seed_admin_creates_user_when_env_set(engine):
    """启动时若环境变量存在且用户不在 DB，应创建管理员账号"""
    from backend.main import seed_admin
    from backend import database

    database.engine = engine
    with patch.dict(os.environ, {"ADMIN_EMAIL": "seed@example.com", "ADMIN_PASSWORD": "seedpass"}):
        seed_admin()

    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == "seed@example.com")).first()
    assert user is not None
    assert user.is_admin is True
    assert user.username == "admin"


def test_seed_admin_skips_when_no_env(engine):
    """未设置 ADMIN_EMAIL 时不创建任何用户"""
    from backend.main import seed_admin
    from backend import database

    database.engine = engine
    env = {k: v for k, v in os.environ.items() if k not in ("ADMIN_EMAIL", "ADMIN_PASSWORD")}
    with patch.dict(os.environ, env, clear=True):
        seed_admin()

    with Session(engine) as session:
        count = len(session.exec(select(User)).all())
    assert count == 0


def test_seed_admin_skips_when_user_exists(engine):
    """邮箱已存在时不重复创建，也不覆盖"""
    from backend.main import seed_admin
    from backend import database
    from backend.auth import hash_password

    database.engine = engine
    with Session(engine) as session:
        existing = User(username="original", email="seed@example.com",
                        password_hash=hash_password("original"), is_admin=False)
        session.add(existing)
        session.commit()

    with patch.dict(os.environ, {"ADMIN_EMAIL": "seed@example.com", "ADMIN_PASSWORD": "newpass"}):
        seed_admin()

    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == "seed@example.com")).first()
    assert user.username == "original"   # 未被覆盖
    assert user.is_admin is False        # 未被提升
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd E:/ragflow-agent-web
python -m pytest tests/test_admin.py::test_seed_admin_creates_user_when_env_set -v
```

预期：`FAILED` — `ImportError: cannot import name 'seed_admin' from 'backend.main'`

- [ ] **Step 3: 实现 seed_admin 并在 on_startup 调用**

将 `backend/main.py` 改为：

```python
import os
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from backend.database import create_db_and_tables
from backend.routers import auth as auth_router
from backend.routers import agents as agents_router
from backend.routers import likes as likes_router
from backend.routers import comments as comments_router
from backend.routers import admin as admin_router

app = FastAPI(title="RAGflow Agent Hub")


def seed_admin():
    """从环境变量引导首位管理员账号（若邮箱已存在则跳过）。"""
    email = os.getenv("ADMIN_EMAIL")
    password = os.getenv("ADMIN_PASSWORD")
    if not email or not password:
        return

    from sqlmodel import Session, select
    from backend import database
    from backend.models import User
    from backend.auth import hash_password

    with Session(database.engine) as session:
        existing = session.exec(select(User).where(User.email == email)).first()
        if existing:
            return
        user = User(
            username="admin",
            email=email,
            password_hash=hash_password(password),
            is_admin=True,
        )
        session.add(user)
        session.commit()


@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    os.makedirs("uploads/avatars", exist_ok=True)
    seed_admin()


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

- [ ] **Step 4: 运行测试，确认通过**

```bash
python -m pytest tests/test_admin.py::test_seed_admin_creates_user_when_env_set tests/test_admin.py::test_seed_admin_skips_when_no_env tests/test_admin.py::test_seed_admin_skips_when_user_exists -v
```

预期：`3 passed`

- [ ] **Step 5: 创建 .env.example**

新建 `.env.example`：

```
# 首位管理员引导（仅在该邮箱用户不存在时生效）
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me-in-production

# JWT 签名密钥
SECRET_KEY=change-me-in-production-please

# 数据库连接（默认 SQLite）
DATABASE_URL=sqlite:///./data.db
```

- [ ] **Step 6: 运行全量测试确认无回归**

```bash
python -m pytest tests/ -v
```

预期：全部通过

- [ ] **Step 7: 提交**

```bash
git add backend/main.py tests/test_admin.py .env.example
git commit -m "feat: 环境变量引导首位管理员账号（seed_admin）"
```

---

## Task 2: 后端 — 用户管理 API

**Files:**
- Modify: `backend/routers/admin.py`
- Modify: `tests/test_admin.py`

- [ ] **Step 1: 写失败测试**

在 `tests/test_admin.py` 末尾追加：

```python
def _register_user(client, username, email, password="pass1234"):
    resp = client.post("/api/auth/register", json={
        "username": username, "email": email, "password": password
    })
    assert resp.status_code == 200
    return resp.json()["id"]


def test_admin_list_users(client, session):
    """管理员可获取全部用户列表"""
    from backend.models import User
    from backend.auth import hash_password, create_token

    # 创建管理员用户（is_admin=True）
    admin_user = User(username="adm", email="adm@test.com",
                      password_hash=hash_password("x"), is_admin=True)
    session.add(admin_user)
    session.commit()
    session.refresh(admin_user)

    token = create_token({"sub": str(admin_user.id), "is_admin": True})
    headers = {"Authorization": f"Bearer {token}"}

    # 创建普通用户
    _register_user(client, "alice", "alice@test.com")

    resp = client.get("/api/admin/users", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert len(data["items"]) >= 2
    item = data["items"][0]
    assert "id" in item
    assert "username" in item
    assert "email" in item
    assert "is_admin" in item
    assert "created_at" in item


def test_non_admin_cannot_list_users(client):
    """普通用户无法访问用户列表"""
    from backend.auth import create_token
    token = create_token({"sub": "1", "is_admin": False})
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/admin/users", headers=headers)
    assert resp.status_code == 403


def test_set_admin_promote(client, session):
    """管理员可将普通用户提升为管理员"""
    from backend.models import User
    from backend.auth import hash_password, create_token

    admin_user = User(username="adm2", email="adm2@test.com",
                      password_hash=hash_password("x"), is_admin=True)
    session.add(admin_user)
    session.commit()
    session.refresh(admin_user)

    token = create_token({"sub": str(admin_user.id), "is_admin": True})
    headers = {"Authorization": f"Bearer {token}"}

    target_id = _register_user(client, "bob", "bob@test.com")

    resp = client.patch(f"/api/admin/users/{target_id}/set-admin",
                        json={"is_admin": True}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["is_admin"] is True


def test_set_admin_demote(client, session):
    """管理员可撤销他人的管理员权限"""
    from backend.models import User
    from backend.auth import hash_password, create_token

    admin_user = User(username="adm3", email="adm3@test.com",
                      password_hash=hash_password("x"), is_admin=True)
    other_admin = User(username="adm4", email="adm4@test.com",
                       password_hash=hash_password("x"), is_admin=True)
    session.add(admin_user)
    session.add(other_admin)
    session.commit()
    session.refresh(admin_user)
    session.refresh(other_admin)

    token = create_token({"sub": str(admin_user.id), "is_admin": True})
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.patch(f"/api/admin/users/{other_admin.id}/set-admin",
                        json={"is_admin": False}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["is_admin"] is False


def test_set_admin_cannot_change_self(client, session):
    """管理员不能修改自己的管理员状态"""
    from backend.models import User
    from backend.auth import hash_password, create_token

    admin_user = User(username="adm5", email="adm5@test.com",
                      password_hash=hash_password("x"), is_admin=True)
    session.add(admin_user)
    session.commit()
    session.refresh(admin_user)

    token = create_token({"sub": str(admin_user.id), "is_admin": True})
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.patch(f"/api/admin/users/{admin_user.id}/set-admin",
                        json={"is_admin": False}, headers=headers)
    assert resp.status_code == 400
    assert "Cannot change your own admin status" in resp.json()["detail"]


def test_set_admin_user_not_found(client, session):
    """目标用户不存在时返回 404"""
    from backend.models import User
    from backend.auth import hash_password, create_token

    admin_user = User(username="adm6", email="adm6@test.com",
                      password_hash=hash_password("x"), is_admin=True)
    session.add(admin_user)
    session.commit()
    session.refresh(admin_user)

    token = create_token({"sub": str(admin_user.id), "is_admin": True})
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.patch("/api/admin/users/99999/set-admin",
                        json={"is_admin": True}, headers=headers)
    assert resp.status_code == 404
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
python -m pytest tests/test_admin.py::test_admin_list_users tests/test_admin.py::test_set_admin_promote -v
```

预期：`FAILED` — `404 Not Found`

- [ ] **Step 3: 实现 admin.py 中的两个新端点**

将 `backend/routers/admin.py` 改为：

```python
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import select
from backend.deps import SessionDep, AdminDep
from backend.models import Agent, AgentStatus, User
from backend.routers.agents import AgentResponse, AgentListResponse, _to_response

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Agent 审核 ──────────────────────────────────────────────

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


@router.delete("/agents/{agent_id}", status_code=204)
def delete_agent(agent_id: int, session: SessionDep, _admin: AdminDep):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    session.delete(agent)
    session.commit()


# ── 用户管理 ────────────────────────────────────────────────

class UserAdminResponse(BaseModel):
    id: int
    username: str
    email: str
    is_admin: bool
    created_at: str


class UserAdminListResponse(BaseModel):
    items: list[UserAdminResponse]
    total: int


class SetAdminRequest(BaseModel):
    is_admin: bool


@router.get("/users", response_model=UserAdminListResponse)
def list_users(session: SessionDep, current_admin_id: AdminDep):
    users = session.exec(select(User).order_by(User.created_at.desc())).all()
    items = [
        UserAdminResponse(
            id=u.id,
            username=u.username,
            email=u.email,
            is_admin=u.is_admin,
            created_at=u.created_at.isoformat(),
        )
        for u in users
    ]
    return UserAdminListResponse(items=items, total=len(items))


@router.patch("/users/{user_id}/set-admin", response_model=UserAdminResponse)
def set_admin(
    user_id: int,
    req: SetAdminRequest,
    session: SessionDep,
    current_admin_id: AdminDep,
):
    if user_id == current_admin_id:
        raise HTTPException(status_code=400, detail="Cannot change your own admin status")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = req.is_admin
    session.add(user)
    session.commit()
    session.refresh(user)
    return UserAdminResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        is_admin=user.is_admin,
        created_at=user.created_at.isoformat(),
    )
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
python -m pytest tests/test_admin.py -v
```

预期：全部通过

- [ ] **Step 5: 提交**

```bash
git add backend/routers/admin.py tests/test_admin.py
git commit -m "feat: 新增用户列表和设置管理员权限 API"
```

---

## Task 3: 前端 — 类型与 API 客户端

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/api.ts`

- [ ] **Step 1: 在 types.ts 末尾追加 AdminUser 类型**

```typescript
export interface AdminUser {
  id: number
  username: string
  email: string
  is_admin: boolean
  created_at: string
}
```

- [ ] **Step 2: 在 api.ts 的 `adminDeleteAgent` 后追加两个方法**

```typescript
  adminListUsers: () =>
    request<{ items: import('./types').AdminUser[]; total: number }>('/api/admin/users'),

  adminSetAdmin: (userId: number, isAdmin: boolean) =>
    request<import('./types').AdminUser>(`/api/admin/users/${userId}/set-admin`, {
      method: 'PATCH',
      body: JSON.stringify({ is_admin: isAdmin }),
    }),
```

（在 `adminDeleteAgent` 那行的逗号后插入，保持在 `api` 对象内，`}` 之前）

- [ ] **Step 3: 提交**

```bash
git add frontend/src/types.ts frontend/src/api.ts
git commit -m "feat: 前端类型和 API 客户端新增用户管理方法"
```

---

## Task 4: 前端 — AdminUsers 页面与路由

**Files:**
- Create: `frontend/src/pages/AdminUsers.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/Admin.tsx`

- [ ] **Step 1: 新建 AdminUsers.tsx**

新建 `frontend/src/pages/AdminUsers.tsx`：

```tsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, ShieldOff } from 'lucide-react'
import { api } from '../api'
import type { AdminUser } from '../types'
import Navbar from '../components/Navbar'

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<number | null>(null)
  const currentUserId = Number(localStorage.getItem('user_id'))

  useEffect(() => {
    api.adminListUsers()
      .then(data => setUsers(data.items))
      .finally(() => setLoading(false))
  }, [])

  async function handleSetAdmin(userId: number, isAdmin: boolean) {
    setUpdating(userId)
    try {
      const updated = await api.adminSetAdmin(userId, isAdmin)
      setUsers(prev => prev.map(u => u.id === userId ? updated : u))
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 font-display">用户管理</h1>
            <p className="text-slate-500 text-sm mt-1">管理团队成员的管理员权限</p>
          </div>
          <Link to="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowLeft size={14} />
            返回管理后台
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">加载中...</div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">用户名</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">邮箱</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">注册时间</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">角色</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-800">{user.username}</td>
                    <td className="px-4 py-3 text-slate-500">{user.email}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(user.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-3">
                      {user.is_admin ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 font-medium">
                          <ShieldCheck size={11} />
                          管理员
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                          普通用户
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user.id === currentUserId ? (
                        <span className="text-xs text-slate-300">（当前账号）</span>
                      ) : user.is_admin ? (
                        <button
                          onClick={() => handleSetAdmin(user.id, false)}
                          disabled={updating === user.id}
                          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                          <ShieldOff size={12} />
                          撤销管理员
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSetAdmin(user.id, true)}
                          disabled={updating === user.id}
                          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                          <ShieldCheck size={12} />
                          设为管理员
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: 在 App.tsx 注册路由**

在 `App.tsx` 中：
1. 顶部导入区追加：`import AdminUsers from './pages/AdminUsers'`
2. 在 `/admin` 路由后追加：
```tsx
<Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
```

完整文件如下：

```tsx
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import AgentDetail from './pages/AgentDetail'
import Submit from './pages/Submit'
import Login from './pages/Login'
import Register from './pages/Register'
import Admin from './pages/Admin'
import AdminUsers from './pages/AdminUsers'
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
        <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
      </Routes>
    </div>
  )
}
```

- [ ] **Step 3: 在 Admin.tsx 中添加到用户管理的导航链接**

在 `Admin.tsx` 的返回首页 `<Link>` 旁边（`flex items-center justify-between` 区域），在 "返回首页" 链接前插入用户管理链接：

将：
```tsx
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 font-display">管理后台</h1>
            <p className="text-slate-500 text-sm mt-1">审核用户提交的智能体</p>
          </div>
          <Link to="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowLeft size={14} />
            返回首页
          </Link>
        </div>
```

改为：
```tsx
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 font-display">管理后台</h1>
            <p className="text-slate-500 text-sm mt-1">审核用户提交的智能体</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/admin/users"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors">
              用户管理
            </Link>
            <Link to="/"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
              <ArrowLeft size={14} />
              返回首页
            </Link>
          </div>
        </div>
```

同时在 `Admin.tsx` 顶部 import 区中，`Link` 已经被导入（`import { Link } from 'react-router-dom'`），无需修改。

- [ ] **Step 4: 构建前端，确认无编译错误**

```bash
cd E:/ragflow-agent-web/frontend
npm run build
```

预期：`✓ built in` 无 TypeScript 错误

- [ ] **Step 5: 提交**

```bash
cd E:/ragflow-agent-web
git add frontend/src/pages/AdminUsers.tsx frontend/src/App.tsx frontend/src/pages/Admin.tsx
git commit -m "feat: 新增用户管理页面 /admin/users"
```

---

## 验收标准

1. 设置 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 后重启服务，对应邮箱自动被注册为管理员
2. 未设置环境变量时，启动无任何异常
3. `GET /api/admin/users` 返回用户列表，仅管理员可访问
4. `PATCH /api/admin/users/{id}/set-admin` 可提升/撤销权限，操作自己返回 400
5. `/admin/users` 页面可正常展示用户列表，按钮操作即时生效
6. 当前登录用户的操作按钮置灰
7. `python -m pytest tests/ -v` 全部通过
