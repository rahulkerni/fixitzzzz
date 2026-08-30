"""FixitZ backend end-to-end tests using pytest."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cashify-nexus.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "shamthemanu@gmail.com"
ADMIN_PASSWORD = "Fixitz@2026"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "admin"
    return data["token"]


@pytest.fixture(scope="session")
def user_token(s):
    email = f"test_user_{uuid.uuid4().hex[:8]}@fixitz.com"
    payload = {"name": "TEST User", "email": email, "phone": "9999999999", "password": "Test@1234"}
    r = s.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    return r.json()["token"], email


def bearer(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- AUTH ----------
class TestAuth:
    def test_register_login_me(self, s, user_token):
        tok, email = user_token
        r = s.post(f"{API}/auth/login", json={"email": email, "password": "Test@1234"})
        assert r.status_code == 200
        assert r.json()["user"]["email"] == email
        me = s.get(f"{API}/auth/me", headers=bearer(tok))
        assert me.status_code == 200
        assert me.json()["email"] == email
        assert me.json().get("role") == "user"

    def test_invalid_login(self, s):
        r = s.post(f"{API}/auth/login", json={"email": "nouser@x.com", "password": "bad"})
        assert r.status_code == 401

    def test_admin_role(self, s, admin_token):
        r = s.get(f"{API}/auth/me", headers=bearer(admin_token))
        assert r.status_code == 200
        assert r.json()["role"] == "admin"


# ---------- PUBLIC CONTENT ----------
class TestPublic:
    def test_settings(self, s):
        r = s.get(f"{API}/settings")
        assert r.status_code == 200
        j = r.json()
        assert j.get("appName") == "FixitZ"

    def test_sections_sorted_visible(self, s):
        r = s.get(f"{API}/sections")
        assert r.status_code == 200
        secs = r.json()
        assert len(secs) == 11, f"expected 11 v2 sections got {len(secs)}: {[x['type'] for x in secs]}"
        orders = [x["order"] for x in secs]
        assert orders == sorted(orders)
        assert all(x["visible"] for x in secs)
        types = {x["type"] for x in secs}
        expected_types = {"banner", "category_grid", "wallet", "flash_sale", "repair_service",
                          "shop_products", "free_products", "sell_phone", "buy_phone",
                          "order_tracking", "referral"}
        assert expected_types.issubset(types), f"missing types: {expected_types - types}"

    def test_settings_features_and_theme(self, s):
        j = s.get(f"{API}/settings").json()
        feats = j.get("features") or {}
        for k in ["wallet", "referral", "spin", "flash"]:
            assert k in feats, f"missing feature toggle: {k}"
        assert (j.get("theme") or {}).get("primary") == "#FF6A00"


# ---------- WALLET ----------
class TestWallet:
    def test_wallet_requires_auth(self, s):
        assert s.get(f"{API}/wallet").status_code == 401
        assert s.post(f"{API}/wallet/add", json={"amount": 100}).status_code == 401

    def test_wallet_get_initial(self, s, user_token):
        tok, _ = user_token
        r = s.get(f"{API}/wallet", headers=bearer(tok))
        assert r.status_code == 200
        j = r.json()
        assert "balance" in j and "transactions" in j
        assert isinstance(j["transactions"], list)

    def test_wallet_add_and_persist(self, s, user_token):
        tok, _ = user_token
        before = s.get(f"{API}/wallet", headers=bearer(tok)).json()["balance"]
        r = s.post(f"{API}/wallet/add", json={"amount": 250, "note": "TEST_topup"}, headers=bearer(tok))
        assert r.status_code == 200
        j = r.json()
        assert j["balance"] == before + 250
        assert j["transaction"]["type"] == "credit"
        assert j["transaction"]["amount"] == 250
        # verify persistence via GET
        w = s.get(f"{API}/wallet", headers=bearer(tok)).json()
        assert w["balance"] == before + 250
        assert any(t["note"] == "TEST_topup" and t["amount"] == 250 for t in w["transactions"])

    def test_wallet_add_invalid_amount(self, s, user_token):
        tok, _ = user_token
        r = s.post(f"{API}/wallet/add", json={"amount": 0}, headers=bearer(tok))
        assert r.status_code == 400
        r = s.post(f"{API}/wallet/add", json={"amount": -50}, headers=bearer(tok))
        assert r.status_code == 400


# ---------- ADMIN FEATURES ----------
class TestAdminFeatures:
    def test_features_update_admin(self, s, admin_token):
        orig = (s.get(f"{API}/settings").json().get("features") or {})
        new_feats = {"wallet": False, "referral": True, "spin": True, "flash": False}
        r = s.put(f"{API}/admin/settings", json={"features": new_feats}, headers=bearer(admin_token))
        assert r.status_code == 200
        assert r.json()["features"]["wallet"] is False
        assert r.json()["features"]["flash"] is False
        # restore
        s.put(f"{API}/admin/settings", json={"features": orig or {"wallet": True, "referral": True, "spin": True, "flash": True}},
              headers=bearer(admin_token))

    def test_features_update_forbidden_for_user(self, s, user_token):
        tok, _ = user_token
        r = s.put(f"{API}/admin/settings", json={"features": {"wallet": False}}, headers=bearer(tok))
        assert r.status_code == 403

    def test_section_reorder_and_config(self, s, admin_token):
        secs = s.get(f"{API}/admin/sections", headers=bearer(admin_token)).json()
        assert secs
        target = secs[0]
        orig_order = target["order"]
        orig_config = target.get("config", {})
        new_order = orig_order + 1000
        r = s.put(f"{API}/admin/sections/{target['id']}",
                  json={"data": {"order": new_order, "config": {**orig_config, "bg": "#123456"}}},
                  headers=bearer(admin_token))
        assert r.status_code == 200
        assert r.json()["order"] == new_order
        assert r.json()["config"].get("bg") == "#123456"
        # restore
        s.put(f"{API}/admin/sections/{target['id']}",
              json={"data": {"order": orig_order, "config": orig_config}}, headers=bearer(admin_token))

    def test_repair_flow(self, s):
        r = s.get(f"{API}/repair/brands")
        assert r.status_code == 200 and len(r.json()) > 0
        brand = r.json()[0]
        r2 = s.get(f"{API}/repair/models", params={"brand_id": brand["id"]})
        assert r2.status_code == 200 and len(r2.json()) > 0
        model = r2.json()[0]
        r3 = s.get(f"{API}/repair/services", params={"model_id": model["id"]})
        assert r3.status_code == 200 and len(r3.json()) > 0
        for svc in r3.json():
            base = svc["base_price"]
            expected_m = 2.5 if base < 800 else (2.3 if base <= 1300 else 2.0)
            expected = round(base * expected_m) if not svc.get("override_price") else round(svc["override_price"])
            assert svc["price"] == expected, f"pricing mismatch {svc}"

    def test_categories_and_products(self, s):
        cats = s.get(f"{API}/categories").json()
        assert len(cats) > 0
        prods = s.get(f"{API}/products").json()
        assert len(prods) > 0
        # filter by category
        cid = cats[0]["id"]
        filt = s.get(f"{API}/products", params={"category_id": cid}).json()
        assert all(p["category_id"] == cid for p in filt)
        # filter by tag
        flash = s.get(f"{API}/products", params={"tag": "flash"}).json()
        assert all("flash" in p.get("tags", []) for p in flash)
        # search
        q = s.get(f"{API}/products", params={"q": "cable"}).json()
        assert all("cable" in p["name"].lower() for p in q)
        # detail
        pid = prods[0]["id"]
        d = s.get(f"{API}/products/{pid}")
        assert d.status_code == 200 and d.json()["id"] == pid
        # 404
        assert s.get(f"{API}/products/nonexistent").status_code == 404

    def test_sell_public(self, s):
        devs = s.get(f"{API}/sell/devices").json()
        assert len(devs) > 0
        conds = s.get(f"{API}/sell/conditions").json()
        assert len(conds) == 5

    def test_buy_phones(self, s):
        phones = s.get(f"{API}/buy/phones").json()
        assert len(phones) > 0
        excellent = s.get(f"{API}/buy/phones", params={"condition": "excellent"}).json()
        assert all(p["condition"] == "excellent" for p in excellent)
        cheap = s.get(f"{API}/buy/phones", params={"max_price": 15000}).json()
        assert all(p["price"] <= 15000 for p in cheap)


# ---------- SELL QUOTE ----------
class TestSellQuote:
    def test_sell_quote_breakdown(self, s):
        devs = s.get(f"{API}/sell/devices").json()
        conds = s.get(f"{API}/sell/conditions").json()
        device = devs[0]
        # Pick worst options for deduction
        answers = {}
        expected_deduction = 0
        for c in conds:
            worst = max(c["options"], key=lambda o: o["value"])
            answers[c["id"]] = worst["label"]
            expected_deduction += worst["value"]
        r = s.post(f"{API}/sell/quote", json={"device_id": device["id"], "answers": answers})
        assert r.status_code == 200
        j = r.json()
        assert j["price"] == max(0, round(device["base_price"] - expected_deduction))
        assert len(j["breakdown"]) == len(conds)

    def test_sell_quote_no_answers(self, s):
        devs = s.get(f"{API}/sell/devices").json()
        r = s.post(f"{API}/sell/quote", json={"device_id": devs[0]["id"], "answers": {}})
        assert r.status_code == 200
        assert r.json()["price"] == devs[0]["base_price"]

    def test_sell_quote_bad_device(self, s):
        r = s.post(f"{API}/sell/quote", json={"device_id": "invalid", "answers": {}})
        assert r.status_code == 404


# ---------- ORDERS ----------
class TestOrders:
    def test_create_and_list_orders(self, s, user_token):
        tok, _ = user_token
        payload = {"type": "sell", "items": [], "amount": 15000, "address": {"line": "TEST addr"}, "details": {}, "payment": {}}
        r = s.post(f"{API}/orders", json=payload, headers=bearer(tok))
        assert r.status_code == 200
        oid = r.json()["id"]
        assert r.json()["status"] == "pending"
        # list
        my = s.get(f"{API}/orders", headers=bearer(tok))
        assert my.status_code == 200
        assert any(o["id"] == oid for o in my.json())

    def test_orders_require_auth(self, s):
        r = s.get(f"{API}/orders")
        assert r.status_code == 401


# ---------- PAYMENTS ----------
class TestPayments:
    def test_create_order_returns_id(self, s, user_token):
        tok, _ = user_token
        r = s.post(f"{API}/payments/create-order", json={"amount": 100}, headers=bearer(tok))
        # LIVE keys: expecting 200; if gateway rejects it will be 502 (still valid signal)
        assert r.status_code == 200, f"unexpected: {r.status_code} {r.text}"
        j = r.json()
        assert "order_id" in j and j["order_id"].startswith("order_")
        assert "key_id" in j

    def test_verify_fake_signature(self, s, user_token):
        tok, _ = user_token
        r = s.post(f"{API}/payments/verify",
                   json={"razorpay_order_id": "order_x", "razorpay_payment_id": "pay_x", "razorpay_signature": "bad"},
                   headers=bearer(tok))
        assert r.status_code == 400


# ---------- COUPON ----------
class TestCoupon:
    def test_valid_coupon(self, s, user_token):
        tok, _ = user_token
        r = s.get(f"{API}/coupons/validate", params={"code": "FIRST100", "order_value": 999}, headers=bearer(tok))
        assert r.status_code == 200
        assert r.json()["discount"] == 100

    def test_coupon_min_order(self, s, user_token):
        tok, _ = user_token
        r = s.get(f"{API}/coupons/validate", params={"code": "FIRST100", "order_value": 100}, headers=bearer(tok))
        assert r.status_code == 400

    def test_coupon_invalid(self, s, user_token):
        tok, _ = user_token
        r = s.get(f"{API}/coupons/validate", params={"code": "NOPE", "order_value": 999}, headers=bearer(tok))
        assert r.status_code == 404


# ---------- ADMIN GATING & CRUD ----------
class TestAdmin:
    def test_admin_gating(self, s, user_token):
        tok, _ = user_token
        for path in ["/admin/stats", "/admin/orders", "/admin/users", "/admin/products"]:
            r = s.get(f"{API}{path}", headers=bearer(tok))
            assert r.status_code == 403, f"{path} should be 403 for user, got {r.status_code}"

    def test_admin_stats(self, s, admin_token):
        r = s.get(f"{API}/admin/stats", headers=bearer(admin_token))
        assert r.status_code == 200
        j = r.json()
        for k in ["users", "orders", "revenue", "products", "pending", "repair_orders", "sell_requests"]:
            assert k in j

    def test_admin_users_list(self, s, admin_token):
        r = s.get(f"{API}/admin/users", headers=bearer(admin_token))
        assert r.status_code == 200
        assert all("password_hash" not in u for u in r.json())

    def test_admin_orders_list(self, s, admin_token):
        r = s.get(f"{API}/admin/orders", headers=bearer(admin_token))
        assert r.status_code == 200

    def test_admin_settings_update(self, s, admin_token):
        # capture original tagline
        orig = s.get(f"{API}/settings").json().get("tagline")
        new_tag = f"TEST_TAG_{uuid.uuid4().hex[:6]}"
        r = s.put(f"{API}/admin/settings", json={"tagline": new_tag}, headers=bearer(admin_token))
        assert r.status_code == 200
        assert r.json()["tagline"] == new_tag
        # verify persistence
        got = s.get(f"{API}/settings").json()
        assert got["tagline"] == new_tag
        # restore
        s.put(f"{API}/admin/settings", json={"tagline": orig}, headers=bearer(admin_token))

    def test_products_crud(self, s, admin_token):
        # Create
        payload = {"data": {"name": "TEST_Product", "price": 100, "mrp": 200, "active": True,
                             "image": "", "stock": 5, "tags": [], "category_id": ""}}
        r = s.post(f"{API}/admin/products", json=payload, headers=bearer(admin_token))
        assert r.status_code == 200
        pid = r.json()["id"]
        # Read via public
        assert s.get(f"{API}/products/{pid}").status_code == 200
        # Update
        u = s.put(f"{API}/admin/products/{pid}", json={"data": {"name": "TEST_Product_Updated", "price": 150}},
                  headers=bearer(admin_token))
        assert u.status_code == 200
        assert u.json()["name"] == "TEST_Product_Updated"
        assert u.json()["price"] == 150
        # Verify persistence
        got = s.get(f"{API}/products/{pid}").json()
        assert got["name"] == "TEST_Product_Updated"
        # Delete
        d = s.delete(f"{API}/admin/products/{pid}", headers=bearer(admin_token))
        assert d.status_code == 200
        assert s.get(f"{API}/products/{pid}").status_code == 404

    def test_sections_crud(self, s, admin_token):
        payload = {"data": {"type": "banner", "title": "TEST_Section", "visible": False, "order": 99, "config": {}}}
        r = s.post(f"{API}/admin/sections", json=payload, headers=bearer(admin_token))
        assert r.status_code == 200
        sid = r.json()["id"]
        # List
        secs = s.get(f"{API}/admin/sections", headers=bearer(admin_token)).json()
        assert any(x["id"] == sid for x in secs)
        # Since visible=False, must NOT appear in public /sections
        public = s.get(f"{API}/sections").json()
        assert not any(x["id"] == sid for x in public)
        # Update
        u = s.put(f"{API}/admin/sections/{sid}", json={"data": {"title": "TEST_Section_Upd", "visible": True}},
                  headers=bearer(admin_token))
        assert u.status_code == 200
        assert u.json()["title"] == "TEST_Section_Upd"
        # Delete
        s.delete(f"{API}/admin/sections/{sid}", headers=bearer(admin_token))

    def test_order_status_update(self, s, admin_token, user_token):
        tok, _ = user_token
        # create an order as user
        r = s.post(f"{API}/orders", json={"type": "product", "items": [], "amount": 50, "address": {}, "details": {}, "payment": {}},
                   headers=bearer(tok))
        oid = r.json()["id"]
        # admin update status
        u = s.put(f"{API}/admin/orders/{oid}/status", json={"data": {"status": "confirmed"}},
                  headers=bearer(admin_token))
        assert u.status_code == 200
        assert u.json()["status"] == "confirmed"

    def test_unknown_collection(self, s, admin_token):
        r = s.get(f"{API}/admin/bogus_coll", headers=bearer(admin_token))
        assert r.status_code == 404
