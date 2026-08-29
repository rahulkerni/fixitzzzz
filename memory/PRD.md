# FixitZ — Product Requirements Document

## Original Problem Statement
Fully dynamic, admin-controlled hybrid super-app for **FixitZ** (Jammu-based), combining:
1. Mobile repair — 30-minute doorstep service
2. Accessories e-commerce (Shop)
3. Buy & Sell used phones (Cashify-style dynamic pricing)
Shopee-style UX (orange/white/black), everything controlled from admin (no hardcoded content), near real-time updates.

## Stack (as built)
- Frontend: React (CRA + craco), TailwindCSS, Framer Motion, React Query (polling for real-time)
- Backend: FastAPI + MongoDB (motor)
- Auth: JWT email+password (Bearer token in localStorage `fixitz_token`)
- Payments: Razorpay (LIVE keys in backend/.env — real charges)

## User Personas
- Customer: books repairs, shops accessories, sells old phone, buys refurbished.
- Admin/Owner (shamthemanu@gmail.com): controls 100% of app content via /admin.

## Core Requirements (static)
- Dynamic homepage from `sections` collection (banner, repair_service, shop_products, flash_sale, sell_phone, buy_phone, referral, video, custom).
- Repair engine: brand→model→issue, auto pricing (base<800 ×2.5, 800–1300 ×2.3, >1300 ×2, manual override).
- Shop: categories, cart, checkout, free/featured/flash tags, CSV bulk upload.
- Sell: device base price − condition deductions (× multipliers) → instant quote + free pickup.
- Buy: refurbished inventory with condition/price/stock, filters.
- Orders: repair/product/sell/buy, status flow pending→confirmed→in-progress→completed→cancelled.
- Admin panel controls all of the above with live updates.

## Implemented (2026-06-29)
- ✅ JWT auth (register/login/me), admin seeding (shamthemanu@gmail.com), role gating.
- ✅ Dynamic homepage renderer with 9 section types + seed data.
- ✅ Repair 4-step booking flow + pricing engine + Razorpay pay.
- ✅ Shop, product detail, cart, coupon apply, checkout via Razorpay.
- ✅ Sell flow (quote engine + breakdown + pickup booking, no payment).
- ✅ Buy refurbished with filters.
- ✅ Orders (user) + Account + wallet/referral display.
- ✅ Full admin panel: Dashboard, Sections, Products (+CSV), Repair (brands/models/issues/services), Sell (devices/conditions), Buy, Orders (live status), Users, Settings.
- ✅ Coupons validate endpoint; user tracking endpoint with admin alerts (scroll>60s, model view>13s).
- ✅ Razorpay create-order + signature verify.
- Verified: 28/28 backend tests pass, all frontend flows pass.

## Backlog / Remaining
- P1: Gamification (Spin & Win wheel UI, scratch cards, daily rewards) — backend `games` seeded, UI pending.
- P1: Wallet add-money via Razorpay + cashback rules engine.
- P1: Phone OTP login (Twilio) — currently email+password only.
- P2: SMS/Email notifications on order events (Resend/Twilio).
- P2: Emergent-managed Google login.
- P2: Coupon admin CRUD UI (endpoint exists), section drag-reorder UI.
- P2: Self-host brand logos to avoid external DNS blips.

## Next Tasks
- Build Spin & Win gamification UI wired to `/api/games`.
- Wallet top-up + cashback.
- Notifications (order placed/confirmed/cancelled).
