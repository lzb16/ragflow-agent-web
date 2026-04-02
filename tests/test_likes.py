def _setup(client):
    client.post("/api/auth/register", json={"username": "liker", "email": "liker@test.com", "password": "pass"})
    token = client.post("/api/auth/login", json={"email": "liker@test.com", "password": "pass"}).json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    agent_resp = client.post("/api/agents", data={"name": "Likeable", "url": "http://x.com"}, headers=headers)
    return token, headers, agent_resp.json()["id"]


def test_like_agent(client):
    token, headers, agent_id = _setup(client)
    resp = client.post(f"/api/agents/{agent_id}/like", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["likes_count"] == 1
    assert resp.json()["liked"] is True


def test_unlike_agent(client):
    token, headers, agent_id = _setup(client)
    client.post(f"/api/agents/{agent_id}/like", headers=headers)
    resp = client.post(f"/api/agents/{agent_id}/like", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["likes_count"] == 0
    assert resp.json()["liked"] is False


def test_like_requires_auth(client):
    _, headers, agent_id = _setup(client)
    resp = client.post(f"/api/agents/{agent_id}/like")
    assert resp.status_code == 403
