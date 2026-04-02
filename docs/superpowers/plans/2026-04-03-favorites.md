# 收藏功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为已登录用户提供私人收藏 Agent 的能力，并在首页通过"我的收藏"tab 快速过滤。

**Architecture:** 后端新增 `Favorite` 表（仿照 `Like` 表），提供 toggle 和 list 两个 API 端点；前端新增 `FavoriteButton` 组件，在 `AgentCard`（需 `stopPropagation`）和 `AgentDetail` 中使用；`Home.tsx` 新增"我的收藏"tab，通过 `favoritedIds` 在客户端过滤已加载的 Agent 列表，收藏模式下隐藏分页。

**Tech Stack:** Python / FastAPI / SQLModel（后端），React 19 / TypeScript / Lucide React（前端）

---

## 文件清单

| 操作 | 路径 | 说明 |
|------|------|------|
| 修改 | `backend/models.py` | 新增 `Favorite` 模型 |
| 新建 | `backend/routers/favorites.py` | toggle + list 两个端点 |
| 修改 | `backend/main.py` | 注册 favorites router |
| 修改 | `frontend/src/api.ts` | 新增 `toggleFavorite`、`listMyFavorites` |
| 新建 | `frontend/src/components/FavoriteButton.tsx` | 星形收藏按钮组件 |
| 修改 | `frontend/src/components/AgentCard.tsx` | 嵌入 FavoriteButton（需 stopPropagation） |
| 修改 | `frontend/src/pages/AgentDetail.tsx` | 嵌入 FavoriteButton |
| 修改 | `frontend/src/pages/Home.tsx` | 加载 favoritedIds + "我的收藏" tab |

---

## Task 1：后端 — 新增 Favorite 模型

**Files:**
- Modify: `backend/models.py`

- [ ] **Step 1：在 models.py 末尾追加 Favorite 类**

  打开 `backend/models.py`，在 `Like` 类之后追加：

  ```python
  class Favorite(SQLModel, table=True):
      __table_args__ = (UniqueConstraint("agent_id", "user_id"),)

      id: Optional[int] = Field(default=None, primary_key=True)
      agent_id: int = Field(foreign_key="agent.id", index=True)
      user_id: int = Field(foreign_key="user.id", index=True)
      created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
  ```

  `datetime` 和 `timezone` 已在文件顶部导入，无需额外修改 import。

- [ ] **Step 2：验证模型可正常导入**

  ```bash
  cd E:/ragflow-agent-web
  python -c "from backend.models import Favorite; print('OK')"
  ```

  Expected output: `OK`

- [ ] **Step 3：启动应用触发自动建表**

  ```bash
  uvicorn backend.main:app --reload --port 8000
  ```

  观察日志无报错，数据库自动新增 `favorite` 表（SQLModel 的 `create_db_and_tables` 在 startup 事件中执行）。确认后 Ctrl+C 停止。

- [ ] **Step 4：Commit**

  ```bash
  git add backend/models.py
  git commit -m "feat: add Favorite model"
  ```

---

## Task 2：后端 — 新增 favorites 路由

**Files:**
- Create: `backend/routers/favorites.py`

- [ ] **Step 1：创建 favorites.py**

  新建 `backend/routers/favorites.py`，内容如下：

  ```python
  from fastapi import APIRouter, HTTPException
  from pydantic import BaseModel
  from sqlmodel import select
  from backend.deps import SessionDep, CurrentUserDep
  from backend.models import Agent, Favorite

  router = APIRouter(tags=["favorites"])


  class FavoriteResponse(BaseModel):
      favorited: bool


  @router.post("/api/favorites/{agent_id}", response_model=FavoriteResponse)
  def toggle_favorite(agent_id: int, session: SessionDep, user_id: CurrentUserDep):
      agent = session.get(Agent, agent_id)
      if not agent:
          raise HTTPException(status_code=404, detail="Agent not found")

      existing = session.exec(
          select(Favorite).where(
              Favorite.agent_id == agent_id, Favorite.user_id == user_id
          )
      ).first()

      if existing:
          session.delete(existing)
          session.commit()
          return FavoriteResponse(favorited=False)
      else:
          fav = Favorite(agent_id=agent_id, user_id=user_id)
          session.add(fav)
          session.commit()
          return FavoriteResponse(favorited=True)


  @router.get("/api/favorites/me", response_model=list[int])
  def list_my_favorites(session: SessionDep, user_id: CurrentUserDep):
      rows = session.exec(
          select(Favorite.agent_id).where(Favorite.user_id == user_id)
      ).all()
      return list(rows)
  ```

- [ ] **Step 2：验证路由文件可导入**

  ```bash
  python -c "from backend.routers.favorites import router; print('OK')"
  ```

  Expected output: `OK`

