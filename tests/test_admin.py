from backend.auth import create_token


def _make_admin_token():
    return create_token({"sub": "999", "is_admin": True})


def _make_user_token():
    return create_token({"sub": "1", "is_admin": False})


def _submit_agent(client, token):
    headers = {"Authorization": f"Bearer {token}"}
    return client.post("/api/agents", data={"name": "ReviewMe", "url": "http://rag.local"}, headers=headers).json()["id"]


def test_admin_list_pending(client):
    user_token = _make_user_token()
    agent_id = _submit_agent(client, user_token)

    admin_headers = {"Authorization": f"Bearer {_make_admin_token()}"}
    resp = client.get("/api/admin/agents?status=pending", headers=admin_headers)
    assert resp.status_code == 200
    assert any(a["id"] == agent_id for a in resp.json()["items"])


def test_non_admin_cannot_access(client):
    user_token = _make_user_token()
    headers = {"Authorization": f"Bearer {user_token}"}
    resp = client.get("/api/admin/agents", headers=headers)
    assert resp.status_code == 403


def test_approve_agent(client):
    user_token = _make_user_token()
    agent_id = _submit_agent(client, user_token)

    admin_headers = {"Authorization": f"Bearer {_make_admin_token()}"}
    resp = client.post(f"/api/admin/agents/{agent_id}/approve", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "approved"

    # approved 后出现在公开列表
    list_resp = client.get("/api/agents")
    assert any(a["id"] == agent_id for a in list_resp.json()["items"])


def test_reject_agent(client):
    user_token = _make_user_token()
    agent_id = _submit_agent(client, user_token)

    admin_headers = {"Authorization": f"Bearer {_make_admin_token()}"}
    resp = client.post(f"/api/admin/agents/{agent_id}/reject", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"


import os
from unittest.mock import patch
from sqlmodel import Session, select
from backend.models import User


def test_seed_admin_creates_user_when_env_set(engine):
    """启动时若环境变量存在且用户不在 DB，应创建管理员账号"""
    from backend.main import seed_admin
    from backend import database

    database.engine = engine
    with patch.dict(os.environ, {"ADMIN_EMAIL": "seed@example.com", "ADMIN_PASSWORD": "seedpass"}):
        seed_admin()

    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == "seed@example.com")).first()
    assert user is not None
    assert user.is_admin is True
    assert user.username == "admin"


def test_seed_admin_skips_when_no_env(engine):
    """未设置 ADMIN_EMAIL 时不创建任何用户"""
    from backend.main import seed_admin
    from backend import database

    database.engine = engine
    env = {k: v for k, v in os.environ.items() if k not in ("ADMIN_EMAIL", "ADMIN_PASSWORD")}
    with patch.dict(os.environ, env, clear=True):
        seed_admin()

    with Session(engine) as session:
        count = len(session.exec(select(User)).all())
    assert count == 0


def test_seed_admin_skips_when_user_exists(engine):
    """邮箱已存在时不重复创建，也不覆盖"""
    from backend.main import seed_admin
    from backend import database
    from backend.auth import hash_password

    database.engine = engine
    with Session(engine) as session:
        existing = User(username="original", email="seed@example.com",
                        password_hash=hash_password("original"), is_admin=False)
        session.add(existing)
        session.commit()

    with patch.dict(os.environ, {"ADMIN_EMAIL": "seed@example.com", "ADMIN_PASSWORD": "newpass"}):
        seed_admin()

    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == "seed@example.com")).first()
    assert user.username == "original"   # 未被覆盖
    assert user.is_admin is False        # 未被提升
