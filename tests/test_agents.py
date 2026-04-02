from unittest.mock import patch, AsyncMock, MagicMock


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


def test_parse_requires_auth(client):
    resp = client.post("/api/agents/parse", json={"url": "http://rag.local/next-chats/share?shared_id=abc&from=chat&auth=tok"})
    assert resp.status_code == 403


def test_parse_chat_link(client):
    token = _register_and_login(client, "u3", "u3@test.com")
    headers = {"Authorization": f"Bearer {token}"}

    mock_response = {"code": 0, "data": {"title": "My Chat", "prologue": "Hello!", "avatar": ""}}

    with patch("backend.routers.agents.httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client_cls.return_value.__aenter__.return_value = mock_client
        mock_resp = MagicMock()
        mock_resp.json.return_value = mock_response
        mock_resp.status_code = 200
        mock_client.get.return_value = mock_resp

        resp = client.post(
            "/api/agents/parse",
            json={"url": "http://rag.local/next-chats/share?shared_id=abc123&from=chat&auth=token123"},
            headers=headers,
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "My Chat"
    assert data["description"] == "Hello!"


def test_parse_invalid_url(client):
    token = _register_and_login(client, "u4", "u4@test.com")
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.post(
        "/api/agents/parse",
        json={"url": "not-a-valid-ragflow-url"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["error"] is not None
