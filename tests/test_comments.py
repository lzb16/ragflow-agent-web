def _setup(client):
    client.post("/api/auth/register", json={"username": "commenter", "email": "c@test.com", "password": "pass"})
    token = client.post("/api/auth/login", json={"email": "c@test.com", "password": "pass"}).json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    agent_id = client.post("/api/agents", data={"name": "Commented", "url": "http://x.com"}, headers=headers).json()["id"]
    return token, headers, agent_id


def test_list_comments_empty(client):
    _, _, agent_id = _setup(client)
    resp = client.get(f"/api/agents/{agent_id}/comments")
    assert resp.status_code == 200
    assert resp.json() == []


def test_post_comment(client):
    _, headers, agent_id = _setup(client)
    resp = client.post(
        f"/api/agents/{agent_id}/comments",
        json={"content": "Great agent!"},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["content"] == "Great agent!"
    assert "created_at" in data


def test_comment_requires_auth(client):
    _, _, agent_id = _setup(client)
    resp = client.post(f"/api/agents/{agent_id}/comments", json={"content": "No auth"})
    assert resp.status_code == 403


def test_list_comments_after_post(client):
    _, headers, agent_id = _setup(client)
    client.post(f"/api/agents/{agent_id}/comments", json={"content": "First"}, headers=headers)
    client.post(f"/api/agents/{agent_id}/comments", json={"content": "Second"}, headers=headers)
    resp = client.get(f"/api/agents/{agent_id}/comments")
    assert resp.status_code == 200
    assert len(resp.json()) == 2
