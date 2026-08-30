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
import razorpay
import asyncio
from notifications import notify_order, notify_customer_new_order, notify_admin_new_order
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


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    user = clean(user)
    user.pop("password_hash", None)
    return user


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
    order = {
        "id": new_id(), "userId": user["id"], "userName": user.get("name"),
        "userPhone": user.get("phone"), "userEmail": user.get("email"),
        "type": inp.type, "items": inp.items, "amount": inp.amount,
        "details": inp.details, "address": inp.address, "payment": inp.payment,
        "status": "pending", "created_at": now_iso(),
    }
    await db.orders.insert_one(order)
    settings = await db.settings.find_one({"id": "appConfig"}) or {}
    admin_email = settings.get("adminAlertEmail") or os.environ.get("ADMIN_EMAIL", "")
    admin_phone = settings.get("adminAlertPhone") or settings.get("supportPhone") or ""
    snapshot = clean(dict(order))
    asyncio.create_task(asyncio.to_thread(notify_customer_new_order, snapshot))
    asyncio.create_task(asyncio.to_thread(notify_admin_new_order, snapshot, admin_email, admin_phone))
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
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    await seed_admin()
    await seed_demo_data()
    await migrate()


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
