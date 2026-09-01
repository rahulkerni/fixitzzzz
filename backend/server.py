from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent / '.env')

import os
import uuid
import logging
import csv
import io
import hmac
import hashlib
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

import bcrypt
import jwt
import httpx
import firebase_admin
from firebase_admin import auth as fb_auth, credentials as fb_credentials
import razorpay
import asyncio
import json
from notifications import notify_order, notify_customer_new_order, notify_admin_new_order, notify_order_created
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File
from fastapi.responses import Response
from storage import init_storage, put_object, get_object
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"

rzp_client = razorpay.Client(auth=(os.environ['RAZORPAY_KEY_ID'], os.environ['RAZORPAY_KEY_SECRET']))


def _init_firebase():
    if not firebase_admin._apps:
        sa = json.loads(os.environ["FIREBASE_SERVICE_ACCOUNT_JSON"])
        firebase_admin.initialize_app(fb_credentials.Certificate(sa))


_init_firebase()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("fixitz")

APP_NAME = "fixitz"
MIME = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif", "webp": "image/webp"}

app = FastAPI(title="FixitZ API")
api = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def new_id():
    return str(uuid.uuid4())


def clean(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc.pop("_id", None)
    return doc


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# Emergent-managed Google OAuth session endpoint
EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


def _new_session_token() -> str:
    return "fx_" + uuid.uuid4().hex + uuid.uuid4().hex


def _extract_bearer(request: Request) -> Optional[str]:
    auth = request.headers.get("Authorization") or ""
    if auth.startswith("Bearer "):
        return auth.split(" ", 1)[1].strip()
    return None


async def _resolve_session_user(token: str) -> Optional[dict]:
    sess = await db.user_sessions.find_one({"session_token": token})
    if not sess:
        return None
    expires_at = sess.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        return None
    return await db.users.find_one({"id": sess["user_id"]})


async def get_current_user(request: Request) -> dict:
    cookie_token = request.cookies.get("session_token")
    bearer = _extract_bearer(request)
    # 1) Google OAuth session token — cookie first, then bearer header
    for candidate in (cookie_token, bearer):
        if candidate:
            user = await _resolve_session_user(candidate)
            if user:
                user = clean(user); user.pop("password_hash", None)
                return user
    # 2) JWT (email/password login)
    if bearer:
        try:
            payload = jwt.decode(bearer, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user = await db.users.find_one({"id": payload["sub"]})
            if user:
                user = clean(user); user.pop("password_hash", None)
                return user
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            pass
    raise HTTPException(status_code=401, detail="Not authenticated")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class RegisterInput(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str
    referral_code: Optional[str] = None


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class SettingsInput(BaseModel):
    appName: Optional[str] = None
    tagline: Optional[str] = None
    logo: Optional[str] = None
    theme: Optional[Dict[str, Any]] = None
    currency: Optional[str] = None
    deliveryCharge: Optional[float] = None
    supportPhone: Optional[str] = None
    city: Optional[str] = None
    features: Optional[Dict[str, Any]] = None
    chatbot: Optional[Dict[str, Any]] = None
    referralReward: Optional[float] = None
    adminAlertEmail: Optional[str] = None
    adminAlertPhone: Optional[str] = None
    flashSaleEndsAt: Optional[str] = None
    primaryColor: Optional[str] = None
    accentColor: Optional[str] = None
    pageBg: Optional[str] = None


class SectionInput(BaseModel):
    type: str
    title: str
    visible: bool = True
    order: int = 0
    config: Dict[str, Any] = Field(default_factory=dict)


class GenericDoc(BaseModel):
    data: Dict[str, Any]


class RepairQuoteInput(BaseModel):
    service_id: str


class SellQuoteInput(BaseModel):
    device_id: str
    answers: Dict[str, str] = Field(default_factory=dict)  # condition_id -> option_label


class OrderInput(BaseModel):
    type: str  # repair | product | sell | buy | wallet
    items: List[Dict[str, Any]] = Field(default_factory=list)
    amount: float
    details: Dict[str, Any] = Field(default_factory=dict)
    address: Dict[str, Any] = Field(default_factory=dict)
    payment: Dict[str, Any] = Field(default_factory=dict)


class PaymentOrderInput(BaseModel):
    amount: float  # in rupees


class PaymentVerifyInput(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class WalletAddInput(BaseModel):
    amount: float
    note: Optional[str] = None
    payment: Dict[str, Any] = Field(default_factory=dict)


class WalletSpendInput(BaseModel):
    amount: float
    note: Optional[str] = None


class ChatMessageInput(BaseModel):
    text: str
    topic: Optional[str] = "general"


class ChatReplyInput(BaseModel):
    userId: str
    text: str


class ChatAIInput(BaseModel):
    text: str
    topic: Optional[str] = "general"
    page: Optional[str] = "Home"


class PriceRequestInput(BaseModel):
    type: str  # repair | sell
    brand: Optional[str] = None
    model: str
    phone: str
    fault: Optional[str] = None
    urgent: Optional[bool] = False


# ---------------------------------------------------------------------------
# Pricing engines
# ---------------------------------------------------------------------------
def compute_repair_price(base: float, override: Optional[float]) -> float:
    if override is not None and override > 0:
        return round(override)
    if base < 800:
        m = 2.5
    elif base <= 1300:
        m = 2.3
    else:
        m = 2.0
    return round(base * m)


REPAIR_PHONE_IMG = "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?crop=entropy&cs=srgb&fm=jpg&q=85&w=600"

DEFAULT_TIERS = {"bands": [
    {"upTo": 2000, "battery": 900, "speaker": 500, "charging_port": 700, "back_panel": 800},
    {"upTo": 4000, "battery": 1600, "speaker": 800, "charging_port": 1000, "back_panel": 1400},
    {"upTo": 6000, "battery": 2200, "speaker": 1100, "charging_port": 1400, "back_panel": 2000},
    {"upTo": None, "battery": 3000, "speaker": 1400, "charging_port": 1800, "back_panel": 2600},
]}


def band_for(tiers: dict, screen: float) -> dict:
    bands = sorted(tiers.get("bands", []), key=lambda b: (b.get("upTo") is None, b.get("upTo") or 0))
    for b in bands:
        if b.get("upTo") is None or screen <= b["upTo"]:
            return b
    return bands[-1] if bands else {}


def compute_sell_price(base: float, conditions: List[dict], answers: Dict[str, str]) -> dict:
    price = float(base)
    breakdown = []
    for cond in conditions:
        sel = answers.get(cond["id"])
        if sel is None:
            continue
        opt = next((o for o in cond.get("options", []) if o["label"] == sel), None)
        if not opt:
            continue
        val = float(opt.get("value", 0))
        if cond.get("kind") == "multiplier":
            price = price * val
            breakdown.append({"label": f"{cond['label']}: {opt['label']}", "effect": f"x{val}"})
        else:
            price = price - val
            breakdown.append({"label": f"{cond['label']}: {opt['label']}", "effect": f"-₹{val:.0f}"})
    return {"price": max(0, round(price)), "breakdown": breakdown}


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@api.post("/auth/register")
async def register(inp: RegisterInput):
    email = inp.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    ref_code = (inp.referral_code or "").strip().upper()
    referrer = await db.users.find_one({"referralCode": ref_code}) if ref_code else None
    user = {
        "id": new_id(), "name": inp.name, "email": email, "phone": inp.phone,
        "password_hash": hash_password(inp.password), "role": "user",
        "wallet": 0, "referralCode": inp.name[:3].upper() + new_id()[:5].upper(),
        "referredBy": referrer["referralCode"] if referrer else None,
        "referredByName": referrer.get("name") if referrer else None,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    if referrer:
        settings = await db.settings.find_one({"id": "appConfig"}) or {}
        reward = settings.get("referralReward", 100)
        await db.users.update_one({"id": referrer["id"]}, {"$inc": {"wallet": reward}})
        await db.wallet_txns.insert_one({"id": new_id(), "userId": referrer["id"], "type": "credit",
            "amount": reward, "note": f"Referral bonus — {inp.name}", "created_at": now_iso()})
    token = create_token(user["id"], email, "user")
    safe = clean(dict(user)); safe.pop("password_hash", None)
    return {"token": token, "user": safe}


@api.post("/auth/login")
async def login(inp: LoginInput):
    email = inp.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(inp.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], email, user.get("role", "user"))
    safe = clean(dict(user)); safe.pop("password_hash", None)
    return {"token": token, "user": safe}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


class FirebaseTokenInput(BaseModel):
    id_token: str


@api.post("/auth/firebase")
async def firebase_login(inp: FirebaseTokenInput, response: Response):
    try:
        decoded = fb_auth.verify_id_token(inp.id_token)
    except Exception as e:
        logger.error(f"Firebase token verify failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid Google sign-in token")
    email = (decoded.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=401, detail="Google account has no email")
    name = decoded.get("name") or email.split("@")[0]
    picture = decoded.get("picture")
    user = await db.users.find_one({"email": email})
    if not user:
        user = {
            "id": new_id(), "name": name, "email": email, "phone": "",
            "role": "user", "wallet": 0,
            "referralCode": (name[:3].upper() if name else "FX") + new_id()[:5].upper(),
            "picture": picture, "authProvider": "google", "created_at": now_iso(),
        }
        await db.users.insert_one(user)
    else:
        upd = {"authProvider": user.get("authProvider") or "google"}
        if picture and not user.get("picture"):
            upd["picture"] = picture
        await db.users.update_one({"id": user["id"]}, {"$set": upd})
        user.update(upd)
    session_token = _new_session_token()
    expires = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "id": new_id(), "user_id": user["id"], "session_token": session_token,
        "expires_at": expires, "created_at": datetime.now(timezone.utc),
    })
    response.set_cookie(key="session_token", value=session_token, httponly=True,
                        secure=True, samesite="none", path="/", max_age=7 * 24 * 60 * 60)
    safe = clean(dict(user)); safe.pop("password_hash", None)
    return {"token": session_token, "user": safe}


@api.post("/auth/logout")
async def logout_session(request: Request, response: Response):
    cookie_token = request.cookies.get("session_token")
    bearer = _extract_bearer(request)
    for t in (cookie_token, bearer):
        if t:
            await db.user_sessions.delete_one({"session_token": t})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


class PhoneInput(BaseModel):
    phone: str


@api.post("/auth/complete-profile")
async def complete_profile(inp: PhoneInput, user: dict = Depends(get_current_user)):
    phone = (inp.phone or "").strip()
    if not phone.isdigit() or len(phone) != 10:
        raise HTTPException(status_code=400, detail="Enter a valid 10-digit mobile number")
    await db.users.update_one({"id": user["id"]}, {"$set": {"phone": phone}})
    updated = await db.users.find_one({"id": user["id"]})
    updated = clean(updated); updated.pop("password_hash", None)
    return updated


# ---------------------------------------------------------------------------
# Public content routes
# ---------------------------------------------------------------------------
@api.get("/settings")
async def get_settings():
    doc = await db.settings.find_one({"id": "appConfig"})
    return clean(doc) if doc else {}


@api.get("/sections")
async def get_sections():
    docs = await db.sections.find({"visible": True}).sort("order", 1).to_list(200)
    return [clean(d) for d in docs]


@api.get("/repair/brands")
async def repair_brands():
    docs = await db.repair_brands.find({"active": True}).sort("order", 1).to_list(200)
    return [clean(d) for d in docs]


@api.get("/repair/issues")
async def repair_issues():
    docs = await db.repair_issues.find({}).sort("order", 1).to_list(100)
    return [clean(d) for d in docs]


@api.get("/repair/models")
async def repair_models(brand_id: str):
    docs = await db.repair_models.find({"brand_id": brand_id, "active": True}).to_list(500)
    return [clean(d) for d in docs]


@api.get("/repair/services")
async def repair_services(model_id: str):
    docs = await db.repair_services.find({"model_id": model_id, "active": True}).to_list(200)
    out = []
    for d in docs:
        d = clean(d)
        d["price"] = compute_repair_price(d.get("base_price", 0), d.get("override_price"))
        out.append(d)
    return out


@api.get("/categories")
async def categories():
    docs = await db.categories.find({}).sort("order", 1).to_list(100)
    return [clean(d) for d in docs]


@api.get("/products")
async def products(category_id: Optional[str] = None, tag: Optional[str] = None, q: Optional[str] = None):
    query: Dict[str, Any] = {"active": True}
    if category_id:
        query["category_id"] = category_id
    if tag:
        query["tags"] = tag
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    docs = await db.products.find(query).to_list(500)
    return [clean(d) for d in docs]


@api.get("/products/{pid}")
async def product_detail(pid: str):
    doc = await db.products.find_one({"id": pid})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return clean(doc)


@api.get("/search")
async def search(q: str):
    ql = (q or "").strip()
    if not ql:
        return {"products": [], "repairModels": [], "query": ql}
    rx = {"$regex": ql, "$options": "i"}
    products = [clean(d) for d in await db.products.find({"active": True, "$or": [{"name": rx}, {"description": rx}, {"tags": rx}]}).to_list(50)]
    models = await db.repair_models.find({"active": True, "name": rx}).to_list(50)
    brands = {b["id"]: b for b in await db.repair_brands.find({}).to_list(500)}
    repair = [{"id": m["id"], "name": m["name"], "image": m.get("image"), "brand_id": m.get("brand_id"),
               "brand": brands.get(m.get("brand_id"), {}).get("name", "")} for m in models]
    return {"products": products, "repairModels": repair, "query": ql}


@api.get("/flash-sale")
async def flash_sale():
    settings = await db.settings.find_one({"id": "appConfig"}) or {}
    docs = await db.products.find({"active": True, "tags": "flash"}).to_list(500)
    return {"endsAt": settings.get("flashSaleEndsAt"), "products": [clean(d) for d in docs]}


@api.get("/sell/devices")
async def sell_devices(q: Optional[str] = None):
    query: Dict[str, Any] = {"active": True}
    if q:
        query["model"] = {"$regex": q, "$options": "i"}
    docs = await db.sell_devices.find(query).to_list(500)
    return [clean(d) for d in docs]


@api.get("/sell/conditions")
async def sell_conditions():
    docs = await db.sell_conditions.find({}).sort("order", 1).to_list(100)
    return [clean(d) for d in docs]


@api.post("/sell/quote")
async def sell_quote(inp: SellQuoteInput):
    device = await db.sell_devices.find_one({"id": inp.device_id})
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    conditions = [clean(c) for c in await db.sell_conditions.find({}).sort("order", 1).to_list(100)]
    result = compute_sell_price(device.get("base_price", 0), conditions, inp.answers)
    result["device"] = clean(device)
    return result


@api.get("/buy/phones")
async def buy_phones(condition: Optional[str] = None, max_price: Optional[float] = None):
    query: Dict[str, Any] = {"active": True}
    if condition:
        query["condition"] = condition
    if max_price:
        query["price"] = {"$lte": max_price}
    docs = await db.buy_phones.find(query).to_list(500)
    return [clean(d) for d in docs]


@api.get("/buy/phones/{pid}")
async def buy_phone_detail(pid: str):
    doc = await db.buy_phones.find_one({"id": pid})
    if not doc:
        raise HTTPException(status_code=404, detail="Phone not found")
    return clean(doc)


@api.get("/games")
async def games():
    docs = await db.games.find({"active": True}).to_list(50)
    return [clean(d) for d in docs]


@api.get("/coupons/validate")
async def validate_coupon(code: str, order_value: float, user: dict = Depends(get_current_user)):
    c = await db.coupons.find_one({"code": code.upper(), "active": True})
    if not c:
        raise HTTPException(status_code=404, detail="Invalid coupon")
    c = clean(c)
    if order_value < c.get("min_order", 0):
        raise HTTPException(status_code=400, detail=f"Minimum order ₹{c['min_order']} required")
    if c.get("expiry") and c["expiry"] < now_iso():
        raise HTTPException(status_code=400, detail="Coupon expired")
    discount = c["value"] if c["type"] == "flat" else round(order_value * c["value"] / 100)
    if c.get("max_discount"):
        discount = min(discount, c["max_discount"])
    return {"discount": discount, "coupon": c}


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------
@api.post("/orders")
async def create_order(inp: OrderInput, user: dict = Depends(get_current_user)):
    has_free = inp.type == "product" and any(float(i.get("price") or 0) == 0 for i in inp.items)
    if has_free:
        prior = await db.orders.find_one({"userId": user["id"], "freeClaim": True})
        if prior:
            raise HTTPException(status_code=400, detail="You have already claimed your free product. Limit is one per account.")
    order = {
        "id": new_id(), "userId": user["id"], "userName": user.get("name"),
        "userPhone": user.get("phone"), "userEmail": user.get("email"),
        "type": inp.type, "items": inp.items, "amount": inp.amount,
        "details": inp.details, "address": inp.address, "payment": inp.payment,
        "status": "awaiting_approval" if has_free else "pending",
        "freeClaim": has_free, "created_at": now_iso(),
    }
    await db.orders.insert_one(order)
    settings = await db.settings.find_one({"id": "appConfig"}) or {}
    admin_email = settings.get("adminAlertEmail") or os.environ.get("ADMIN_EMAIL", "")
    admin_numbers = [n.strip() for n in os.environ.get("ADMIN_SMS_NUMBERS", "").split(",") if n.strip()]
    snapshot = clean(dict(order))
    asyncio.create_task(asyncio.to_thread(notify_order_created, snapshot, admin_numbers, admin_email))
    return clean(order)


@api.get("/orders")
async def my_orders(user: dict = Depends(get_current_user)):
    docs = await db.orders.find({"userId": user["id"]}).sort("created_at", -1).to_list(500)
    return [clean(d) for d in docs]


# ---------------------------------------------------------------------------
# Wallet
# ---------------------------------------------------------------------------
@api.get("/wallet")
async def get_wallet(user: dict = Depends(get_current_user)):
    u = await db.users.find_one({"id": user["id"]})
    txns = await db.wallet_txns.find({"userId": user["id"]}).sort("created_at", -1).to_list(200)
    return {"balance": u.get("wallet", 0), "transactions": [clean(t) for t in txns]}


@api.post("/wallet/add")
async def wallet_add(inp: WalletAddInput, user: dict = Depends(get_current_user)):
    if inp.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")
    await db.users.update_one({"id": user["id"]}, {"$inc": {"wallet": inp.amount}})
    txn = {"id": new_id(), "userId": user["id"], "type": "credit", "amount": inp.amount,
           "note": inp.note or "Added via Razorpay", "payment": inp.payment, "created_at": now_iso()}
    await db.wallet_txns.insert_one(txn)
    u = await db.users.find_one({"id": user["id"]})
    return {"balance": u.get("wallet", 0), "transaction": clean(txn)}


@api.post("/wallet/spend")
async def wallet_spend(inp: WalletSpendInput, user: dict = Depends(get_current_user)):
    if inp.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")
    u = await db.users.find_one({"id": user["id"]})
    if u.get("wallet", 0) < inp.amount:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance")
    await db.users.update_one({"id": user["id"]}, {"$inc": {"wallet": -inp.amount}})
    txn = {"id": new_id(), "userId": user["id"], "type": "debit", "amount": inp.amount,
           "note": inp.note or "Paid via wallet", "created_at": now_iso()}
    await db.wallet_txns.insert_one(txn)
    u = await db.users.find_one({"id": user["id"]})
    return {"balance": u.get("wallet", 0), "transaction": clean(txn)}


# ---------------------------------------------------------------------------
# Chat support (replies are manual — from admin only, no auto-bot)
# ---------------------------------------------------------------------------
@api.post("/chat/message")
async def chat_message(inp: ChatMessageInput, user: dict = Depends(get_current_user)):
    umsg = {"id": new_id(), "userId": user["id"], "userName": user.get("name"), "sender": "user",
            "text": inp.text, "topic": inp.topic, "created_at": now_iso(), "read": False}
    await db.chat_messages.insert_one(umsg)
    return {"messages": [clean(umsg)]}


FALLBACK_REPLY = "I'm here to help! You can book a 30-min doorstep repair, get an instant sell price, or shop accessories. What would you like to do?"


@api.post("/chat/ai")
async def chat_ai(inp: ChatAIInput, user: dict = Depends(get_current_user)):
    umsg = {"id": new_id(), "userId": user["id"], "userName": user.get("name"), "sender": "user",
            "text": inp.text, "topic": inp.topic, "page": inp.page, "created_at": now_iso(), "read": False}
    await db.chat_messages.insert_one(umsg)

    # dynamic real data
    prods = [clean(p) for p in await db.products.find({"active": True, "tags": "featured"}).to_list(6)]
    prod_txt = "; ".join(f"{p['name']} ₹{p['price']}" for p in prods) or "various accessories"
    coupons = [clean(c) for c in await db.coupons.find({"active": True}).to_list(10)]
    coup_txt = "; ".join(f"{c['code']} ({'₹'+str(c['value']) if c['type']=='flat' else str(c['value'])+'%'} off, min ₹{c.get('min_order',0)})" for c in coupons) or "none right now"
    last = await db.orders.find_one({"userId": user["id"]}, sort=[("created_at", -1)])
    last_txt = f"{last['type']} order — status {last['status']}, ₹{last['amount']}" if last else "no orders yet"
    cfg = await db.settings.find_one({"id": "appConfig"}) or {}
    bot_cfg = cfg.get("chatbot", {})
    faqs = bot_cfg.get("faqs", [])
    faq_txt = " | ".join(f"Q:{f.get('q')} A:{f.get('a')}" for f in faqs) or "none"

    system = (
        "You are FixitZ Assistant — a friendly, smart, slightly persuasive sales + support assistant for FixitZ, "
        "a 30-minute doorstep mobile repair, accessories shop, and buy/sell used-phone app in Jammu, India. "
        "Keep replies SHORT (2-4 sentences), simple India-focused English (a little Hindi is okay if the user uses it). "
        "ALWAYS end with one clear next-step CTA like 'Book repair now', 'Check your phone's price', 'View products', or 'Apply this coupon'. "
        "Guide the user toward action: booking a repair, selling a phone, buying a product, or applying a coupon. "
        "Repair has a 30-minute doorstep guarantee. For exact prices tell them to pick brand→model→issue on the Repair page, "
        "or answer condition questions on the Sell page for an instant estimate. Use ONLY the real data below; never invent prices. "
        f"Current page the user is on: {inp.page}. "
        f"Featured products: {prod_txt}. Active coupons: {coup_txt}. "
        f"User's wallet balance: ₹{user.get('wallet', 0)}. User's latest order: {last_txt}. "
        f"Admin FAQs: {faq_txt}."
    )

    prior = [clean(m) for m in await db.chat_messages.find({"userId": user["id"]}).sort("created_at", -1).to_list(9)]
    prior = list(reversed(prior[1:]))  # exclude the just-added msg, oldest first
    transcript = "\n".join(f"{'User' if m['sender']=='user' else 'Assistant'}: {m['text']}" for m in prior)
    content = (f"Conversation so far:\n{transcript}\n\nUser: {inp.text}" if transcript else inp.text)

    reply = FALLBACK_REPLY
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id=user["id"], system_message=system).with_model("openai", "gpt-5.4")
        reply = await chat.send_message(UserMessage(text=content))
    except Exception as e:
        logger.error(f"AI chat error: {e}")

    bot = {"id": new_id(), "userId": user["id"], "userName": "FixitZ AI", "sender": "bot",
           "text": reply, "topic": inp.topic, "created_at": now_iso(), "read": True}
    await db.chat_messages.insert_one(bot)
    return {"messages": [clean(umsg), clean(bot)]}


@api.get("/chat/messages")
async def chat_messages(user: dict = Depends(get_current_user)):
    docs = await db.chat_messages.find({"userId": user["id"]}).sort("created_at", 1).to_list(500)
    return [clean(d) for d in docs]


@api.get("/admin/chat")
async def admin_chat(user: dict = Depends(require_admin)):
    docs = [clean(d) for d in await db.chat_messages.find({}).sort("created_at", 1).to_list(3000)]
    threads = {}
    for m in docs:
        t = threads.setdefault(m["userId"], {"userId": m["userId"], "userName": m.get("userName"), "messages": [], "lastAt": ""})
        t["messages"].append(m)
        t["lastAt"] = m["created_at"]
        if m["sender"] == "user":
            t["userName"] = m.get("userName")
    return sorted(threads.values(), key=lambda x: x["lastAt"], reverse=True)


@api.post("/admin/chat/reply")
async def admin_chat_reply(inp: ChatReplyInput, user: dict = Depends(require_admin)):
    msg = {"id": new_id(), "userId": inp.userId, "userName": "FixitZ Support", "sender": "admin",
           "text": inp.text, "topic": "general", "created_at": now_iso(), "read": True}
    await db.chat_messages.insert_one(msg)
    return clean(msg)


# ---------------------------------------------------------------------------
# Payments (Razorpay)
# ---------------------------------------------------------------------------
@api.post("/payments/create-order")
async def payment_create_order(inp: PaymentOrderInput, user: dict = Depends(get_current_user)):
    amount_paise = int(round(inp.amount * 100))
    try:
        rzp_order = rzp_client.order.create({
            "amount": amount_paise, "currency": "INR",
            "receipt": new_id()[:20], "payment_capture": 1,
        })
    except Exception as e:
        logger.error(f"Razorpay order failed: {e}")
        raise HTTPException(status_code=502, detail="Payment gateway error")
    return {"order_id": rzp_order["id"], "amount": amount_paise, "currency": "INR",
            "key_id": os.environ['RAZORPAY_KEY_ID']}


@api.post("/payments/verify")
async def payment_verify(inp: PaymentVerifyInput, user: dict = Depends(get_current_user)):
    body = f"{inp.razorpay_order_id}|{inp.razorpay_payment_id}"
    expected = hmac.new(os.environ['RAZORPAY_KEY_SECRET'].encode(), body.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, inp.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment verification failed")
    return {"verified": True}


# ---------------------------------------------------------------------------
# Admin - generic CRUD factory
# ---------------------------------------------------------------------------
ADMIN_COLLECTIONS = {
    "sections": db.sections, "products": db.products, "categories": db.categories,
    "repair_brands": db.repair_brands, "repair_models": db.repair_models,
    "repair_issues": db.repair_issues, "repair_services": db.repair_services,
    "sell_devices": db.sell_devices, "sell_conditions": db.sell_conditions,
    "buy_phones": db.buy_phones, "coupons": db.coupons, "games": db.games,
}


def get_collection(name: str):
    coll = ADMIN_COLLECTIONS.get(name)
    if coll is None:
        raise HTTPException(status_code=404, detail="Unknown collection")
    return coll


@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_admin)):
    orders = [clean(o) for o in await db.orders.find({}).to_list(2000)]
    revenue = sum(o.get("amount", 0) for o in orders if o.get("status") != "cancelled")
    return {
        "users": await db.users.count_documents({}),
        "orders": len(orders),
        "revenue": revenue,
        "products": await db.products.count_documents({}),
        "pending": len([o for o in orders if o.get("status") == "pending"]),
        "repair_orders": len([o for o in orders if o.get("type") == "repair"]),
        "sell_requests": len([o for o in orders if o.get("type") == "sell"]),
        "recent_orders": sorted(orders, key=lambda x: x.get("created_at", ""), reverse=True)[:8],
    }


