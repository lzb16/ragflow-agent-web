from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from backend.database import create_db_and_tables
from backend.routers import auth as auth_router
from backend.routers import agents as agents_router
from backend.routers import likes as likes_router

app = FastAPI(title="RAGflow Agent Hub")


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


app.include_router(auth_router.router)
app.include_router(agents_router.router)
app.include_router(likes_router.router)
