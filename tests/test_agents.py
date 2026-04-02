def _register_and_login(client, username="user1", email="u1@test.com", password="pass123"):
    client.post("/api/auth/register", json={"username": username, "email": email, "password": password})
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    return resp.json()["token"]


def test_list_agents_empty(client):
    resp = client.get("/api/agents")
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["total"] == 0


def test_submit_agent_requires_auth(client):
    resp = client.post("/api/agents", data={"name": "Test", "url": "http://x.com"})
    assert resp.status_code == 403


def test_submit_and_list_agent(client):
    token = _register_and_login(client)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post(
        "/api/agents",
        data={"name": "My Agent", "url": "http://rag.local/share?shared_id=abc"},
        headers=headers,
    )
    assert resp.status_code == 200
    agent = resp.json()
    assert agent["name"] == "My Agent"
    assert agent["status"] == "pending"

    # pending 状态不出现在公开列表
    list_resp = client.get("/api/agents")
    assert list_resp.json()["total"] == 0


def test_get_agent_detail(client):
    token = _register_and_login(client, "u2", "u2@test.com")
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.post(
        "/api/agents",
        data={"name": "Detail Agent", "url": "http://rag.local/share?shared_id=xyz"},
        headers=headers,
    )
    agent_id = resp.json()["id"]

    detail = client.get(f"/api/agents/{agent_id}")
    assert detail.status_code == 200
    assert detail.json()["name"] == "Detail Agent"
