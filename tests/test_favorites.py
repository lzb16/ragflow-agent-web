from backend.auth import create_token


def _make_admin_token():
    return create_token({"sub": "999", "is_admin": True})


def _setup(client):
    """注册用户，提交并审核通过一个 Agent，返回 (user_headers, agent_id)。"""
    client.post("/api/auth/register", json={"username": "fav_user", "email": "fav@test.com", "password": "pass1234"})
    token = client.post("/api/auth/login", json={"login": "fav@test.com", "password": "pass1234"}).json()["token"]
    user_headers = {"Authorization": f"Bearer {token}"}

    agent_id = client.post(
        "/api/agents", data={"name": "Fav Agent", "url": "http://rag.local"}, headers=user_headers
    ).json()["id"]

    # 审核通过才能收藏
    admin_headers = {"Authorization": f"Bearer {_make_admin_token()}"}
    client.post(f"/api/admin/agents/{agent_id}/approve", headers=admin_headers)

    return user_headers, agent_id


def test_toggle_favorite_add(client):
    """第一次收藏应返回 favorited=True。"""
    user_headers, agent_id = _setup(client)
    resp = client.post(f"/api/favorites/{agent_id}", headers=user_headers)
    assert resp.status_code == 200
    assert resp.json()["favorited"] is True


def test_toggle_favorite_remove(client):
    """再次收藏同一个 Agent 应取消，返回 favorited=False。"""
    user_headers, agent_id = _setup(client)
    client.post(f"/api/favorites/{agent_id}", headers=user_headers)
    resp = client.post(f"/api/favorites/{agent_id}", headers=user_headers)
    assert resp.status_code == 200
    assert resp.json()["favorited"] is False


def test_favorite_requires_auth(client):
    """未登录用户尝试收藏应返回 403。"""
    _, agent_id = _setup(client)
    resp = client.post(f"/api/favorites/{agent_id}")
    assert resp.status_code == 403


def test_favorite_pending_agent_returns_404(client):
    """pending 状态的 Agent 不可收藏，应返回 404。"""
    client.post("/api/auth/register", json={"username": "fav_user2", "email": "fav2@test.com", "password": "pass1234"})
    token = client.post("/api/auth/login", json={"login": "fav2@test.com", "password": "pass1234"}).json()["token"]
    user_headers = {"Authorization": f"Bearer {token}"}

    agent_id = client.post(
        "/api/agents", data={"name": "Pending Agent", "url": "http://rag.local/2"}, headers=user_headers
    ).json()["id"]

    resp = client.post(f"/api/favorites/{agent_id}", headers=user_headers)
    assert resp.status_code == 404


def test_list_my_favorites(client):
    """收藏后 /api/favorites/me 应包含该 Agent 的 id。"""
    user_headers, agent_id = _setup(client)
    client.post(f"/api/favorites/{agent_id}", headers=user_headers)
    resp = client.get("/api/favorites/me", headers=user_headers)
    assert resp.status_code == 200
    assert agent_id in resp.json()


def test_list_my_favorites_after_untoggle(client):
    """取消收藏后 /api/favorites/me 不应再包含该 Agent 的 id。"""
    user_headers, agent_id = _setup(client)
    client.post(f"/api/favorites/{agent_id}", headers=user_headers)
    client.post(f"/api/favorites/{agent_id}", headers=user_headers)
    resp = client.get("/api/favorites/me", headers=user_headers)
    assert resp.status_code == 200
    assert agent_id not in resp.json()


def test_list_favorites_requires_auth(client):
    """未登录用户访问 /api/favorites/me 应返回 403。"""
    resp = client.get("/api/favorites/me")
    assert resp.status_code == 403
