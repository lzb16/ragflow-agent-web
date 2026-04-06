# Auth Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完善注册/登录体验，新增修改密码功能，登录支持用户名，注册加强验证；管理员可在用户管理页重置他人密码。

**Architecture:** 后端 auth 路由新增修改密码接口、登录改为接受 username 或 email；前端注册/登录页增加 placeholder、密码显示切换、二次确认；新增独立的修改密码页面，Navbar 提供入口。

**Tech Stack:** FastAPI + SQLModel (后端)，React 19 + TypeScript + Tailwind CSS + Lucide React (前端)

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `backend/routers/auth.py` | 修改 | 登录改为 username/email 二选一；密码最小长度校验 8 位；新增 PATCH /api/auth/change-password |
| `backend/routers/admin.py` | 修改 | 新增 POST /api/admin/users/{id}/reset-password（管理员重置他人密码） |
| `frontend/src/api.ts` | 修改 | login 参数从 email 改为 login (string)；新增 changePassword |
| `frontend/src/pages/Login.tsx` | 修改 | 字段改为"用户名或邮箱"；密码显示/隐藏 |
| `frontend/src/pages/Register.tsx` | 修改 | placeholder；密码最小 8 位；二次确认；两个密码框显示/隐藏 |
| `frontend/src/pages/ChangePassword.tsx` | 新建 | 修改密码页面（当前密码 + 新密码 + 确认新密码） |
| `frontend/src/pages/AdminUsers.tsx` | 修改 | 每行用户新增"重置密码"按钮，点击弹出输入新密码的内联表单 |
| `frontend/src/App.tsx` | 修改 | 添加 /change-password 路由（需登录） |
| `frontend/src/components/Navbar.tsx` | 修改 | 登录状态下添加"修改密码"入口 |

---

## Task 1：后端 — 登录支持用户名或邮箱

**Files:**
- Modify: `backend/routers/auth.py`

- [ ] **Step 1：修改 LoginRequest，将 email 改为 login 字段**

将 `LoginRequest` 中的 `email: EmailStr` 改为普通字符串，支持输入用户名或邮箱：

```python
# backend/routers/auth.py

class LoginRequest(BaseModel):
    login: str          # 支持用户名或邮箱
    password: str
```

- [ ] **Step 2：修改 login 路由，先按邮箱查，再按用户名查**

```python
@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, session: SessionDep):
    # 先尝试邮箱匹配，再尝试用户名匹配
    user = session.exec(select(User).where(User.email == req.login)).first()
    if not user:
        user = session.exec(select(User).where(User.username == req.login)).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="用户名/邮箱或密码错误")

    token = create_token({"sub": str(user.id), "is_admin": user.is_admin})
    return LoginResponse(token=token, is_admin=user.is_admin, user_id=user.id)
```

- [ ] **Step 3：手动验证**

用邮箱登录 → 成功；用用户名登录 → 成功；错误密码 → 返回 401。

- [ ] **Step 4：提交**

```bash
git add backend/routers/auth.py
git commit -m "feat: 登录支持用户名或邮箱"
```

---

## Task 2：后端 — 注册密码最小长度改为 8 位

**Files:**
- Modify: `backend/routers/auth.py`

- [ ] **Step 1：在 RegisterRequest 加密码长度校验**

```python
from pydantic import BaseModel, EmailStr, field_validator

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
```

- [ ] **Step 2：手动验证**

发送密码为 7 位的注册请求 → 返回 422，detail 包含"密码至少 8 位"。

- [ ] **Step 3：提交**

```bash
git add backend/routers/auth.py
git commit -m "feat: 注册密码最小长度改为 8 位"
```

---

## Task 3：后端 — 新增修改密码接口

**Files:**
- Modify: `backend/routers/auth.py`

- [ ] **Step 1：新增 ChangePasswordRequest 和路由**

```python
from backend.deps import SessionDep, CurrentUserDep

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
```

- [ ] **Step 2：手动验证**

携带有效 token，传入正确当前密码和新密码 → 204；传入错误当前密码 → 400；无 token → 401。

- [ ] **Step 3：提交**

```bash
git add backend/routers/auth.py
git commit -m "feat: 新增修改密码接口 PATCH /api/auth/change-password"
```

---

## Task 4：前端 — api.ts 更新

**Files:**
- Modify: `frontend/src/api.ts`

- [ ] **Step 1：login 参数改为 login（string），新增 changePassword**

找到 `api.login` 和其后面的方法，替换为：

```typescript
login: (login: string, password: string) =>
  request<{ token: string; is_admin: boolean; user_id: number }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login, password }),
  }),

changePassword: (currentPassword: string, newPassword: string) =>
  request<void>('/api/auth/change-password', {
    method: 'PATCH',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  }),
```

- [ ] **Step 2：提交**

```bash
git add frontend/src/api.ts
git commit -m "feat: api.ts 更新 login 签名，新增 changePassword"
```

---

## Task 5：前端 — 登录页面改造

**Files:**
- Modify: `frontend/src/pages/Login.tsx`

