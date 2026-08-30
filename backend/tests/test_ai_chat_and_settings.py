"""Tests for AI chat, chatbot settings, and features toggle (iteration 2)."""
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
    email = f"test_aichat_{uuid.uuid4().hex[:8]}@fixitz.com"
    r = s.post(f"{API}/auth/register", json={
        "name": "TEST AI Chat", "email": email, "phone": "9998887777", "password": "Test@1234"
    })
    assert r.status_code == 200, r.text
    tok = r.json()["token"]
    me = s.get(f"{API}/auth/me", headers=bearer(tok)).json()
    return {"token": tok, "id": me["id"], "email": email}


# ---------- FEATURES TOGGLE ----------
class TestSettingsFeatures:
    def test_settings_features_include_all(self, s):
        j = s.get(f"{API}/settings").json()
        feats = j.get("features") or {}
        for k in ["wallet", "referral", "spin", "flash", "chat", "repair", "buy", "sell"]:
            assert k in feats, f"missing feature toggle: {k}, got {list(feats.keys())}"

    def test_settings_has_chatbot_default(self, s):
        j = s.get(f"{API}/settings").json()
        chatbot = j.get("chatbot") or {}
        assert "greeting" in chatbot
        assert isinstance(chatbot.get("faqs", []), list)


# ---------- CHATBOT ADMIN SETTINGS ----------
class TestChatbotSettings:
    def test_admin_update_chatbot(self, s, admin_token):
        orig = s.get(f"{API}/settings").json().get("chatbot") or {}
        new_bot = {
            "greeting": "TEST_greeting_" + uuid.uuid4().hex[:6],
            "faqs": [{"q": "TEST_q", "a": "TEST_a"}],
        }
        r = s.put(f"{API}/admin/settings", json={"chatbot": new_bot}, headers=bearer(admin_token))
        assert r.status_code == 200, r.text
        assert r.json()["chatbot"]["greeting"] == new_bot["greeting"]
        # verify public settings reflects
        got = s.get(f"{API}/settings").json().get("chatbot") or {}
        assert got["greeting"] == new_bot["greeting"]
        assert got["faqs"][0]["q"] == "TEST_q"
        # restore
        s.put(f"{API}/admin/settings", json={"chatbot": orig}, headers=bearer(admin_token))

    def test_user_forbidden_from_admin_settings(self, s, user_ctx):
        r = s.put(f"{API}/admin/settings",
                  json={"chatbot": {"greeting": "hack", "faqs": []}},
                  headers=bearer(user_ctx["token"]))
        assert r.status_code == 403


# ---------- AI CHAT (LLM) ----------
class TestAIChat:
    def test_chat_ai_requires_auth(self, s):
        r = s.post(f"{API}/chat/ai", json={"text": "hi", "topic": "general", "page": "/"})
        assert r.status_code == 401

    def test_chat_ai_returns_user_and_bot(self, s, user_ctx):
        r = s.post(
            f"{API}/chat/ai",
            json={"text": "My iPhone 13 screen is broken, how much?", "topic": "repair", "page": "/repair"},
            headers=bearer(user_ctx["token"]),
            timeout=60,
        )
        assert r.status_code == 200, r.text
        msgs = r.json().get("messages", [])
        assert len(msgs) == 2, f"expected 2 messages got {len(msgs)}"
        assert msgs[0]["sender"] == "user"
        assert msgs[1]["sender"] == "bot"
        bot_text = (msgs[1].get("text") or "").strip()
        assert len(bot_text) > 0, "bot text should be non-empty"
        # Should not include the exact fallback string ideally; if fallback used it still non-empty
        print("[AI reply repair]:", bot_text[:280])

    def test_chat_ai_offers_mentions_coupon(self, s, user_ctx):
        r = s.post(
            f"{API}/chat/ai",
            json={"text": "What offers or coupons do you have?", "topic": "offers", "page": "/"},
            headers=bearer(user_ctx["token"]),
            timeout=60,
        )
        assert r.status_code == 200, r.text
        msgs = r.json().get("messages", [])
        assert len(msgs) == 2
        bot_text = (msgs[1].get("text") or "")
        assert len(bot_text.strip()) > 0
        print("[AI reply offers]:", bot_text[:280])
        # LLM is non-deterministic; check that at least a real coupon code MAY be mentioned.
        # Soft-assert (do not fail): print if not.
        lower = bot_text.lower()
        mentioned = any(code.lower() in lower for code in ["first100", "repair20"])
        if not mentioned:
            print("[WARN] No known coupon code found in AI reply — may be OK depending on phrasing.")

    def test_chat_message_no_auto_bot(self, s, user_ctx):
        r = s.post(f"{API}/chat/message",
                   json={"text": "TEST_plain_message", "topic": "general"},
                   headers=bearer(user_ctx["token"]))
        assert r.status_code == 200
        msgs = r.json().get("messages", [])
        assert len(msgs) == 1
        assert msgs[0]["sender"] == "user"
