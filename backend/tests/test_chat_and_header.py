"""Targeted tests: chat (no auto-reply) + admin reply flow."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cashify-nexus.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "shamthemanu@gmail.com"
ADMIN_PASSWORD = "Fixitz@2026"


def bearer(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def admin_token(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def user_ctx(s):
    email = f"test_chat_{uuid.uuid4().hex[:8]}@fixitz.com"
    r = s.post(f"{API}/auth/register", json={
        "name": "TEST Chat User", "email": email, "phone": "9998887777", "password": "Test@1234"
    })
    assert r.status_code == 200, r.text
    tok = r.json()["token"]
    me = s.get(f"{API}/auth/me", headers=bearer(tok)).json()
    return {"token": tok, "id": me["id"], "email": email}


class TestChatNoAutoReply:
    def test_post_message_returns_only_user(self, s, user_ctx):
        r = s.post(f"{API}/chat/message",
                   json={"text": "TEST_hello, need help", "topic": "general"},
                   headers=bearer(user_ctx["token"]))
        assert r.status_code == 200, r.text
        msgs = r.json().get("messages", [])
        assert len(msgs) == 1, f"expected exactly 1 message (user only), got {len(msgs)}: {msgs}"
        assert msgs[0]["sender"] == "user"
        assert msgs[0]["text"] == "TEST_hello, need help"

    def test_get_messages_no_bot_sender(self, s, user_ctx):
        r = s.get(f"{API}/chat/messages", headers=bearer(user_ctx["token"]))
        assert r.status_code == 200
        docs = r.json()
        senders = {d["sender"] for d in docs}
        assert "bot" not in senders, f"unexpected bot sender in messages: {senders}"
        # at minimum has our just-sent user message
        assert any(d["sender"] == "user" and d["text"] == "TEST_hello, need help" for d in docs)

    def test_admin_reply_appears_for_user(self, s, admin_token, user_ctx):
        reply_text = f"TEST_admin_reply_{uuid.uuid4().hex[:6]}"
        r = s.post(f"{API}/admin/chat/reply",
                   json={"userId": user_ctx["id"], "text": reply_text},
                   headers=bearer(admin_token))
        assert r.status_code == 200, r.text
        assert r.json()["sender"] == "admin"
        assert r.json()["text"] == reply_text

        # user fetches — should see admin message
        got = s.get(f"{API}/chat/messages", headers=bearer(user_ctx["token"])).json()
        senders = {d["sender"] for d in got}
        assert "admin" in senders
        assert "bot" not in senders
        assert any(d["sender"] == "admin" and d["text"] == reply_text for d in got)

    def test_admin_chat_gating(self, s, user_ctx):
        r = s.post(f"{API}/admin/chat/reply",
                   json={"userId": user_ctx["id"], "text": "should fail"},
                   headers=bearer(user_ctx["token"]))
        assert r.status_code == 403

    def test_admin_chat_threads(self, s, admin_token, user_ctx):
        r = s.get(f"{API}/admin/chat", headers=bearer(admin_token))
        assert r.status_code == 200
        threads = r.json()
        assert any(t["userId"] == user_ctx["id"] for t in threads)
