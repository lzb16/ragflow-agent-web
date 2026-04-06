# ---- Stage 1: 构建前端 ----
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npx tsc -b && npx vite build


# ---- Stage 2: 运行后端（含前端静态文件）----
FROM python:3.12-slim

WORKDIR /app

# 安装 Python 依赖
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY backend/ ./backend/

# 从构建阶段复制前端产物
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

# 创建持久化目录
RUN mkdir -p uploads/avatars

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
