from fastapi import FastAPI
from backend.database import create_db_and_tables

app = FastAPI(title="RAGflow Agent Hub")


@app.on_event("startup")
def on_startup():
    create_db_and_tables()