- [ ] **Step 3：Commit**

  ```bash
  git add backend/routers/favorites.py
  git commit -m "feat: add favorites API endpoints"
  ```

---

## Task 3：后端 — 注册 favorites router

**Files:**
- Modify: `backend/main.py`

- [ ] **Step 1：在 main.py 中导入并注册 favorites router**

  打开 `backend/main.py`，在 `from backend.routers import likes as likes_router` 后面添加一行：

  ```python
  from backend.routers import favorites as favorites_router
  ```

  在 `app.include_router(likes_router.router)` 后面添加：

  ```python
  app.include_router(favorites_router.router)
  ```

- [ ] **Step 2：启动应用，用 curl 手动验证端点可达**

  ```bash
  uvicorn backend.main:app --reload --port 8000
  ```

  新开终端（需先登录获取 token）：

  ```bash
  # 登录获取 token（替换为真实用户名密码）
  TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"login":"your@email.com","password":"yourpassword"}' | python -c "import sys,json; print(json.load(sys.stdin)['token'])")

  # 测试收藏 agent_id=1
  curl -s -X POST http://localhost:8000/api/favorites/1 \
    -H "Authorization: Bearer $TOKEN"
  # Expected: {"favorited": true}

  # 再次点击取消收藏
  curl -s -X POST http://localhost:8000/api/favorites/1 \
    -H "Authorization: Bearer $TOKEN"
  # Expected: {"favorited": false}

  # 查询我的收藏列表
  curl -s http://localhost:8000/api/favorites/me \
    -H "Authorization: Bearer $TOKEN"
  # Expected: []
  ```

- [ ] **Step 3：Commit**

  ```bash
  git add backend/main.py
  git commit -m "feat: register favorites router"
  ```

---

## Task 4：前端 — 新增 API 方法

**Files:**
- Modify: `frontend/src/api.ts`

- [ ] **Step 1：在 api.ts 的 `api` 对象中新增两个方法**

  在 `toggleLike` 方法之后添加：

  ```typescript
  toggleFavorite: (agentId: number) =>
    request<{ favorited: boolean }>(`/api/favorites/${agentId}`, {
      method: 'POST',
    }),

  listMyFavorites: () =>
    request<number[]>('/api/favorites/me'),
  ```

- [ ] **Step 2：验证 TypeScript 编译无报错**

  ```bash
  cd frontend
  npx tsc --noEmit
  ```

  Expected: 无输出（无报错）

- [ ] **Step 3：Commit**

  ```bash
  git add frontend/src/api.ts
  git commit -m "feat: add toggleFavorite and listMyFavorites API methods"
  ```

---

## Task 5：前端 — 新建 FavoriteButton 组件

**Files:**
- Create: `frontend/src/components/FavoriteButton.tsx`

