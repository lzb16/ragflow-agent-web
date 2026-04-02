import os
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

# 使用内存数据库测试
TEST_DATABASE_URL = "sqlite://"

@pytest.fixture(name="engine")
def engine_fixture():
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="session")
def session_fixture(engine):
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(engine):
    from backend.main import app
    from backend.deps import get_session
    from backend import database

    # Override the database engine for testing
    database.engine = engine

    def get_session_override():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = get_session_override

    # Trigger startup events manually
    for callback in app.router.on_startup:
        callback()

    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_token():
    from backend.auth import create_token
    return create_token({"sub": "1", "is_admin": True})


@pytest.fixture
def user_token():
    from backend.auth import create_token
    return create_token({"sub": "2", "is_admin": False})
