"""
Backend test suite for Dropa (audit).

Runs against an in-memory MongoDB mock (mongomock_motor) instead of a real
MongoDB/Docker instance, because Docker Desktop's daemon could not be started
in this sandboxed Windows environment. The mock implements the MongoDB query
language faithfully enough to exercise all the business logic below; it is
not a substitute for a final smoke test against a real MongoDB instance
before shipping.

Run with:  backend/venv/Scripts/python.exe -m pytest backend/test_server.py -v
"""
import os
import sys
import asyncio
from datetime import datetime, timedelta, timezone

os.environ.setdefault('MONGO_URL', 'mongodb://localhost:27017')
os.environ.setdefault('DB_NAME', 'dropa_test')
os.environ.setdefault('JWT_SECRET', 'test-secret')

sys.path.insert(0, os.path.dirname(__file__))

import pytest
import pytest_asyncio
import jwt as pyjwt
from httpx import AsyncClient, ASGITransport
from mongomock_motor import AsyncMongoMockClient

import server


@pytest_asyncio.fixture(autouse=True)
async def fresh_db():
    """Give every test a clean in-memory database."""
    mock_client = AsyncMongoMockClient()
    server.db = mock_client['dropa_test']
    server.client = mock_client
    await server.create_indexes()
    yield server.db


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=server.app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def register(client, username="alice", email="alice@example.com", password="Password123"):
    return await client.post("/api/auth/register", json={
        "username": username, "email": email, "password": password
    })


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ==================== AUTH ====================

@pytest.mark.asyncio
async def test_register_valid(client):
    r = await register(client)
    assert r.status_code == 200
    body = r.json()
    assert body["user"]["username"] == "alice"
    assert body["user"]["email"] == "alice@example.com"
    assert "access_token" in body


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    await register(client, username="alice", email="dup@example.com")
    r = await register(client, username="alice2", email="dup@example.com")
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_register_duplicate_username(client):
    await register(client, username="alice", email="a1@example.com")
    r = await register(client, username="alice", email="a2@example.com")
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_register_short_password_rejected(client):
    r = await client.post("/api/auth/register", json={
        "username": "bob", "email": "bob@example.com", "password": "short"
    })
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_register_short_username_rejected(client):
    r = await client.post("/api/auth/register", json={
        "username": "ab", "email": "ab@example.com", "password": "Password123"
    })
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_validation_error_detail_is_always_a_string(client):
    """
    Regression test: FastAPI's default 422 handler returns `detail` as a list
    of {type, loc, msg, input, ctx} objects, which crashes the frontend
    (authStore.ts renders `error.response.data.detail` directly as text).
    Our custom exception_handler must normalize it to a plain string for
    every validation failure, not just this one endpoint.
    """
    r = await client.post("/api/auth/register", json={
        "username": "ab", "email": "not-an-email", "password": "short"
    })
    assert r.status_code == 422
    assert isinstance(r.json()["detail"], str)

    reg = await register(client)
    token = reg.json()["access_token"]
    r = await client.post("/api/drops", json={"media_type": "not-image-or-video"}, headers=auth_headers(token))
    assert r.status_code == 422
    assert isinstance(r.json()["detail"], str)


