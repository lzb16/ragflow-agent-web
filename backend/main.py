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
