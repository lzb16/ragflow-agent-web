def test_register(client):
    resp = client.post("/api/auth/register", json={
        "username": "alice",
        "email": "alice@example.com",
        "password": "secret123"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == "alice"
    assert "password" not in data


def test_register_duplicate_email(client):
    client.post("/api/auth/register", json={
        "username": "alice",
        "email": "alice@example.com",
        "password": "secret123"
    })
    resp = client.post("/api/auth/register", json={
        "username": "alice2",
        "email": "alice@example.com",
        "password": "secret123"
    })
    assert resp.status_code == 400


def test_login(client):
    client.post("/api/auth/register", json={
        "username": "bob",
        "email": "bob@example.com",
        "password": "mypassword"
    })
    resp = client.post("/api/auth/login", json={
        "email": "bob@example.com",
        "password": "mypassword"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert "is_admin" in data


def test_login_wrong_password(client):
    client.post("/api/auth/register", json={
        "username": "carol",
        "email": "carol@example.com",
        "password": "correct"
    })
    resp = client.post("/api/auth/login", json={
        "email": "carol@example.com",
        "password": "wrong"
    })
    assert resp.status_code == 401