- [ ] **Step 1：创建 FavoriteButton.tsx**

  新建 `frontend/src/components/FavoriteButton.tsx`：

  ```tsx
  import { useState, useRef, useEffect } from 'react'
  import { Star } from 'lucide-react'
  import { Link } from 'react-router-dom'
  import { api } from '../api'

  interface Props {
    agentId: number
    initialFavorited: boolean
  }

  export default function FavoriteButton({ agentId, initialFavorited }: Props) {
    const [favorited, setFavorited] = useState(initialFavorited)
    const [loading, setLoading] = useState(false)
    const [showTip, setShowTip] = useState(false)
    const tipTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const token = localStorage.getItem('token')

    useEffect(() => {
      return () => { if (tipTimer.current) clearTimeout(tipTimer.current) }
    }, [])

    async function handleClick(e: React.MouseEvent) {
      e.preventDefault()
      e.stopPropagation()

      if (!token) {
        setShowTip(true)
        if (tipTimer.current) clearTimeout(tipTimer.current)
        tipTimer.current = setTimeout(() => setShowTip(false), 3000)
        return
      }
      if (loading) return
      setLoading(true)
      const prev = favorited
      setFavorited(!prev)
      try {
        const data = await api.toggleFavorite(agentId)
        setFavorited(data.favorited)
      } catch {
        setFavorited(prev)
      } finally {
        setLoading(false)
      }
    }

    return (
      <div className="relative">
        <button
          onClick={handleClick}
          disabled={loading}
          title={favorited ? '取消收藏' : '收藏'}
          className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-colors cursor-pointer ${
            favorited
              ? 'bg-amber-50 border-amber-300 text-amber-500'
              : 'border-slate-200 text-slate-400 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-400'
          }`}>
          <Star size={15} fill={favorited ? 'currentColor' : 'none'} strokeWidth={favorited ? 2 : 1.5} />
        </button>

        {showTip && (
          <div className="absolute bottom-full left-0 mb-2 whitespace-nowrap bg-slate-800 text-white text-xs rounded-lg px-3 py-2 flex items-center gap-2 shadow-lg z-10">
            <span>登录后才能收藏</span>
            <Link
              to="/login"
              className="text-blue-300 hover:text-blue-200 font-medium underline underline-offset-2">
              去登录
            </Link>
            <div className="absolute top-full left-4 border-4 border-transparent border-t-slate-800" />
          </div>
        )}
      </div>
    )
  }
  ```

- [ ] **Step 2：验证 TypeScript 编译无报错**

  ```bash
  cd frontend
  npx tsc --noEmit
  ```

  Expected: 无输出

- [ ] **Step 3：Commit**

  ```bash
  git add frontend/src/components/FavoriteButton.tsx
  git commit -m "feat: add FavoriteButton component"
  ```

---

## Task 6：前端 — AgentCard 集成 FavoriteButton

**Files:**
- Modify: `frontend/src/components/AgentCard.tsx`

> **注意：** `AgentCard` 的整个卡片都包在 `<Link>` 里，因此 `FavoriteButton` 内部的 `handleClick` 已调用 `e.preventDefault()` + `e.stopPropagation()`，可阻止跳转。

`AgentCard` 目前不知道某个 Agent 是否已被收藏，需要通过 props 传入。

- [ ] **Step 1：修改 AgentCard 的 Props 接口，新增 `favoritedIds` 参数**

  找到 `interface Props` 部分，修改为：

  ```tsx
  interface Props {
    agent: Agent
    favoritedIds?: number[]
  }
  ```

  修改函数签名：

  ```tsx
  export default function AgentCard({ agent, favoritedIds = [] }: Props) {
  ```

- [ ] **Step 2：引入 FavoriteButton 并在卡片右上角渲染**

  在文件顶部 import 区域新增：

  ```tsx
  import FavoriteButton from './FavoriteButton'
  ```

  找到卡片顶部横幅区域，现有代码是：

  ```tsx
  {/* 点赞数 */}
  <div className="absolute top-3 right-3 flex items-center gap-1 text-slate-500 text-xs">
    <ThumbsUp size={11} />
    <span>{agent.likes_count}</span>
  </div>
  ```

  替换为：

  ```tsx
  {/* 点赞数 + 收藏 */}
  <div className="absolute top-2 right-2 flex items-center gap-1.5">
    <div className="flex items-center gap-1 text-slate-500 text-xs bg-white/70 backdrop-blur-sm rounded-md px-1.5 py-0.5">
      <ThumbsUp size={11} />
      <span>{agent.likes_count}</span>
    </div>
    <FavoriteButton agentId={agent.id} initialFavorited={favoritedIds.includes(agent.id)} />
  </div>
  ```

- [ ] **Step 3：验证 TypeScript 编译无报错**

  ```bash
  cd frontend
  npx tsc --noEmit
  ```

  Expected: 无输出

- [ ] **Step 4：Commit**

  ```bash
  git add frontend/src/components/AgentCard.tsx
  git commit -m "feat: add FavoriteButton to AgentCard"
  ```

---

## Task 7：前端 — AgentDetail 集成 FavoriteButton

**Files:**
- Modify: `frontend/src/pages/AgentDetail.tsx`

- [ ] **Step 1：引入 FavoriteButton 并添加 `favorited` 状态**

  在 `AgentDetail.tsx` 顶部 import 区域新增：

  ```tsx
  import FavoriteButton from '../components/FavoriteButton'
  ```

  在组件内 `const [notFound, setNotFound] = useState(false)` 之后新增：

  ```tsx
  const [favorited, setFavorited] = useState(false)
  ```

- [ ] **Step 2：在加载 Agent 时同步拉取收藏状态**

  找到 `useEffect` 中的 `Promise.all`，在其后面（`.finally()` 之后）追加收藏状态加载逻辑：

  ```tsx
  Promise.all([api.getAgent(agentId), api.listComments(agentId)])
    .then(([a, c]) => { setAgent(a); setComments(c) })
    .catch(() => setNotFound(true))
    .finally(() => setLoading(false))

  const token = localStorage.getItem('token')
  if (token) {
    api.listMyFavorites()
      .then(ids => setFavorited(ids.includes(agentId)))
      .catch(() => {})
  }
  ```

- [ ] **Step 3：在操作区加入 FavoriteButton**

  找到详情页的操作区：

  ```tsx
  <div className="flex items-center gap-3 pt-1">
    <LikeButton agentId={agent.id} initialCount={agent.likes_count} />
    <a href={agent.url} ...>
  ```

  在 `<LikeButton>` 后面添加 `<FavoriteButton>`：

  ```tsx
  <div className="flex items-center gap-3 pt-1">
    <LikeButton agentId={agent.id} initialCount={agent.likes_count} />
    <FavoriteButton agentId={agent.id} initialFavorited={favorited} />
    <a href={agent.url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
      去使用
      <ExternalLink size={13} />
    </a>
  </div>
  ```

- [ ] **Step 4：验证 TypeScript 编译无报错**

  ```bash
  cd frontend
  npx tsc --noEmit
  ```

  Expected: 无输出

- [ ] **Step 5：Commit**

  ```bash
  git add frontend/src/pages/AgentDetail.tsx
  git commit -m "feat: add FavoriteButton to AgentDetail"
  ```

---

## Task 8：前端 — Home.tsx 加"我的收藏"tab

**Files:**
- Modify: `frontend/src/pages/Home.tsx`

- [ ] **Step 1：新增 `favoritedIds` 状态和 `showFavorites` tab 状态**

  在 `const [loading, setLoading] = useState(true)` 之后新增：

  ```tsx
  const [favoritedIds, setFavoritedIds] = useState<number[]>([])
  const [showFavorites, setShowFavorites] = useState(false)
  const token = localStorage.getItem('token')
  ```

- [ ] **Step 2：登录后自动拉取收藏列表**

  在现有 `useEffect`（监听 `query`、`page`）**之后**，新增一个独立 `useEffect`：

  ```tsx
  useEffect(() => {
    if (!token) return
    api.listMyFavorites().then(setFavoritedIds).catch(() => {})
  }, [token])
  ```

- [ ] **Step 3：在搜索栏下方加筛选 tab**

  找到 `{/* Content */}` 区域开头：

  ```tsx
  <main className="max-w-6xl mx-auto px-4 py-8">
  ```

  在 `<main>` 标签里、`{loading ?` 之前插入：

  ```tsx
  {token && (
    <div className="flex gap-2 mb-6">
      <button
        onClick={() => setShowFavorites(false)}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
          !showFavorites
            ? 'bg-blue-600 text-white'
            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}>
        全部
      </button>
      <button
        onClick={() => setShowFavorites(true)}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
          showFavorites
            ? 'bg-amber-500 text-white'
            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}>
        <span>⭐</span>
        我的收藏
      </button>
    </div>
  )}
  ```

- [ ] **Step 4：在 favorites 模式下过滤 Agent 列表，并将 favoritedIds 传给 AgentCard**

  找到渲染 Agent 列表的部分：

  ```tsx
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
    {agents.map(agent => <AgentCard key={agent.id} agent={agent} />)}
  </div>
  ```

  替换为：

  ```tsx
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
    {(showFavorites ? agents.filter(a => favoritedIds.includes(a.id)) : agents)
      .map(agent => <AgentCard key={agent.id} agent={agent} favoritedIds={favoritedIds} />)}
  </div>
  ```

- [ ] **Step 5：收藏模式下隐藏分页，并显示空状态文案**

  找到空状态部分：

  ```tsx
  {query ? `没有找到与"${query}"相关的智能体` : '还没有智能体，快来分享第一个吧！'}
  ```

  替换为：

  ```tsx
  {showFavorites
    ? '还没有收藏任何智能体'
    : query
      ? `没有找到与"${query}"相关的智能体`
      : '还没有智能体，快来分享第一个吧！'}
  ```

  找到分页区域，将条件从 `{totalPages > 1 && (` 改为：

  ```tsx
  {!showFavorites && totalPages > 1 && (
  ```

- [ ] **Step 6：验证 TypeScript 编译无报错**

  ```bash
  cd frontend
  npx tsc --noEmit
  ```

  Expected: 无输出

- [ ] **Step 7：Commit**

  ```bash
  git add frontend/src/pages/Home.tsx
  git commit -m "feat: add favorites filter tab to Home"
  ```

---

## Task 9：端到端手动验证

- [ ] **Step 1：启动前后端**

  ```bash
  # 后端（根目录）
  uvicorn backend.main:app --reload --port 8000

  # 前端（frontend 目录）
  cd frontend && npm run dev
  ```

  访问 `http://localhost:5173`

- [ ] **Step 2：验证核心流程**

  1. **未登录**：Agent 卡片右上角显示空心星，点击星形出现"登录后才能收藏 / 去登录"提示
  2. **登录后**：首页显示"全部 / ⭐ 我的收藏"tab
  3. **收藏操作**：点击某 Agent 卡片上的星形 → 变为金色实心；切换到"我的收藏"tab → 只显示该 Agent
  4. **取消收藏**：再次点击星形 → 变回空心；"我的收藏"列表为空，显示"还没有收藏任何智能体"
  5. **详情页**：进入 Agent 详情，星形按钮状态与首页一致；在详情页收藏/取消收藏正常工作
  6. **跨刷新持久化**：收藏后刷新页面，首页卡片和详情页的星形状态正确恢复

- [ ] **Step 3：最终 commit（如有遗留改动）**

  ```bash
  git status
  # 确认无未提交改动
  ```