- [ ] **Step 1：完整替换 Login.tsx**

```tsx
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Bot, Eye, EyeOff } from 'lucide-react'
import { api } from '../api'

export default function Login() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [params] = useSearchParams()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.login(login, password)
      localStorage.setItem('token', data.token)
      localStorage.setItem('is_admin', String(data.is_admin))
      localStorage.setItem('user_id', String(data.user_id))
      const redirect = params.get('redirect') || '/'
      navigate(redirect, { replace: true })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-700 hover:text-blue-600 transition-colors">
            <Bot size={22} strokeWidth={1.8} />
            <span className="font-semibold font-display text-[15px]">RAGflow 广场</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 mt-6 font-display">欢迎回来</h1>
          <p className="text-slate-500 text-sm mt-2">
            还没有账号？
            <Link to="/register" className="text-blue-600 hover:underline font-medium ml-1">免费注册</Link>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm mb-5">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">用户名或邮箱</label>
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="OA 用户名或邮箱"
                value={login}
                onChange={e => setLogin(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">密码</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors disabled:opacity-60 mt-1 cursor-pointer">
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2：手动验证**

用户名登录 → 成功；邮箱登录 → 成功；眼睛图标切换密码显示 → 正常。

- [ ] **Step 3：提交**

```bash
git add frontend/src/pages/Login.tsx
git commit -m "feat: 登录页支持用户名/邮箱，密码显示切换"
```

---

## Task 6：前端 — 注册页面改造

**Files:**
- Modify: `frontend/src/pages/Register.tsx`

- [ ] **Step 1：完整替换 Register.tsx**

```tsx
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Bot, Eye, EyeOff } from 'lucide-react'
import { api } from '../api'

export default function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('密码至少 8 位')
      return
    }
    if (password !== confirmPassword) {
      setError('两次密码输入不一致')
      return
    }
    setLoading(true)
    try {
      await api.register(username, email, password)
      navigate('/login')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-700 hover:text-blue-600 transition-colors">
            <Bot size={22} strokeWidth={1.8} />
            <span className="font-semibold font-display text-[15px]">RAGflow 广场</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 mt-6 font-display">创建账号</h1>
          <p className="text-slate-500 text-sm mt-2">
            已有账号？
            <Link to="/login" className="text-blue-600 hover:underline font-medium ml-1">直接登录</Link>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm mb-5">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">用户名</label>
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="建议使用 OA 用户名"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">邮箱</label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="建议使用 OA 邮箱"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                密码
                <span className="text-slate-400 font-normal ml-1 text-xs">（至少 8 位）</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="至少 8 位"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">确认密码</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="再次输入密码"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors disabled:opacity-60 mt-1 cursor-pointer">
              {loading ? '注册中...' : '创建账号'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2：手动验证**

- 用户名/邮箱框显示 placeholder ✓
- 密码少于 8 位提交 → 前端报错 ✓
- 两次密码不一致 → 报错 ✓
- 重复用户名/邮箱注册 → 后端报错显示 ✓
- 眼睛图标正常切换两个密码框 ✓

- [ ] **Step 3：提交**

```bash
git add frontend/src/pages/Register.tsx
git commit -m "feat: 注册页 OA placeholder、密码 8 位、二次确认、显示切换"
```

---

## Task 7：前端 — 修改密码页面

**Files:**
- Create: `frontend/src/pages/ChangePassword.tsx`

- [ ] **Step 1：创建 ChangePassword.tsx**

```tsx
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Bot, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { api } from '../api'
import Navbar from '../components/Navbar'

function PasswordInput({
  label, value, onChange, autoComplete, placeholder
}: {
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          required
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (newPassword.length < 8) {
      setError('新密码至少 8 位')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('两次新密码输入不一致')
      return
    }
    setLoading(true)
    try {
      await api.changePassword(currentPassword, newPassword)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
              <ArrowLeft size={14} />
              返回首页
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-6 font-display">修改密码</h1>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            {success ? (
              <div className="text-center py-4">
                <p className="text-green-600 font-medium mb-4">密码修改成功！</p>
                <button
                  onClick={() => navigate('/')}
                  className="text-blue-600 hover:underline text-sm cursor-pointer">
                  返回首页
                </button>
              </div>
            ) : (
              <>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm mb-5">
                    {error}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <PasswordInput
                    label="当前密码"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    autoComplete="current-password"
                  />
                  <PasswordInput
                    label="新密码"
                    value={newPassword}
                    onChange={setNewPassword}
                    autoComplete="new-password"
                    placeholder="至少 8 位"
                  />
                  <PasswordInput
                    label="确认新密码"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    autoComplete="new-password"
                    placeholder="再次输入新密码"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors disabled:opacity-60 mt-1 cursor-pointer">
                    {loading ? '保存中...' : '保存修改'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2：提交**

```bash
git add frontend/src/pages/ChangePassword.tsx
git commit -m "feat: 新增修改密码页面"
```

---

## Task 8：前端 — 路由 + Navbar 入口

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Navbar.tsx`

- [ ] **Step 1：App.tsx 添加路由**

在 `import AdminUsers from './pages/AdminUsers'` 下方添加：

```tsx
import ChangePassword from './pages/ChangePassword'
```

在 `<Route path="/admin/users" .../>` 下方添加：

```tsx
<Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
```

- [ ] **Step 2：Navbar.tsx 添加修改密码入口**

在 `退出` 按钮前添加修改密码链接。找到 Navbar 中登录状态的导航部分，在退出按钮前插入：

```tsx
import { Link } from 'react-router-dom'
import { Bot, Plus, Settings, KeyRound } from 'lucide-react'
```

在 `{isAdmin && ...}` 块之后、`<Link to="/submit" ...>` 之前添加：

```tsx
<Link to="/change-password"
  className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
  <KeyRound size={14} />
  改密码
</Link>
```

- [ ] **Step 3：手动验证**

- 登录后 Navbar 显示"改密码"链接 ✓
- 点击跳转 /change-password ✓
- 未登录访问 /change-password → 重定向到登录页 ✓
- 修改密码成功 → 显示成功提示 ✓
- 当前密码错误 → 显示错误 ✓

- [ ] **Step 4：提交**

```bash
git add frontend/src/App.tsx frontend/src/components/Navbar.tsx
git commit -m "feat: 添加修改密码路由和 Navbar 入口"
```

---

## Task 9：管理员重置他人密码

**Files:**
- Modify: `backend/routers/admin.py`
- Modify: `frontend/src/api.ts`
- Modify: `frontend/src/pages/AdminUsers.tsx`

- [ ] **Step 1：后端新增重置密码接口**

在 `backend/routers/admin.py` 中添加：

```python
from backend.auth import hash_password

class ResetPasswordRequest(BaseModel):
    new_password: str

    @field_validator('new_password')
    @classmethod
    def min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('密码至少 8 位')
        return v


@router.post("/users/{user_id}/reset-password", status_code=204)
def reset_user_password(user_id: int, req: ResetPasswordRequest, _: AdminDep, session: SessionDep):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    user.password_hash = hash_password(req.new_password)
    session.add(user)
    session.commit()
```

注意：文件顶部需要补充 `from pydantic import field_validator`（如果尚未导入）。

- [ ] **Step 2：api.ts 新增 adminResetPassword**

```typescript
adminResetPassword: (userId: number, newPassword: string) =>
  request<void>(`/api/admin/users/${userId}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ new_password: newPassword }),
  }),
