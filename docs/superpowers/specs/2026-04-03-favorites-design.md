# 收藏功能设计规格

**日期**：2026-04-03  
**状态**：已确认，待实现

---

## 概述

为 RAGFlow Agent Hub 增加收藏功能，允许已登录用户将感兴趣的 Agent 加入私人收藏夹，并在首页通过筛选 tab 快速查看收藏列表。收藏数据与账号绑定，跨设备同步。

---

## 功能范围

- 已登录用户可在 Agent 卡片和 Agent 详情页对任意已审核 Agent 进行收藏/取消收藏
- 收藏为私人数据，不公开展示数量，其他用户不可见
- 首页提供"我的收藏"筛选 tab，仅登录用户可见
- 未登录用户点击收藏按钮时提示"请先登录"
- 不新增独立页面

---

## 数据层

### 后端：新增 `Favorite` 表

文件：`backend/models.py`

```python
class Favorite(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    agent_id: int = Field(foreign_key="agent.id", index=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    __table_args__ = (UniqueConstraint("agent_id", "user_id"),)
```

结构仿照现有 `Like` 表，额外保留 `created_at` 以备未来按收藏时间排序。

### 后端：新增路由

文件：`backend/routers/favorites.py`，在 `main.py` 中注册。

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| `POST` | `/api/favorites/{agent_id}` | 必须 | 切换收藏状态，返回 `{ "favorited": bool }` |
| `GET` | `/api/favorites/me` | 必须 | 返回当前用户收藏的 agent_id 数组 |

未登录请求均返回 401。

---

## 前端层

### API 客户端

文件：`frontend/src/api.ts`，新增两个方法：

```typescript
toggleFavorite(agentId: number): Promise<{ favorited: boolean }>
listMyFavorites(): Promise<number[]>
```

### 新增组件：`FavoriteButton.tsx`

文件：`frontend/src/components/FavoriteButton.tsx`

行为：
- **未登录**：点击弹出提示"请先登录"，与 `LikeButton` 处理方式一致
- **未收藏**：灰色空心星形图标（Lucide `Star`），hover 变金色
- **已收藏**：金色实心星形图标，hover 变灰（暗示可取消）
- **乐观更新**：点击后立即切换本地状态；API 失败时回滚并提示"操作失败，请重试"

Props：

```typescript
interface FavoriteButtonProps {
  agentId: number
  initialFavorited: boolean
}
```

### 改动现有组件

**`AgentCard.tsx`**：在操作区（点赞按钮旁）加入 `FavoriteButton`，传入 `agentId` 和初始收藏状态。

**`AgentDetail.tsx`**：在详情页操作区（点赞按钮旁）加入 `FavoriteButton`。

**`Home.tsx`**：
- 已登录时，进入首页后台静默调用 `listMyFavorites()`，将结果存入组件状态（`favoritedIds: number[]`）
- 在搜索栏下方加筛选条：`全部` | `⭐ 我的收藏`，仅登录用户可见
- 切换到"我的收藏"时，将分页参数重置，调用 `listAgents()` 并在前端以 `favoritedIds` 过滤；若收藏数较多可考虑后端支持 `favorite_ids` 过滤参数，但 MVP 阶段以前端过滤为准

---

## 边界情况

| 场景 | 处理方式 |
|------|---------|
| Agent 被删除/下架 | `listAgents()` 自然不返回该 Agent，收藏列表中不会出现，无需额外处理 |
| 未登录 | 不展示"我的收藏"tab，点击星形按钮提示登录 |
| API 失败 | 乐观更新回滚 + toast 提示 |
| 重复收藏 | 后端 UniqueConstraint 兜底，前端按钮状态防止重复触发 |

---

## 不在此次范围内

- 收藏夹排序、分组
- 收藏数公开展示
- 独立"我的收藏"页面
- 匿名收藏
