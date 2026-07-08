"""
Integration tests for authentication endpoints.
Requires a running PostgreSQL and Redis (provided by CI service containers).
"""
import pytest
from httpx import AsyncClient, ASGITransport

from deploypilot.main import app
from deploypilot.core.database import Base, engine


@pytest.fixture(autouse=True, scope="module")
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as c:
        yield c


class TestRegistration:
    async def test_register_new_user(self, client):
        resp = await client.post("/api/v1/auth/register", json={
            "email": "alice@example.com",
            "username": "alice",
            "display_name": "Alice Smith",
            "password": "SecurePass1!",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "alice@example.com"
        assert "hashed_password" not in data

    async def test_duplicate_email_rejected(self, client):
        payload = {
            "email": "bob@example.com",
            "username": "bob",
            "display_name": "Bob Jones",
            "password": "SecurePass1!",
        }
        await client.post("/api/v1/auth/register", json=payload)
        resp = await client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 409

    async def test_weak_password_rejected(self, client):
        resp = await client.post("/api/v1/auth/register", json={
            "email": "carol@example.com",
            "username": "carol",
            "display_name": "Carol",
            "password": "abc",
        })
        assert resp.status_code == 422


class TestLogin:
    async def test_valid_credentials_return_tokens(self, client):
        # Register first
        await client.post("/api/v1/auth/register", json={
            "email": "dave@example.com",
            "username": "dave",
            "display_name": "Dave",
            "password": "Password1!",
        })
        resp = await client.post("/api/v1/auth/login", json={
            "email": "dave@example.com",
            "password": "Password1!",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    async def test_wrong_password_rejected(self, client):
        resp = await client.post("/api/v1/auth/login", json={
            "email": "dave@example.com",
            "password": "WrongPassword!",
        })
        assert resp.status_code == 401

    async def test_me_endpoint_requires_auth(self, client):
        resp = await client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    async def test_me_endpoint_with_valid_token(self, client):
        # Get token
        login = await client.post("/api/v1/auth/login", json={
            "email": "dave@example.com",
            "password": "Password1!",
        })
        token = login.json()["access_token"]

        resp = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["email"] == "dave@example.com"
