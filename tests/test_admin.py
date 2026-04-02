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