```

- [ ] **Step 3：AdminUsers.tsx 添加重置密码交互**

在 `AdminUsers.tsx` 中，为每行用户添加内联重置表单。在组件顶部增加状态：

```tsx
const [resetingId, setResetingId] = useState<number | null>(null)
const [resetPassword, setResetPassword] = useState('')
const [resetError, setResetError] = useState('')
```

在每行操作列 `</td>` 前追加重置密码按钮和内联表单。将操作列的 `<td>` 改为：

```tsx
<td className="px-4 py-3 text-right">
  <div className="flex flex-col items-end gap-2">
    <div className="flex items-center gap-2">
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
      <button
        onClick={() => { setResetingId(user.id); setResetPassword(''); setResetError('') }}
        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer">
        <KeyRound size={12} />
        重置密码
      </button>
    </div>
    {resetingId === user.id && (
      <div className="flex items-center gap-2 mt-1">
        <input
          type="text"
          value={resetPassword}
          onChange={e => setResetPassword(e.target.value)}
          placeholder="新密码（至少 8 位）"
          className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
        />
        <button
          onClick={() => handleResetPassword(user.id)}
          className="text-xs px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer">
          确认
        </button>
        <button
          onClick={() => setResetingId(null)}
          className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer">
          取消
        </button>
        {resetError && <span className="text-xs text-red-500">{resetError}</span>}
      </div>
    )}
  </div>
</td>
```

在组件内添加 `handleResetPassword` 函数（放在 `handleSetAdmin` 之后）：

```tsx
async function handleResetPassword(userId: number) {
  if (resetPassword.length < 8) {
    setResetError('密码至少 8 位')
    return
  }
  setResetError('')
  try {
    await api.adminResetPassword(userId, resetPassword)
    setResetingId(null)
    setResetPassword('')
  } catch (err: any) {
    setResetError(err.message)
  }
}
```

在 `AdminUsers.tsx` 顶部 import 中补充 `KeyRound`：

```tsx
import { ArrowLeft, ShieldCheck, ShieldOff, ClipboardList, Users, KeyRound } from 'lucide-react'
```

- [ ] **Step 4：手动验证**

- 用户列表每行显示"重置密码"按钮 ✓
- 点击后出现内联输入框 ✓
- 输入少于 8 位 → 显示错误 ✓
- 输入合法密码确认 → 成功，内联表单收起 ✓
- 用被重置密码的账号登录 → 成功 ✓

- [ ] **Step 5：提交**

```bash
git add backend/routers/admin.py frontend/src/api.ts frontend/src/pages/AdminUsers.tsx
git commit -m "feat: 管理员可在用户管理页重置他人密码"
```
