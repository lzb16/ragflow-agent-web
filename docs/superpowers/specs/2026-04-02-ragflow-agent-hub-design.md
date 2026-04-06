# RAGflow 智能体分享站 — 设计文档

**日期**：2026-04-02  
**状态**：待实现

---

## 概述

一个供用户分享和发现 RAGflow 智能体链接的社区站点。用户需登录才能提交智能体或发表评论；提交后需管理员审核才能上线；支持关键词搜索、点赞和评论功能。

---

## 一、技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Python + FastAPI + SQLite（SQLModel ORM） |
| 认证 | JWT（python-jose），7 天有效期 |
| 前端 | React + TypeScript + Vite |
| 托管 | FastAPI 托管编译后的 React 静态文件，单进程运行 |
| 部署 | 自托管，`uvicorn backend.main:app` |

---

## 二、项目结构

```
ragflow-agent-web/
├── backend/
│   ├── main.py              # FastAPI 入口，挂载静态文件与路由
│   ├── database.py          # SQLite 连接 + SQLModel 初始化
│   ├── auth.py              # JWT 工具函数（生成、校验）
│   ├── models.py            # 数据模型（User, Agent, Comment, Like）
│   ├── deps.py              # 依赖注入（当前用户、管理员校验）
│   └── routers/
│       ├── auth.py          # 注册、登录
│       ├── agents.py        # 智能体 CRUD + 链接解析
│       ├── comments.py      # 评论
│       ├── likes.py         # 点赞
│       └── admin.py         # 管理员审核
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx         # 首页：搜索 + 卡片列表
│   │   │   ├── AgentDetail.tsx  # 详情页：信息 + 点赞 + 评论
│   │   │   ├── Submit.tsx       # 提交页：链接解析 + 表单
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   └── Admin.tsx        # 管理员审核后台
│   │   ├── components/
│   │   │   ├── AgentCard.tsx    # 智能体卡片
│   │   │   ├── SearchBar.tsx    # 搜索框
│   │   │   ├── LikeButton.tsx   # 点赞按钮
│   │   │   ├── CommentList.tsx
│   │   │   ├── CommentForm.tsx
│   │   │   └── ProtectedRoute.tsx  # 未登录重定向
│   │   ├── api.ts               # 统一 fetch 封装（自动带 JWT）
│   │   └── main.tsx
│   ├── index.html
│   └── dist/                    # 编译产物（FastAPI 托管）
├── uploads/
│   └── avatars/                 # 头像图片存储
└── data.db                      # SQLite 数据文件
```

---

## 三、数据模型

### User
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int PK | |
| username | str unique | |
| email | str unique | |
| password_hash | str | bcrypt |
| is_admin | bool | 默认 false |
| created_at | datetime | |

### Agent
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int PK | |
| name | str | 必填 |
| url | str | 必填，RAGflow 分享链接 |
| description | str \| None | 可选，解析自 prologue |
| tags | str \| None | 可选，逗号分隔 |
| avatar_path | str \| None | 可选，uploads/avatars/ 下的相对路径 |
| usage_guide | str \| None | 可选 |
| status | enum | pending / approved / rejected |
| submitter_id | int FK→User | |
| likes_count | int | 冗余计数，避免每次 COUNT |
| created_at | datetime | |

### Comment
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int PK | |
| content | str | |
| agent_id | int FK→Agent | |
| user_id | int FK→User | |
| created_at | datetime | |

### Like
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int PK | |
| agent_id | int FK→Agent | |
| user_id | int FK→User | |
| — | unique(agent_id, user_id) | 每人只能点赞一次 |

---

## 四、API 路由

```
# 认证
POST /api/auth/register          # 注册
POST /api/auth/login             # 登录，返回 JWT

# 智能体（公开）
GET  /api/agents                 # 搜索，?q=关键词&page=1，仅返回 approved
GET  /api/agents/{id}            # 详情

# 智能体（需登录）
POST /api/agents/parse           # 解析分享链接，返回预填数据
POST /api/agents                 # 提交智能体（multipart，含头像文件）

# 点赞（需登录）
POST /api/agents/{id}/like       # 点赞；已点则取消

# 评论（公开读，登录写）
GET  /api/agents/{id}/comments
POST /api/agents/{id}/comments   # 需登录

# 管理员（需 is_admin）
GET  /api/admin/agents           # ?status=pending
POST /api/admin/agents/{id}/approve
POST /api/admin/agents/{id}/reject
```

---

## 五、链接解析

**触发**：用户在提交页粘贴链接后点击"解析"按钮。

**流程**：
1. 前端将链接 POST 到 `/api/agents/parse`
2. 后端解析 URL 参数：`from`、`shared_id`、`auth`
3. 根据 `from` 选择端点：
   - `chat` → `GET {host}/api/v1/chatbots/{shared_id}/info`（Header: `Authorization: Bearer {auth}`）
   - `agent` → `GET {host}/api/v1/agentbots/{shared_id}/inputs`（Header: `Authorization: Bearer {auth}`）
4. 提取返回数据中的 `title`、`prologue`、`avatar`（base64）
5. 将 `title`、`prologue`、`avatar`（base64 data URL）返回给前端
6. 前端将 `title` 填入名称、`prologue` 填入描述、base64 转为预览图填入头像上传框（用户可预览并替换）；头像文件在用户点"提交"时随表单一起上传

**失败处理**：解析失败（网络不通、URL 格式错误、RAGflow 返回错误）时返回提示"解析失败，请手动填写"，不阻断提交流程。

---

## 六、认证流程

- 登录成功后返回 JWT，前端存入 `localStorage`
- `api.ts` 封装所有请求，自动在 Header 加 `Authorization: Bearer <token>`
- token 有效期 7 天；过期时后端返回 401，前端跳转 `/login`，登录后回跳原页
- `ProtectedRoute` 组件：未登录时重定向 `/login`
- 管理员路由：JWT payload 含 `is_admin` 字段，后端 admin 路由依赖注入校验，非管理员返回 403

---

## 七、头像存储

- 提交智能体时通过 `multipart/form-data` 上传图片
- 后端保存到 `uploads/avatars/{uuid}.{ext}`
- 数据库 `avatar_path` 存相对路径
- FastAPI 通过 `StaticFiles` 挂载 `/uploads` 目录对外提供访问
- 解析链接时，base64 avatar 由后端解码并以 base64 data URL 形式返回给前端，前端转为 File 填入上传框；最终用户点提交时才真正上传保存

---

## 八、前端页面说明

| 页面 | 核心功能 |
|------|---------|
| 首页 `/` | 搜索框 + 智能体卡片列表，按点赞数降序，分页 |
| 详情页 `/agents/{id}` | 头像、名称、描述、标签、使用说明、"去使用"按钮（跳转 RAGflow 链接）、点赞、评论区 |
| 提交页 `/submit` | 粘贴链接 → 点"解析" → 表单预填 → 上传头像 → 提交；需登录 |
| 登录 `/login` | 邮箱 + 密码 |
| 注册 `/register` | 用户名 + 邮箱 + 密码 |
| 管理后台 `/admin` | 待审核列表，每条显示名称/链接/提交者，支持通过或拒绝；需 is_admin |

---

## 九、错误处理

| 场景 | 处理方式 |
|------|---------|
| 链接解析失败 | 提示"解析失败，请手动填写"，表单正常可用 |
| 搜索无结果 | 显示空状态提示 |
| 未登录访问受保护页 | 跳转 `/login`，带 `redirect` 参数，登录后跳回 |
| 非管理员访问 `/admin` | 后端 403，前端跳回首页 |
| 上传文件过大 | 后端限制 5MB，返回 400 |