@api.put("/admin/settings")
async def admin_settings(inp: SettingsInput, user: dict = Depends(require_admin)):
    data = {k: v for k, v in inp.model_dump().items() if v is not None}
    await db.settings.update_one({"id": "appConfig"}, {"$set": data}, upsert=True)
    doc = await db.settings.find_one({"id": "appConfig"})
    return clean(doc)


@api.post("/admin/products/bulk")
async def admin_bulk_products(file: UploadFile = File(...), user: dict = Depends(require_admin)):
    content = (await file.read()).decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))
    inserted = 0
    for row in reader:
        doc = {
            "id": new_id(), "name": row.get("name", "").strip(),
            "description": row.get("description", ""),
            "price": float(row.get("price", 0) or 0),
            "mrp": float(row.get("mrp", 0) or 0),
            "category_id": row.get("category_id", ""),
            "image": row.get("image", ""),
            "stock": int(float(row.get("stock", 0) or 0)),
            "tags": [t.strip() for t in row.get("tags", "").split("|") if t.strip()],
            "active": True, "created_at": now_iso(),
        }
        if doc["name"]:
            await db.products.insert_one(doc)
            inserted += 1
    return {"inserted": inserted}


@api.get("/admin/orders")
async def admin_orders(user: dict = Depends(require_admin)):
    docs = await db.orders.find({}).sort("created_at", -1).to_list(2000)
    return [clean(d) for d in docs]


