# RAGFlow Agent Web

RAGFlow Agent Web 是一个基于 [RAGFlow](https://github.com/infiniflow/ragflow) 的轻量级 Web 客户端，提供对话式 AI 助手交互界面。

## 功能特性

- 对话交互：支持流式响应的实时聊天
- 多助手支持：可配置 Chat 和 Agent 两种类型的助手
- 对话历史：自动保存和管理聊天记录
- 收藏功能：收藏常用助手，快速访问
- 头像上传：自定义助手头像
- Markdown 渲染：支持代码高亮和 GFM 格式

## 技术栈

**后端：** Python + FastAPI + SQLite (aiosqlite)  
**前端：** React 18 + TypeScript + Vite + Tailwind CSS  
**部署：** Docker

## 快速开始

### 环境准备

1. 复制环境变量配置：

```bash
cp .env.example .env
```

2. 编辑 `.env` 填入你的 RAGFlow 服务信息：

```env
RAGFLOW_API_URL=http://your-ragflow-server/api
RAGFLOW_API_KEY=your-api-key-here
RAGFLOW_CHAT_ASSISTANT_ID=your-assistant-id
RAGFLOW_AGENT_ASSISTANT_ID=your-agent-id
```

### Docker 部署（推荐）

```bash
docker compose up -d
```

访问 http://localhost:8000

### 本地开发

后端：

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

前端：

```bash
cd frontend
npm install
npm run dev
```

## 项目结构

```
├── backend/
│   ├── api/            # API 路由（assistants, chat, favorites, upload）
│   ├── config.py       # 配置管理
│   ├── database.py     # 数据库初始化
│   ├── main.py         # FastAPI 应用入口
│   └── models.py       # 数据模型
├── frontend/
│   └── src/            # React 前端源码
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

## License

MIT