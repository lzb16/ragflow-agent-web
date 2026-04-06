# RAGFlow Agent Hub

RAGFlow Agent Hub 是一个 AI Agent 展示与社区互动平台，用户可以浏览、点赞、收藏和评论各类 AI Agent。

## 功能特性

- 用户注册/登录（JWT 认证）
- Agent 展示：浏览 Agent 列表与详情
- 社区互动：点赞、收藏、评论
- 管理后台：管理员可创建/编辑/删除 Agent，自定义头像上传
- 响应式前端，支持移动端

## 技术栈

| 层| 技术 |
|---|------|
| 后端 | Python · FastAPI · SQLModel · SQLite|
| 前端 | React 19 · TypeScript · Vite · Tailwind CSS 4|
| 部署 | Docker（多阶段构建） |

## 快速开始

###1. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`：

```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-password
SECRET_KEY=your-jwt-secret
DATABASE_URL=sqlite:///./data.db
```

### 2. Docker 部署（推荐）

```bash
docker compose up -d
```

访问 http://localhost:8000

### 3. 本地开发

```bash
# 后端
pip install -r requirements.txt
uvicorn backend.main:app --reload

# 前端
cd frontend
npm install
npm run dev
```

## 项目结构

```
├── backend/
│   ├── routers/        # API 路由（agents,auth, likes, favorites, comments, admin）
│   ├── auth.py         #认证工具
│   ├── config.py       # 配置
│   ├── database.py     # 数据库初始化
│   ├── deps.py         # 依赖注入
│   ├── main.py         # FastAPI 入口
│   └── models.py       # 数据模型（User, Agent, Like, Favorite,Comment）
├── frontend/src/
│   ├── pages/          # 页面组件
│   ├── components/     # 通用组件
│   └── api.ts          # API 客户端
├──Dockerfile          # 多阶段构建
├── docker-compose.yml
└── requirements.txt
```

## License

MIT