@api.put("/admin/orders/{order_id}/status")
async def admin_order_status(order_id: str, payload: GenericDoc, user: dict = Depends(require_admin)):
    status = payload.data.get("status")
    await db.orders.update_one({"id": order_id}, {"$set": {"status": status}})
    doc = await db.orders.find_one({"id": order_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    doc = clean(doc)
    asyncio.create_task(asyncio.to_thread(notify_order, dict(doc), status))
    return doc


@api.get("/admin/users")
async def admin_users(user: dict = Depends(require_admin)):
    docs = await db.users.find({}).to_list(2000)
    out = []
    for d in docs:
        d = clean(d); d.pop("password_hash", None)
        out.append(d)
    return out


# ---------------------------------------------------------------------------
# Tracking
# ---------------------------------------------------------------------------
@api.post("/track")
async def track(payload: GenericDoc):
    event = dict(payload.data)
    event["id"] = new_id()
    event["created_at"] = now_iso()
    await db.tracking.insert_one(event)
    alert = None
    if event.get("type") == "scroll" and event.get("seconds", 0) > 60:
        alert = "high_scroll"
    if event.get("type") == "model_view" and event.get("seconds", 0) > 13:
        alert = "model_interest"
    if alert:
        await db.admin_alerts.insert_one({"id": new_id(), "alert": alert, "event": clean(event), "created_at": now_iso()})
    return {"ok": True}


@api.get("/admin/alerts")
async def admin_alerts(user: dict = Depends(require_admin)):
    docs = await db.admin_alerts.find({}).sort("created_at", -1).to_list(100)
    return [clean(d) for d in docs]


@api.post("/admin/wallet/adjust")
async def admin_wallet_adjust(payload: GenericDoc, user: dict = Depends(require_admin)):
    user_id = payload.data.get("userId")
    amount = float(payload.data.get("amount") or 0)
    note = payload.data.get("note")
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if not amount:
        raise HTTPException(status_code=400, detail="Amount required")
    new_bal = target.get("wallet", 0) + amount
    if new_bal < 0:
        raise HTTPException(status_code=400, detail="Balance cannot go negative")
    await db.users.update_one({"id": user_id}, {"$inc": {"wallet": amount}})
    txn = {"id": new_id(), "userId": user_id, "type": "credit" if amount >= 0 else "debit",
           "amount": abs(amount), "note": note or ("Admin credit" if amount >= 0 else "Admin debit"),
           "created_at": now_iso()}
    await db.wallet_txns.insert_one(txn)
    return {"balance": new_bal, "transaction": clean(txn)}


@api.get("/admin/wallet/txns")
async def admin_wallet_txns(user_id: str, user: dict = Depends(require_admin)):
    txns = await db.wallet_txns.find({"userId": user_id}).sort("created_at", -1).to_list(500)
    return [clean(t) for t in txns]


@api.get("/admin/referrals")
async def admin_referrals(user: dict = Depends(require_admin)):
    users = [clean(u) for u in await db.users.find({}).to_list(5000)]
    ref_txns = await db.wallet_txns.find({"note": {"$regex": "Referral bonus"}}).to_list(5000)
    out = []
    for u in users:
        referred = [r for r in users if r.get("referredBy") == u.get("referralCode")]
        if not referred:
            continue
        reward = sum(t.get("amount", 0) for t in ref_txns if t.get("userId") == u.get("id"))
        out.append({
            "id": u.get("id"), "name": u.get("name"), "email": u.get("email"),
            "referralCode": u.get("referralCode"), "count": len(referred), "reward": reward,
            "referred": [{"name": r.get("name"), "email": r.get("email"), "created_at": r.get("created_at")} for r in referred],
        })
    out.sort(key=lambda x: x["count"], reverse=True)
    return out


@api.post("/admin/upload")
async def admin_upload(file: UploadFile = File(...), user: dict = Depends(require_admin)):
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "bin"
    path = f"{APP_NAME}/uploads/{new_id()}.{ext}"
    data = await file.read()
    ct = file.content_type or MIME.get(ext, "application/octet-stream")
    result = put_object(path, data, ct)
    rp = result.get("path", path)
    await db.files.insert_one({"id": new_id(), "storage_path": rp, "original_filename": file.filename,
        "content_type": ct, "size": result.get("size", len(data)), "is_deleted": False, "created_at": now_iso()})
    return {"path": rp, "url": f"/api/files/{rp}"}


@api.get("/files/{path:path}")
async def serve_file(path: str):
    rec = await db.files.find_one({"storage_path": path, "is_deleted": False})
    try:
        data, got_ct = get_object(path)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    ct = (rec.get("content_type") if rec else None) or got_ct
    return Response(content=data, media_type=ct, headers={"Cache-Control": "public, max-age=31536000"})


async def _get_tiers():
    doc = await db.repair_config.find_one({"id": "tiers"})
    return doc.get("data") if doc and doc.get("data") else DEFAULT_TIERS


async def _issue_names():
    issues = await db.repair_issues.find({}).to_list(100)
    m = {i["key"]: i.get("name", i["key"]) for i in issues}
    for k, n in {"screen": "Screen Replacement", "battery": "Battery Replacement", "charging_port": "Charging Port Repair", "speaker": "Speaker Repair", "back_panel": "Back Panel Replacement"}.items():
        m.setdefault(k, n)
    return m


async def _set_service(model_id, key, name, price, mode):
    existing = await db.repair_services.find_one({"model_id": model_id, "issue": key})
    if existing:
        cur = existing.get("override_price") if existing.get("override_price") is not None else existing.get("base_price")
        if mode == "fill" and cur:
            return False
        await db.repair_services.update_one({"id": existing["id"]}, {"$set": {"base_price": price, "override_price": price, "active": True}})
    else:
        await db.repair_services.insert_one({"id": new_id(), "model_id": model_id, "issue": key, "issue_name": name, "base_price": price, "override_price": price, "active": True})
    return True


@api.get("/admin/repair-tiers")
async def admin_get_tiers(user: dict = Depends(require_admin)):
    return await _get_tiers()


@api.put("/admin/repair-tiers")
async def admin_put_tiers(payload: GenericDoc, user: dict = Depends(require_admin)):
    await db.repair_config.update_one({"id": "tiers"}, {"$set": {"id": "tiers", "data": payload.data}}, upsert=True)
    return payload.data


@api.post("/admin/repair/apply-tiers")
async def admin_apply_tiers(payload: GenericDoc, user: dict = Depends(require_admin)):
    mode = payload.data.get("mode", "fill")
    tiers = await _get_tiers()
    names = await _issue_names()
    keys = ["battery", "speaker", "charging_port", "back_panel"]
    models = await db.repair_models.find({}).to_list(5000)
    updated = 0
    for m in models:
        screen = await db.repair_services.find_one({"model_id": m["id"], "issue": "screen"})
        if not screen:
            continue
        sp = screen.get("override_price") if screen.get("override_price") is not None else screen.get("base_price", 0)
        band = band_for(tiers, sp)
        for k in keys:
            if band.get(k) is not None and await _set_service(m["id"], k, names.get(k, k), band[k], mode):
                updated += 1
    return {"updated": updated, "models": len(models)}


@api.post("/admin/repair/bulk-import")
async def admin_bulk_import(payload: GenericDoc, user: dict = Depends(require_admin)):
    rows = payload.data.get("rows", [])
    allow_new = payload.data.get("allow_new_brands", True)
    tiers = await _get_tiers()
    names = await _issue_names()
    keys = ["battery", "speaker", "charging_port", "back_panel"]
    brands = await db.repair_brands.find({}).to_list(1000)
    bmap = {b["name"].strip().lower(): b for b in brands}
    created_models = created_brands = 0
    skipped = []
    for idx, row in enumerate(rows):
        name = (row.get("name") or "").strip()
        bname = (row.get("brand") or "").strip()
        sp = row.get("screen_price")
        if not name or not bname or sp in (None, ""):
            skipped.append({"row": idx + 1, "reason": "missing name/brand/screen_price"}); continue
        try:
            sp = float(sp)
        except (TypeError, ValueError):
            skipped.append({"row": idx + 1, "reason": "invalid screen_price"}); continue
        b = bmap.get(bname.lower())
        if not b:
            if not allow_new:
                skipped.append({"row": idx + 1, "reason": f"unknown brand '{bname}'"}); continue
            b = {"id": new_id(), "name": bname, "active": True, "order": len(bmap) + 1, "image": f"https://logo.clearbit.com/{bname.split()[0].lower()}.com"}
            await db.repair_brands.insert_one(b); bmap[bname.lower()] = b; created_brands += 1
        existing_m = await db.repair_models.find_one({"brand_id": b["id"], "name": name})
        mid = existing_m["id"] if existing_m else new_id()
        if not existing_m:
            await db.repair_models.insert_one({"id": mid, "brand_id": b["id"], "name": name, "active": True, "image": REPAIR_PHONE_IMG})
            created_models += 1
        await _set_service(mid, "screen", names.get("screen", "Screen Replacement"), sp, "overwrite")
        band = band_for(tiers, sp)
        for k in keys:
            if band.get(k) is not None:
                await _set_service(mid, k, names.get(k, k), band[k], "overwrite")
    return {"created_models": created_models, "created_brands": created_brands, "skipped": skipped}


@api.post("/price-request")
async def create_price_request(inp: PriceRequestInput):
    doc = {"id": new_id(), "type": inp.type, "brand": inp.brand, "model": inp.model,
           "phone": inp.phone, "fault": inp.fault, "urgent": bool(inp.urgent),
           "status": "new", "quote": None, "reply": None, "created_at": now_iso()}
    await db.price_requests.insert_one(doc)
    settings = await db.settings.find_one({"id": "appConfig"}) or {}
    admin_email = settings.get("adminAlertEmail") or os.environ.get("ADMIN_EMAIL", "")
    admin_phone = settings.get("adminAlertPhone") or settings.get("supportPhone") or ""
    from notifications import send_email, send_sms
    tag = "URGENT " if inp.urgent else ""
    body = f"{tag}Price request ({inp.type}): {inp.brand or ''} {inp.model} | Fault: {inp.fault or '-'} | Phone: {inp.phone}"
    if admin_email:
        asyncio.create_task(asyncio.to_thread(send_email, admin_email, f"{tag}Price Request — {inp.model}", f"<div style='font-family:Arial'><h3>{tag}New Price Request</h3><p>{body}</p></div>"))
    if admin_phone:
        asyncio.create_task(asyncio.to_thread(send_sms, admin_phone, body))
    return clean(doc)


@api.get("/admin/price-requests")
async def admin_list_price_requests(user: dict = Depends(require_admin)):
    docs = await db.price_requests.find({}).sort("created_at", -1).to_list(500)
    return [clean(d) for d in docs]


@api.put("/admin/price-requests/{rid}")
async def admin_update_price_request(rid: str, payload: GenericDoc, user: dict = Depends(require_admin)):
    upd = {k: v for k, v in payload.data.items() if k in ("status", "quote", "reply")}
    await db.price_requests.update_one({"id": rid}, {"$set": upd})
    doc = await db.price_requests.find_one({"id": rid})
    if not doc:
        raise HTTPException(status_code=404, detail="Request not found")
    if upd.get("quote") is not None and doc.get("phone"):
        from notifications import send_sms
        msg = f"FixitZ: Your quote for {doc.get('model')} is Rs.{upd['quote']}. {upd.get('reply') or 'Reply to confirm booking.'}"
        asyncio.create_task(asyncio.to_thread(send_sms, doc["phone"], msg))
    return clean(doc)


@api.delete("/admin/repair_brands/{bid}")
async def delete_brand_cascade(bid: str, user: dict = Depends(require_admin)):
    models = await db.repair_models.find({"brand_id": bid}).to_list(2000)
    mids = [m["id"] for m in models]
    if mids:
        await db.repair_services.delete_many({"model_id": {"$in": mids}})
    await db.repair_models.delete_many({"brand_id": bid})
    await db.repair_brands.delete_one({"id": bid})
    return {"deleted": True, "models_removed": len(mids)}


class AdminAIInput(BaseModel):
    text: str


ADMIN_AI_ACTIONS = """
Available actions (pick exactly ONE):
- create_product: params {name, price, mrp?, description?, image?}
- update_price: params {query, price}   (query matches an existing product name)
- delete_product: params {query}
- make_free: params {query}             (sets product price to 0)
- create_coupon: params {code, type(flat|percent|free_product), value, min_order?}
- set_theme: params {primaryColor?, accentColor?, pageBg?}   (hex colors)
- set_header: params {appName?, tagline?, city?}
- toggle_section: params {type, visible}  (section types: banner, category_grid, flash_sale, exclusive_deals, full_shop, shop_products, wallet, referral)
- flash_add: params {query, flash_price?}
- bulk_create_products: params {products:[{name, price, mrp?, description?, image?}, ...]}   (create MANY products at once)
- flash_category: params {category, discount_percent?, flash_price?}   (put an entire category on flash sale in one go)
- send_email: params {to, subject, body}
- stats: params {}                       (returns product/order/user counts + revenue)
- answer: params {}                      (no change, just reply in message)
"""


async def _find_product(query):
    if not query:
        return None
    return await db.products.find_one({"name": {"$regex": query, "$options": "i"}})


async def _run_admin_action(action, p):
    try:
        if action == "create_product":
            doc = {"id": new_id(), "name": p.get("name", "New Product"), "price": int(p.get("price") or 0),
                   "mrp": int(p.get("mrp") or p.get("price") or 0), "description": p.get("description", ""),
                   "image": p.get("image", ""), "tags": [], "stock": 100, "active": True, "created_at": now_iso()}
            await db.products.insert_one(doc)
            return {"created": doc["name"], "id": doc["id"]}
        if action == "update_price":
            pr = await _find_product(p.get("query", ""))
            if not pr:
                return {"error": "product not found"}
            await db.products.update_one({"id": pr["id"]}, {"$set": {"price": int(p.get("price") or 0)}})
            return {"updated": pr["name"], "price": int(p.get("price") or 0)}
        if action == "make_free":
            pr = await _find_product(p.get("query", ""))
            if not pr:
                return {"error": "product not found"}
            await db.products.update_one({"id": pr["id"]}, {"$set": {"price": 0, "is_free": True}})
            return {"free": pr["name"]}
        if action == "delete_product":
            pr = await _find_product(p.get("query", ""))
            if not pr:
                return {"error": "product not found"}
            await db.products.delete_one({"id": pr["id"]})
            return {"deleted": pr["name"]}
        if action == "create_coupon":
            doc = {"id": new_id(), "code": (p.get("code", "") or "").upper(), "type": p.get("type", "flat"),
                   "value": int(p.get("value") or 0), "min_order": int(p.get("min_order") or 0), "active": True, "created_at": now_iso()}
            await db.coupons.insert_one(doc)
            return {"coupon": doc["code"]}
        if action == "set_theme":
            upd = {k: v for k, v in p.items() if k in ("primaryColor", "accentColor", "pageBg") and v}
            if upd:
                await db.settings.update_one({"id": "appConfig"}, {"$set": upd}, upsert=True)
            return {"theme": upd}
        if action == "set_header":
            upd = {k: v for k, v in p.items() if k in ("appName", "tagline", "city") and v}
            if upd:
                await db.settings.update_one({"id": "appConfig"}, {"$set": upd}, upsert=True)
            return {"header": upd}
        if action == "toggle_section":
            vis = bool(p.get("visible", True))
            r = await db.sections.update_many({"type": p.get("type")}, {"$set": {"visible": vis}})
            return {"section": p.get("type"), "visible": vis, "matched": r.matched_count}
        if action == "flash_add":
            pr = await _find_product(p.get("query", ""))
            if not pr:
                return {"error": "product not found"}
            tags = set(pr.get("tags", []))
            tags.add("flash")
            upd = {"tags": list(tags)}
            if p.get("flash_price") is not None:
                upd["flash_price"] = int(p["flash_price"])
            await db.products.update_one({"id": pr["id"]}, {"$set": upd})
            return {"flash_added": pr["name"]}
        if action == "send_email":
            from notifications import send_email
            ok = await asyncio.to_thread(send_email, p.get("to", ""), p.get("subject", "FixitZ"), f"<div style='font-family:Arial'>{p.get('body', '')}</div>")
            return {"email_sent": ok, "to": p.get("to")}
        if action == "bulk_create_products":
            items = p.get("products") or []
            names = []
            for it in items:
                doc = {"id": new_id(), "name": it.get("name", "Product"), "price": int(it.get("price") or 0),
                       "mrp": int(it.get("mrp") or it.get("price") or 0), "description": it.get("description", ""),
                       "image": it.get("image", ""), "tags": [], "stock": 100, "active": True, "created_at": now_iso()}
                await db.products.insert_one(doc)
                names.append(doc["name"])
            return {"created": names, "count": len(names)}
        if action == "flash_category":
            cat = (p.get("category") or "").strip()
            pct = p.get("discount_percent")
            fp = p.get("flash_price")
            cat_ids = [c["id"] for c in await db.categories.find({"name": {"$regex": cat, "$options": "i"}}).to_list(20)]
            q = {"$or": [{"category_id": {"$in": cat_ids or ["__none__"]}}, {"tags": {"$regex": cat, "$options": "i"}}, {"name": {"$regex": cat, "$options": "i"}}]}
            prods = await db.products.find(q).to_list(2000)
            n = 0
            for pr in prods:
                tags = set(pr.get("tags", []))
                tags.add("flash")
                upd = {"tags": list(tags)}
                if fp is not None:
                    upd["flash_price"] = int(fp)
                elif pct is not None:
                    upd["flash_price"] = max(0, round(float(pr.get("price", 0)) * (1 - float(pct) / 100)))
                await db.products.update_one({"id": pr["id"]}, {"$set": upd})
                n += 1
            return {"flash_category": cat, "products_updated": n}
        if action == "stats":
            products = await db.products.count_documents({})
            orders = await db.orders.count_documents({})
            users = await db.users.count_documents({})
            revenue = 0.0
            async for o in db.orders.find({}):
                revenue += float(o.get("amount") or 0)
            return {"products": products, "orders": orders, "users": users, "revenue": round(revenue)}
    except Exception as e:
        return {"error": str(e)}
    return None


@api.post("/admin/ai")
async def admin_ai(inp: AdminAIInput, user: dict = Depends(require_admin)):
    system = (
        "You are the FixitZ Admin Assistant for the store owner. Interpret the owner's instruction and pick ONE action. "
        "Respond with STRICT JSON only (no markdown, no code fences) as: "
        '{"action":"<action>","params":{...},"message":"<short confirmation for the admin>"}. '
        "If it's a question or unclear, use action 'answer' with the reply in message. "
        "Prices are integers in INR. Never invent product IDs; use the product name in 'query'. " + ADMIN_AI_ACTIONS
    )
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id="admin-" + user["id"], system_message=system).with_model("openai", "gpt-5.4")
        raw = await chat.send_message(UserMessage(text=inp.text))
    except Exception as e:
        logger.error(f"Admin AI error: {e}")
        return {"message": "AI is unavailable right now. Please try again.", "action": "error", "result": None}
    txt = (raw or "").strip()
    try:
        data = json.loads(txt[txt.find("{"):txt.rfind("}") + 1])
    except Exception:
        return {"message": raw, "action": "answer", "result": None}
    action = data.get("action", "answer")
    params = data.get("params", {}) or {}
    message = data.get("message", "Done.")
    result = await _run_admin_action(action, params)
    await db.admin_ai_log.insert_one({"id": new_id(), "adminId": user["id"], "text": inp.text, "action": action, "params": params, "created_at": now_iso()})
    return {"message": message, "action": action, "result": result}


# --- Generic collection CRUD (defined last so literal routes take priority) ---
@api.get("/admin/{collection}")
async def admin_list(collection: str, user: dict = Depends(require_admin)):
    coll = get_collection(collection)
    docs = await coll.find({}).to_list(2000)
    docs = [clean(d) for d in docs]
    if collection == "sections":
        docs.sort(key=lambda x: x.get("order", 0))
    return docs


@api.post("/admin/{collection}")
async def admin_create(collection: str, payload: GenericDoc, user: dict = Depends(require_admin)):
    coll = get_collection(collection)
    doc = dict(payload.data)
    doc["id"] = new_id()
    doc["created_at"] = now_iso()
    await coll.insert_one(doc)
    return clean(doc)


@api.put("/admin/{collection}/{item_id}")
async def admin_update(collection: str, item_id: str, payload: GenericDoc, user: dict = Depends(require_admin)):
    coll = get_collection(collection)
    data = dict(payload.data); data.pop("id", None); data.pop("_id", None)
    await coll.update_one({"id": item_id}, {"$set": data})
    doc = await coll.find_one({"id": item_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return clean(doc)


@api.delete("/admin/{collection}/{item_id}")
async def admin_delete(collection: str, item_id: str, user: dict = Depends(require_admin)):
    coll = get_collection(collection)
    await coll.delete_one({"id": item_id})
    return {"deleted": True}


# ---------------------------------------------------------------------------
# App wiring
# ---------------------------------------------------------------------------
app.include_router(api)
app.add_middleware(
    CORSMiddleware, allow_credentials=False,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index("id", unique=True)
        await db.users.create_index("email", unique=True)
    except Exception as e:
        logger.error(f"Index creation skipped: {e}")
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    for step in ("seed_admin", "seed_demo_data", "migrate"):
        try:
            await globals()[step]()
        except Exception as e:
            logger.error(f"Startup step {step} failed (continuing): {e}")


async def seed_admin():
    admins = [(os.environ["ADMIN_EMAIL"].lower(), os.environ["ADMIN_PASSWORD"])]
    extra_emails = [e.strip().lower() for e in os.environ.get("EXTRA_ADMIN_EMAILS", "").split(",") if e.strip()]
    extra_pw = os.environ.get("EXTRA_ADMIN_PASSWORD", "")
    for e in extra_emails:
        admins.append((e, extra_pw))
    for email, pw in admins:
        existing = await db.users.find_one({"email": email})
        if not existing:
            await db.users.insert_one({
                "id": new_id(), "name": email.split("@")[0], "email": email, "phone": "9906000000",
                "password_hash": hash_password(pw), "role": "admin", "wallet": 0,
                "referralCode": email[:5].upper(), "created_at": now_iso(),
            })
            logger.info(f"Admin seeded: {email}")
        else:
            await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(pw), "role": "admin"}})


async def seed_demo_data():
    if await db.settings.find_one({"id": "appConfig"}):
        return  # already seeded
    from seed_data import build_seed
    data = build_seed(new_id, now_iso)
    await db.settings.insert_one(data["settings"])
    for coll_name, items in data["collections"].items():
        if items:
            await ADMIN_COLLECTIONS_OR_DB(coll_name).insert_many(items)
    logger.info("Demo data seeded")


def ADMIN_COLLECTIONS_OR_DB(name):
    coll = ADMIN_COLLECTIONS.get(name)
    return coll if coll is not None else db[name]


async def migrate():
    cfg = await db.settings.find_one({"id": "appConfig"})
    if not cfg:
        return
    updates = {}
    feats = cfg.get("features", {})
    feat_defaults = {"wallet": True, "referral": True, "spin": True, "flash": True, "chat": True, "repair": True, "buy": True, "sell": True}
    merged = {**feat_defaults, **feats}
    if merged != feats:
        updates["features"] = merged
    if "chatbot" not in cfg:
        updates["chatbot"] = {"greeting": "Hi! 👋 I'm your FixitZ assistant. I can help you book a 30-min repair, get an instant price for your old phone, or find the best accessories. What do you need?", "faqs": []}
    if cfg.get("builderVersion", 1) < 2:
        from seed_data import build_sections_v2
        await db.sections.delete_many({})
        await db.sections.insert_many(build_sections_v2(new_id))
        updates["builderVersion"] = 2
        updates["theme"] = {"primary": "#FF6A00"}
    if cfg.get("dataVersion", 0) < 3:
        from seed_data import build_repair_dataset_v3, build_sell_dataset_v3
        ds = build_repair_dataset_v3(new_id)
        await db.repair_brands.delete_many({}); await db.repair_brands.insert_many(ds["brands"])
        await db.repair_issues.delete_many({}); await db.repair_issues.insert_many(ds["issues"])
        await db.repair_models.delete_many({}); await db.repair_models.insert_many(ds["models"])
        await db.repair_services.delete_many({}); await db.repair_services.insert_many(ds["services"])
        sells = build_sell_dataset_v3(new_id)
        await db.sell_devices.delete_many({}); await db.sell_devices.insert_many(sells)
        updates["dataVersion"] = 3
        logger.info(f"Imported {len(ds['models'])} repair models, {len(sells)} sell devices")
    if not await db.sections.find_one({"type": "exclusive_deals"}):
        flash = await db.sections.find_one({"type": "flash_sale"})
        order = (flash.get("order", 5) + 1) if flash else 6
        await db.sections.insert_one({
            "id": new_id(), "type": "exclusive_deals", "title": "Exclusive Discounts",
            "visible": True, "order": order,
            "config": {"tag": "exclusive", "bg": "#F3E8FF", "subtitle": "Handpicked deals just for you"},
        })
        prods = await db.products.find({"active": True}).to_list(20)
        for p in prods[:3]:
            tags = set(p.get("tags", [])); tags.add("exclusive")
            await db.products.update_one({"id": p["id"]}, {"$set": {"tags": list(tags)}})
        logger.info("Seeded exclusive_deals section")
    if not await db.sections.find_one({"type": "full_shop"}):
        last = await db.sections.find({}).sort("order", -1).to_list(1)
        order = (last[0].get("order", 20) + 1) if last else 99
        await db.sections.insert_one({
            "id": new_id(), "type": "full_shop", "title": "The Full Shop",
            "visible": True, "order": order,
            "config": {"subtitle": "Everything in one place"},
        })
        logger.info("Seeded full_shop section")
    if updates:
        await db.settings.update_one({"id": "appConfig"}, {"$set": updates})
        logger.info("Migration applied")


@app.on_event("shutdown")
async def shutdown():
    client.close()
