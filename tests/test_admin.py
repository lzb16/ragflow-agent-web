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


def _register_user(client, username, email, password="pass1234"):
    resp = client.post("/api/auth/register", json={
        "username": username, "email": email, "password": password
    })
    assert resp.status_code == 200
    return resp.json()["id"]


def test_admin_list_users(client, session):
    """管理员可获取全部用户列表"""
    from backend.models import User
    from backend.auth import hash_password, create_token

    # 创建管理员用户（is_admin=True）
    admin_user = User(username="adm", email="adm@test.com",
                      password_hash=hash_password("x"), is_admin=True)
    session.add(admin_user)
    session.commit()
    session.refresh(admin_user)

    token = create_token({"sub": str(admin_user.id), "is_admin": True})
    headers = {"Authorization": f"Bearer {token}"}

    # 创建普通用户
    _register_user(client, "alice", "alice@test.com")

    resp = client.get("/api/admin/users", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert len(data["items"]) >= 2
    item = data["items"][0]
    assert "id" in item
    assert "username" in item
    assert "email" in item
    assert "is_admin" in item
    assert "created_at" in item


def test_non_admin_cannot_list_users(client):
    """普通用户无法访问用户列表"""
    from backend.auth import create_token
    token = create_token({"sub": "1", "is_admin": False})
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/admin/users", headers=headers)
    assert resp.status_code == 403


def test_set_admin_promote(client, session):
    """管理员可将普通用户提升为管理员"""
    from backend.models import User
    from backend.auth import hash_password, create_token

    admin_user = User(username="adm2", email="adm2@test.com",
                      password_hash=hash_password("x"), is_admin=True)
    session.add(admin_user)
    session.commit()
    session.refresh(admin_user)

    token = create_token({"sub": str(admin_user.id), "is_admin": True})
    headers = {"Authorization": f"Bearer {token}"}

    target_id = _register_user(client, "bob", "bob@test.com")

    resp = client.patch(f"/api/admin/users/{target_id}/set-admin",
                        json={"is_admin": True}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["is_admin"] is True


def test_set_admin_demote(client, session):
    """管理员可撤销他人的管理员权限"""
    from backend.models import User
    from backend.auth import hash_password, create_token

    admin_user = User(username="adm3", email="adm3@test.com",
                      password_hash=hash_password("x"), is_admin=True)
    other_admin = User(username="adm4", email="adm4@test.com",
                       password_hash=hash_password("x"), is_admin=True)
    session.add(admin_user)
    session.add(other_admin)
    session.commit()
    session.refresh(admin_user)
    session.refresh(other_admin)

    token = create_token({"sub": str(admin_user.id), "is_admin": True})
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.patch(f"/api/admin/users/{other_admin.id}/set-admin",
                        json={"is_admin": False}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["is_admin"] is False


def test_set_admin_cannot_change_self(client, session):
    """管理员不能修改自己的管理员状态"""
    from backend.models import User
    from backend.auth import hash_password, create_token

    admin_user = User(username="adm5", email="adm5@test.com",
                      password_hash=hash_password("x"), is_admin=True)
    session.add(admin_user)
    session.commit()
    session.refresh(admin_user)

    token = create_token({"sub": str(admin_user.id), "is_admin": True})
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.patch(f"/api/admin/users/{admin_user.id}/set-admin",
                        json={"is_admin": False}, headers=headers)
    assert resp.status_code == 400
    assert "Cannot change your own admin status" in resp.json()["detail"]


def test_set_admin_user_not_found(client, session):
    """目标用户不存在时返回 404"""
    from backend.models import User
    from backend.auth import hash_password, create_token

    admin_user = User(username="adm6", email="adm6@test.com",
                      password_hash=hash_password("x"), is_admin=True)
    session.add(admin_user)
    session.commit()
    session.refresh(admin_user)

    token = create_token({"sub": str(admin_user.id), "is_admin": True})
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.patch("/api/admin/users/99999/set-admin",
                        json={"is_admin": True}, headers=headers)
    assert resp.status_code == 404


def test_delete_agent(client):
    user_token = _make_user_token()
    agent_id = _submit_agent(client, user_token)

    admin_headers = {"Authorization": f"Bearer {_make_admin_token()}"}
    resp = client.delete(f"/api/admin/agents/{agent_id}", headers=admin_headers)
    assert resp.status_code == 204

    # 确认已被删除
    list_resp = client.get("/api/admin/agents", headers=admin_headers)
    assert not any(a["id"] == agent_id for a in list_resp.json()["items"])


def test_delete_agent_not_found(client):
    admin_headers = {"Authorization": f"Bearer {_make_admin_token()}"}
    resp = client.delete("/api/admin/agents/99999", headers=admin_headers)
    assert resp.status_code == 404