@pytest.mark.asyncio
async def test_login_valid(client):
    await register(client)
    r = await client.post("/api/auth/login", json={"email": "alice@example.com", "password": "Password123"})
    assert r.status_code == 200
    assert "access_token" in r.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await register(client)
    r = await client.post("/api/auth/login", json={"email": "alice@example.com", "password": "WrongPass1"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email(client):
    r = await client.post("/api/auth/login", json={"email": "ghost@example.com", "password": "Password123"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_no_token(client):
    r = await client.get("/api/auth/me")
    assert r.status_code in (401, 403)  # HTTPBearer: no credentials supplied


@pytest.mark.asyncio
async def test_protected_route_invalid_token(client):
    r = await client.get("/api/auth/me", headers=auth_headers("not-a-real-jwt"))
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_expired_token(client):
    reg = await register(client)
    user_id = reg.json()["user"]["id"]
    expired_payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) - timedelta(hours=1),
        'iat': datetime.now(timezone.utc) - timedelta(hours=2),
    }
    expired_token = pyjwt.encode(expired_payload, server.JWT_SECRET, algorithm=server.JWT_ALGORITHM)
    r = await client.get("/api/auth/me", headers=auth_headers(expired_token))
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_tampered_token(client):
    reg = await register(client)
    user_id = reg.json()["user"]["id"]
    forged = pyjwt.encode({'user_id': user_id, 'exp': datetime.now(timezone.utc) + timedelta(hours=1)},
                           'wrong-secret', algorithm=server.JWT_ALGORITHM)
    r = await client.get("/api/auth/me", headers=auth_headers(forged))
    assert r.status_code == 401


# ==================== PROFILE ====================

@pytest.mark.asyncio
async def test_update_profile_username_and_bio(client):
    reg = await register(client)
    token = reg.json()["access_token"]
    r = await client.put("/api/profile", json={"username": "alice2", "bio": "hello world"}, headers=auth_headers(token))
    assert r.status_code == 200
    assert r.json()["username"] == "alice2"
    assert r.json()["bio"] == "hello world"


@pytest.mark.asyncio
async def test_update_profile_username_taken(client):
    await register(client, username="bob", email="bob@example.com")
    reg = await register(client, username="alice", email="alice@example.com")
    token = reg.json()["access_token"]
    r = await client.put("/api/profile", json={"username": "bob"}, headers=auth_headers(token))
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_update_profile_bio_too_long_rejected(client):
    reg = await register(client)
    token = reg.json()["access_token"]
    r = await client.put("/api/profile", json={"bio": "x" * 301}, headers=auth_headers(token))
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_get_profile_others_email_hidden(client):
    reg_a = await register(client, username="alice", email="alice@example.com")
    reg_b = await register(client, username="bob", email="bob@example.com")
    token_a = reg_a.json()["access_token"]
    bob_id = reg_b.json()["user"]["id"]
    r = await client.get(f"/api/profile/{bob_id}", headers=auth_headers(token_a))
    assert r.status_code == 200
    assert r.json()["email"] == ""  # must not leak bob's email to alice
    assert r.json()["username"] == "bob"


@pytest.mark.asyncio
async def test_get_profile_own_email_visible(client):
    reg_a = await register(client, username="alice", email="alice@example.com")
    token_a = reg_a.json()["access_token"]
    alice_id = reg_a.json()["user"]["id"]
    r = await client.get(f"/api/profile/{alice_id}", headers=auth_headers(token_a))
    assert r.json()["email"] == "alice@example.com"


@pytest.mark.asyncio
async def test_get_profile_invalid_id_400_not_500(client):
    reg = await register(client)
    token = reg.json()["access_token"]
    r = await client.get("/api/profile/not-an-object-id", headers=auth_headers(token))
    assert r.status_code == 400


# ==================== FRIENDS ====================

@pytest.mark.asyncio
async def test_search_users(client):
    reg_a = await register(client, username="alice", email="alice@example.com")
    await register(client, username="bobby", email="bobby@example.com")
    token_a = reg_a.json()["access_token"]
    r = await client.get("/api/users/search?q=bob", headers=auth_headers(token_a))
    assert r.status_code == 200
    assert any(u["username"] == "bobby" for u in r.json())


@pytest.mark.asyncio
async def test_search_users_regex_injection_safe(client):
    reg_a = await register(client, username="alice", email="alice@example.com")
    token_a = reg_a.json()["access_token"]
    # Malicious regex metacharacters must not crash the endpoint (500) or match everything.
    r = await client.get("/api/users/search?q=" + "(a+)+$", headers=auth_headers(token_a))
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_friend_request_and_accept_bidirectional(client):
    reg_a = await register(client, username="alice", email="alice@example.com")
    reg_b = await register(client, username="bob", email="bob@example.com")
    token_a, token_b = reg_a.json()["access_token"], reg_b.json()["access_token"]
    bob_id = reg_b.json()["user"]["id"]

    r = await client.post(f"/api/friends/request/{bob_id}", headers=auth_headers(token_a))
    assert r.status_code == 200

    r = await client.get("/api/friends/requests", headers=auth_headers(token_b))
    requests = r.json()
    assert len(requests) == 1
    req_id = requests[0]["id"]

    r = await client.post(f"/api/friends/accept/{req_id}", headers=auth_headers(token_b))
    assert r.status_code == 200

    r = await client.get("/api/friends", headers=auth_headers(token_a))
    assert any(f["username"] == "bob" for f in r.json())
    r = await client.get("/api/friends", headers=auth_headers(token_b))
    assert any(f["username"] == "alice" for f in r.json())


@pytest.mark.asyncio
async def test_friend_request_duplicate_rejected(client):
    reg_a = await register(client, username="alice", email="alice@example.com")
    reg_b = await register(client, username="bob", email="bob@example.com")
    token_a = reg_a.json()["access_token"]
    bob_id = reg_b.json()["user"]["id"]
    await client.post(f"/api/friends/request/{bob_id}", headers=auth_headers(token_a))
    r = await client.post(f"/api/friends/request/{bob_id}", headers=auth_headers(token_a))
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_friend_request_self_rejected(client):
    reg_a = await register(client, username="alice", email="alice@example.com")
    token_a = reg_a.json()["access_token"]
    alice_id = reg_a.json()["user"]["id"]
    r = await client.post(f"/api/friends/request/{alice_id}", headers=auth_headers(token_a))
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_reject_friend_request(client):
    reg_a = await register(client, username="alice", email="alice@example.com")
    reg_b = await register(client, username="bob", email="bob@example.com")
    token_a, token_b = reg_a.json()["access_token"], reg_b.json()["access_token"]
    bob_id = reg_b.json()["user"]["id"]
    await client.post(f"/api/friends/request/{bob_id}", headers=auth_headers(token_a))
    reqs = (await client.get("/api/friends/requests", headers=auth_headers(token_b))).json()
    r = await client.post(f"/api/friends/reject/{reqs[0]['id']}", headers=auth_headers(token_b))
    assert r.status_code == 200
    friends = (await client.get("/api/friends", headers=auth_headers(token_a))).json()
    assert friends == []


async def _make_friends(client, token_a, token_b, b_id):
    await client.post(f"/api/friends/request/{b_id}", headers=auth_headers(token_a))
    reqs = (await client.get("/api/friends/requests", headers=auth_headers(token_b))).json()
    await client.post(f"/api/friends/accept/{reqs[0]['id']}", headers=auth_headers(token_b))


@pytest.mark.asyncio
async def test_drops_of_non_friend_forbidden(client):
    reg_a = await register(client, username="alice", email="alice@example.com")
    reg_b = await register(client, username="bob", email="bob@example.com")
    token_a = reg_a.json()["access_token"]
    bob_id = reg_b.json()["user"]["id"]
    r = await client.get(f"/api/drops/user/{bob_id}", headers=auth_headers(token_a))
    assert r.status_code == 403


# ==================== DROPS ====================

@pytest.mark.asyncio
async def test_create_drop_requires_media(client):
    reg = await register(client)
    token = reg.json()["access_token"]
    r = await client.post("/api/drops", json={"media_type": "image", "description": "no media"}, headers=auth_headers(token))
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_create_drop_with_base64_image_no_imagekit(client):
    reg = await register(client)
    token = reg.json()["access_token"]
    r = await client.post("/api/drops", json={
        "media_data": "ZmFrZWJhc2U2NA==", "media_type": "image", "description": "hi"
    }, headers=auth_headers(token))
    assert r.status_code == 200
    body = r.json()
    assert body["is_revealed"] is False
    # The create response goes only to the uploader themselves (their own media,
    # which they already have on-device) - unlike the feed, it is not redacted.
    assert body["media_data"] == "ZmFrZWJhc2U2NA=="


@pytest.mark.asyncio
async def test_create_drop_with_media_url_video(client):
    reg = await register(client)
    token = reg.json()["access_token"]
    r = await client.post("/api/drops", json={
        "media_url": "https://ik.imagekit.io/dropa/videos/x.mp4", "media_type": "video"
    }, headers=auth_headers(token))
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_feed_hides_media_before_reveal_and_shows_after(client, fresh_db):
    reg = await register(client)
    token, user_id = reg.json()["access_token"], reg.json()["user"]["id"]

    # Drop revealed in the future (normal creation path)
    r = await client.post("/api/drops", json={"media_data": "Zm9v", "media_type": "image"}, headers=auth_headers(token))
    drop_id = r.json()["id"]

    feed = (await client.get("/api/drops/feed", headers=auth_headers(token))).json()
    assert feed[0]["is_revealed"] is False
    assert feed[0]["media_data"] == ""

    # Force the reveal_date into the past directly in the DB to simulate "after Sunday 20:00 UTC"
    await fresh_db.drops.update_one(
        {'_id': server.ObjectId(drop_id)},
        {'$set': {'reveal_date': (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()}}
    )
    feed = (await client.get("/api/drops/feed", headers=auth_headers(token))).json()
    assert feed[0]["is_revealed"] is True
    assert feed[0]["media_data"] == "Zm9v"


@pytest.mark.asyncio
async def test_like_blocked_before_reveal(client):
    reg = await register(client)
    token = reg.json()["access_token"]
    r = await client.post("/api/drops", json={"media_data": "Zm9v", "media_type": "image"}, headers=auth_headers(token))
    drop_id = r.json()["id"]
    r = await client.post(f"/api/drops/{drop_id}/like", headers=auth_headers(token))
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_like_toggle_after_reveal(client, fresh_db):
    reg = await register(client)
    token = reg.json()["access_token"]
    r = await client.post("/api/drops", json={"media_data": "Zm9v", "media_type": "image"}, headers=auth_headers(token))
    drop_id = r.json()["id"]
    await fresh_db.drops.update_one({'_id': server.ObjectId(drop_id)},
                                     {'$set': {'reveal_date': (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()}})
    r1 = await client.post(f"/api/drops/{drop_id}/like", headers=auth_headers(token))
    assert r1.json()["action"] == "liked"
    r2 = await client.post(f"/api/drops/{drop_id}/like", headers=auth_headers(token))
    assert r2.json()["action"] == "unliked"


@pytest.mark.asyncio
async def test_comment_blocked_before_reveal(client):
    reg = await register(client)
    token = reg.json()["access_token"]
    r = await client.post("/api/drops", json={"media_data": "Zm9v", "media_type": "image"}, headers=auth_headers(token))
    drop_id = r.json()["id"]
    r = await client.post(f"/api/drops/{drop_id}/comments", json={"content": "nice"}, headers=auth_headers(token))
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_comment_after_reveal(client, fresh_db):
    reg = await register(client)
    token = reg.json()["access_token"]
    r = await client.post("/api/drops", json={"media_data": "Zm9v", "media_type": "image"}, headers=auth_headers(token))
    drop_id = r.json()["id"]
    await fresh_db.drops.update_one({'_id': server.ObjectId(drop_id)},
                                     {'$set': {'reveal_date': (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()}})
    r = await client.post(f"/api/drops/{drop_id}/comments", json={"content": "nice"}, headers=auth_headers(token))
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_comment_blank_rejected(client, fresh_db):
    reg = await register(client)
    token = reg.json()["access_token"]
    r = await client.post("/api/drops", json={"media_data": "Zm9v", "media_type": "image"}, headers=auth_headers(token))
    drop_id = r.json()["id"]
    await fresh_db.drops.update_one({'_id': server.ObjectId(drop_id)},
                                     {'$set': {'reveal_date': (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()}})
    r = await client.post(f"/api/drops/{drop_id}/comments", json={"content": "   "}, headers=auth_headers(token))
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_comment_too_long_rejected(client, fresh_db):
    reg = await register(client)
    token = reg.json()["access_token"]
    r = await client.post("/api/drops", json={"media_data": "Zm9v", "media_type": "image"}, headers=auth_headers(token))
    drop_id = r.json()["id"]
    await fresh_db.drops.update_one({'_id': server.ObjectId(drop_id)},
                                     {'$set': {'reveal_date': (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()}})
    r = await client.post(f"/api/drops/{drop_id}/comments", json={"content": "x" * 501}, headers=auth_headers(token))
    assert r.status_code == 422


# ==================== MESSAGING ====================

@pytest.mark.asyncio
async def test_conversation_with_non_friend_forbidden(client):
    reg_a = await register(client, username="alice", email="alice@example.com")
    reg_b = await register(client, username="bob", email="bob@example.com")
    token_a = reg_a.json()["access_token"]
    bob_id = reg_b.json()["user"]["id"]
    r = await client.post(f"/api/conversations/{bob_id}", headers=auth_headers(token_a))
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_message_send_and_order(client):
    reg_a = await register(client, username="alice", email="alice@example.com")
    reg_b = await register(client, username="bob", email="bob@example.com")
    token_a, token_b = reg_a.json()["access_token"], reg_b.json()["access_token"]
    bob_id = reg_b.json()["user"]["id"]
    await _make_friends(client, token_a, token_b, bob_id)

    conv = (await client.post(f"/api/conversations/{bob_id}", headers=auth_headers(token_a))).json()
    conv_id = conv["id"]

    await client.post(f"/api/conversations/{conv_id}/messages", json={"content": "hello"}, headers=auth_headers(token_a))
    await client.post(f"/api/conversations/{conv_id}/messages", json={"content": "hi back"}, headers=auth_headers(token_b))

    msgs = (await client.get(f"/api/conversations/{conv_id}/messages", headers=auth_headers(token_a))).json()
    assert [m["content"] for m in msgs] == ["hello", "hi back"]


@pytest.mark.asyncio
async def test_message_blank_rejected(client):
    reg_a = await register(client, username="alice", email="alice@example.com")
    reg_b = await register(client, username="bob", email="bob@example.com")
    token_a, token_b = reg_a.json()["access_token"], reg_b.json()["access_token"]
    bob_id = reg_b.json()["user"]["id"]
    await _make_friends(client, token_a, token_b, bob_id)
    conv = (await client.post(f"/api/conversations/{bob_id}", headers=auth_headers(token_a))).json()
    r = await client.post(f"/api/conversations/{conv['id']}/messages", json={"content": ""}, headers=auth_headers(token_a))
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_conversation_invalid_id_400(client):
    reg = await register(client)
    token = reg.json()["access_token"]
    r = await client.get("/api/conversations/not-an-id/messages", headers=auth_headers(token))
    assert r.status_code == 400


# ==================== STREAK ====================

@pytest.mark.asyncio
async def test_first_drop_sets_streak_1(client):
    reg = await register(client)
    token = reg.json()["access_token"]
    await client.post("/api/drops", json={"media_data": "Zm9v", "media_type": "image"}, headers=auth_headers(token))
    details = (await client.get("/api/streak/details", headers=auth_headers(token))).json()
    assert details["current_streak"] == 1
    assert details["max_streak"] == 1


@pytest.mark.asyncio
async def test_consecutive_day_increments_streak(client, fresh_db):
    reg = await register(client)
    token, user_id = reg.json()["access_token"], reg.json()["user"]["id"]
    yesterday = (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()
    await fresh_db.users.update_one({'_id': server.ObjectId(user_id)},
                                     {'$set': {'streak': 1, 'max_streak': 1, 'last_drop_date': yesterday}})
    await client.post("/api/drops", json={"media_data": "Zm9v", "media_type": "image"}, headers=auth_headers(token))
    details = (await client.get("/api/streak/details", headers=auth_headers(token))).json()
    assert details["current_streak"] == 2


@pytest.mark.asyncio
async def test_gap_resets_streak(client, fresh_db):
    reg = await register(client)
    token, user_id = reg.json()["access_token"], reg.json()["user"]["id"]
    three_days_ago = (datetime.now(timezone.utc).date() - timedelta(days=3)).isoformat()
    await fresh_db.users.update_one({'_id': server.ObjectId(user_id)},
                                     {'$set': {'streak': 5, 'max_streak': 5, 'last_drop_date': three_days_ago}})
    await client.post("/api/drops", json={"media_data": "Zm9v", "media_type": "image"}, headers=auth_headers(token))
    details = (await client.get("/api/streak/details", headers=auth_headers(token))).json()
    assert details["current_streak"] == 1
    assert details["max_streak"] == 5  # max_streak must not be reset


@pytest.mark.asyncio
async def test_same_day_second_drop_does_not_change_streak(client):
    reg = await register(client)
    token = reg.json()["access_token"]
    await client.post("/api/drops", json={"media_data": "Zm9v", "media_type": "image"}, headers=auth_headers(token))
    await client.post("/api/drops", json={"media_data": "YmFy", "media_type": "image"}, headers=auth_headers(token))
    details = (await client.get("/api/streak/details", headers=auth_headers(token))).json()
    assert details["current_streak"] == 1


@pytest.mark.asyncio
async def test_milestone_awarded_exactly_once(client, fresh_db):
    reg = await register(client)
    token, user_id = reg.json()["access_token"], reg.json()["user"]["id"]
    # Put the user one drop away from the 3-day milestone
    await fresh_db.users.update_one({'_id': server.ObjectId(user_id)},
                                     {'$set': {'streak': 2, 'max_streak': 2,
                                               'last_drop_date': (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()}})
    await client.post("/api/drops", json={"media_data": "Zm9v", "media_type": "image"}, headers=auth_headers(token))
    details = (await client.get("/api/streak/details", headers=auth_headers(token))).json()
    assert details["current_streak"] == 3
    assert details["streak_freezes"] == 1  # 3-day milestone reward

    # Calling the milestone-awarding logic again at the same streak must not re-award.
    user_doc = await fresh_db.users.find_one({'_id': server.ObjectId(user_id)})
    result = await fresh_db.users.update_one(
        {'_id': server.ObjectId(user_id), 'awarded_milestones': {'$ne': 3}},
        {'$inc': {'streak_freezes': 1}, '$push': {'awarded_milestones': 3}}
    )
    assert result.modified_count == 0
    details2 = (await client.get("/api/streak/details", headers=auth_headers(token))).json()
    assert details2["streak_freezes"] == 1  # unchanged


@pytest.mark.asyncio
async def test_milestone_race_condition_only_awards_once(client, fresh_db):
    """Simulate two concurrent requests crossing the same milestone threshold."""
    reg = await register(client)
    user_id = reg.json()["user"]["id"]
    await fresh_db.users.update_one({'_id': server.ObjectId(user_id)}, {'$set': {'streak': 3, 'max_streak': 3}})

    async def try_award():
        return await fresh_db.users.update_one(
            {'_id': server.ObjectId(user_id), 'awarded_milestones': {'$ne': 3}},
            {'$inc': {'streak_freezes': 1}, '$push': {'awarded_milestones': 3}}
        )

    results = await asyncio.gather(try_award(), try_award())
    modified_counts = [r.modified_count for r in results]
    assert sorted(modified_counts) == [0, 1]  # exactly one of the two actually awarded
    user = await fresh_db.users.find_one({'_id': server.ObjectId(user_id)})
    assert user["streak_freezes"] == 1


@pytest.mark.asyncio
async def test_streak_freeze_none_available(client):
    reg = await register(client)
    token = reg.json()["access_token"]
    r = await client.post("/api/streak/freeze", headers=auth_headers(token))
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_streak_freeze_available(client, fresh_db):
    reg = await register(client)
    token, user_id = reg.json()["access_token"], reg.json()["user"]["id"]
    await fresh_db.users.update_one({'_id': server.ObjectId(user_id)}, {'$set': {'streak_freezes': 2}})
    r = await client.post("/api/streak/freeze", headers=auth_headers(token))
    assert r.status_code == 200
    assert r.json()["remaining_freezes"] == 1


# ==================== REVEAL LOGIC (priority) ====================

@pytest.mark.asyncio
async def test_reveal_status_endpoint(client):
    reg = await register(client)
    token = reg.json()["access_token"]
    r = await client.get("/api/reveal/status", headers=auth_headers(token))
    assert r.status_code == 200
    assert r.json()["seconds_until_reveal"] >= 0


def test_next_reveal_date_is_always_sunday_20_utc():
    from freezegun import freeze_time
    # Monday noon UTC -> next reveal is this coming Sunday 20:00 UTC
    with freeze_time("2026-07-13 12:00:00", tz_offset=0):  # a Monday
        nxt = server.get_next_reveal_date()
        assert nxt.weekday() == 6
        assert (nxt.hour, nxt.minute, nxt.second) == (20, 0, 0)
        assert nxt.date() == datetime(2026, 7, 19).date()


def test_next_reveal_date_sunday_before_20h_same_day():
    from freezegun import freeze_time
    with freeze_time("2026-07-19 19:59:59", tz_offset=0):  # Sunday, just before reveal
        nxt = server.get_next_reveal_date()
        assert nxt.date() == datetime(2026, 7, 19).date()


def test_next_reveal_date_sunday_exactly_20h_rolls_to_next_week():
    from freezegun import freeze_time
    with freeze_time("2026-07-19 20:00:00", tz_offset=0):  # Sunday, exactly at reveal
        nxt = server.get_next_reveal_date()
        assert nxt.date() == datetime(2026, 7, 26).date()


def test_next_reveal_date_sunday_after_20h_rolls_to_next_week():
    from freezegun import freeze_time
    with freeze_time("2026-07-19 20:00:01", tz_offset=0):
        nxt = server.get_next_reveal_date()
        assert nxt.date() == datetime(2026, 7, 26).date()


def test_next_reveal_date_across_dst_change():
    """Reveal must stay 20:00 UTC (not local time) across a European DST transition."""
    from freezegun import freeze_time
    # 2026-10-25 is the last Sunday of October, when EU clocks fall back
    with freeze_time("2026-10-20 12:00:00", tz_offset=0):  # Tuesday before the change
        nxt = server.get_next_reveal_date()
        assert nxt.hour == 20  # UTC, unaffected by DST
        assert nxt.tzinfo == timezone.utc


def test_is_revealed_boundary():
    now = datetime.now(timezone.utc)
    past = (now - timedelta(seconds=1)).isoformat()
    future = (now + timedelta(hours=1)).isoformat()
    assert server.is_revealed(past) is True
    assert server.is_revealed(future) is False


# ==================== MEDIA SECURITY ====================

@pytest.mark.asyncio
async def test_media_path_traversal_blocked(client):
    # httpx normalizes ".." in URLs client-side before the request is even sent,
    # so an HTTP-level request can't reach the handler with a literal "..".
    # Call the handler directly to prove the server-side guard works regardless
    # of what a non-normalizing HTTP client (or a misconfigured proxy) might forward.
    for malicious_filename in ("..", "../server.py", "..\\server.py", "sub/../../server.py"):
        with pytest.raises(server.HTTPException) as exc_info:
            await server.serve_media(malicious_filename)
        assert exc_info.value.status_code == 400

    # Sanity: an HTTP-level request with a normal invalid filename still 404s cleanly.
    r = await client.get("/api/media/does-not-exist-at-all.jpg")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_media_unknown_file_404(client):
    r = await client.get("/api/media/does-not-exist.jpg")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_upload_media_rejects_bad_content_type(client):
    reg = await register(client)
    token = reg.json()["access_token"]
    r = await client.post(
        "/api/upload/media",
        files={"file": ("evil.exe", b"MZ\x90\x00", "application/x-msdownload")},
        headers=auth_headers(token),
    )
    assert r.status_code == 400


# ==================== WEEKLY SUMMARY ====================

@pytest.mark.asyncio
async def test_weekly_summary_no_activity(client):
    reg = await register(client)
    token = reg.json()["access_token"]
    r = await client.get("/api/weekly-summary", headers=auth_headers(token))
    assert r.status_code == 200
    assert r.json()["drops_count"] == 0
    assert r.json()["achievement"] == "none"


@pytest.mark.asyncio
async def test_weekly_summary_with_drop(client):
    reg = await register(client)
    token = reg.json()["access_token"]
    await client.post("/api/drops", json={"media_data": "Zm9v", "media_type": "image"}, headers=auth_headers(token))
    r = await client.get("/api/weekly-summary", headers=auth_headers(token))
    assert r.json()["drops_count"] == 1
    assert r.json()["achievement"] == "starter"


# ==================== NOTIFICATIONS ====================

@pytest.mark.asyncio
async def test_friend_request_creates_notification_and_unread_count(client):
    reg_a = await register(client, username="alice", email="alice@example.com")
    reg_b = await register(client, username="bob", email="bob@example.com")
    token_a, token_b = reg_a.json()["access_token"], reg_b.json()["access_token"]
    bob_id = reg_b.json()["user"]["id"]
    await client.post(f"/api/friends/request/{bob_id}", headers=auth_headers(token_a))

    r = await client.get("/api/notifications/unread-count", headers=auth_headers(token_b))
    assert r.json()["count"] == 1

    await client.post("/api/notifications/read", headers=auth_headers(token_b))
    r = await client.get("/api/notifications/unread-count", headers=auth_headers(token_b))
    assert r.json()["count"] == 0
