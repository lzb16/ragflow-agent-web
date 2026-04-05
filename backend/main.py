import os
from dotenv import load_dotenv
load_dotenv()
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
    from sqlalchemy.exc import IntegrityError
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
        try:
            session.commit()
        except IntegrityError:
            session.rollback()


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
