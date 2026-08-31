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

## Implemented (2026-08-30 update)
- ✅ Coupon admin CRUD UI at /admin/coupons (flat/percent, min-order, max-discount cap, expiry, active) — reuses CrudManager, backend generic factory. Verified via UI + curl.
- ✅ Order notifications engine (`backend/notifications.py`): branded HTML email via SendGrid + SMS via Bulk Blaster (configurable). Fires on order placement (pending) and every admin status change. Non-blocking (asyncio.to_thread), fails safe.
  - Email LIVE: SendGrid sender = no-reply@fixitz.in (domain fixitZ.in authenticated). Verified 202 send.
  - SMS DISABLED: awaiting Bulk Blaster endpoint URL + DLT sender ID + template ID. Env keys present (BULKBLASTER_*), send_sms self-skips until configured.
- ✅ Smart header search routing (AppLayout): repair keywords → /repair, sell/exchange → /sell, refurbished/used → /buy, else /shop. (Fixes "search showed accessories for repair terms".)
- ✅ Removed intrusive AI chat auto-popup (was hijacking checkout after 10s); chat FAB retained.

## Implemented (2026-08-31 wave 7)
- ✅ Logo/icon loading: header shows 'F' box with logo overlaid (onError removes broken img); category icons render lucide tile with optional image overlay (onError fallback). No broken-image placeholders.
- ✅ Brand→Model cascade delete: deleting a repair brand removes its models + services (backend DELETE /admin/repair_brands/{id}). CrudManager now invalidates all admin queries so sibling tabs refresh.
- ✅ Repair brand & model images = direct upload (ImageUpload), not URL.
- ✅ Splash logo now above animation lines (z-10) — no longer hidden.
- Verified: testing agent 5/5 + backend curl.

## Deferred / needs scoping
- Admin AI assistant with "full code + project control, even edit website/send mail": an in-app bot cannot safely edit the codebase or control the deployment. Proposed scoped version: an admin chat that uses the LLM to perform ALLOWED actions via existing admin APIs (create/edit products, toggle sections, draft/send emails, answer analytics) — confirm scope.

## Implemented (2026-08-30 wave 6)
- ✅ Price Request system: customers who can't find their model tap "Request a price" (Sell & Repair) or get an auto-popup after 12s of no selection on Repair. Sends model + phone (+ fault for repair, marked URGENT) to admin via email/SMS. Backend POST /api/price-request, admin GET/PUT /api/admin/price-requests.
- ✅ Price Request Inbox admin page (/admin/price-requests): see requests, send a quote (auto-texts customer) or close.
- ✅ "Other Model" option in Sell and Repair flows (RequestPriceModal component).
- ✅ Section Background Editor confirmed working end-to-end (Homepage Builder bg color applies live on home).
- Verified: backend curl (create/list/quote). Frontend compiles. NOTE: user is testing this wave MANUALLY (no testing agent run).

## Implemented (2026-08-30 wave 5)
- ✅ Combined SEARCH: header search → /search showing BOTH products and repair models. Backend GET /api/search.
- ✅ Free Product Management admin page /admin/free-products (mark/unmark products free, approve/reject free-order claims). Free-product coupon type added to Coupons admin.
- ✅ Dynamic THEME from admin: Settings → Primary/Accent/Page-Background colors applied live via ThemeInjector (CSS vars + override).
- ✅ Hero banner now full-WIDTH edge-to-edge (h-64). Product pages have "More Products"/related section. Splash "loading bar" removed (sound best-effort on gesture).
- Verified: testing agent 7/7 100% + backend curl. Free-limit + awaiting_approval approval flow works.
- Deferred: Sell/Repair "Other Model" input + repair "Request Price → admin" flow.

## Implemented (2026-08-30 wave 4)
- ✅ Direct image UPLOAD across the admin panel (object storage) replacing all URL inputs: Products, Refurbished/Buy, Banners, Category icons, and Logo. Reusable `ImageUpload` component → POST /api/admin/upload, served via public GET /api/files/{path}. Backend `storage.py` (Emergent object storage, EMERGENT_LLM_KEY).
- ✅ Header logo now uploadable from Admin → Settings; header renders the logo image when set.
- ✅ "The Full Shop" section added at the end of the homepage (type full_shop, seeded).
- ✅ Theme switched to Shopee Orange: primary #EE4D2D, accent #D0011B, light #FFF0EC (tailwind + index.css + splash + razorpay theme + admin builder).
- Verified: backend curl (upload/serve 200) + testing agent (6/6 flows 100%).

## Deferred / next (requested, not yet built)
- Repair pricing TIERS + JSON bulk import: auto-derive Battery/Speaker/Charging/Back from Screen price bands; "Bulk Import · Models + Screen Prices" (paste JSON, auto-create brands, auto-fill from tier bands).
- Free product per-person LIMIT + account approval workflow.

## Implemented (2026-08-30 wave 3)
- ✅ Fixed product-detail CTA hidden behind bottom nav; now shows "Add to Cart" + "Buy Now" above nav (bottom-[74px]). Same fix for Cart checkout bar.
- ✅ Flash Deals home section: auto-scrolls, compact cards (~3 visible), "See all" → /flash.
- ✅ New Exclusive Discounts home section (type exclusive_deals, tag "exclusive", auto-scroll). Seeded via migrate; editable in Homepage Builder.
- ✅ Category icons support image/picture (image URL overrides lucide icon) — admin + home render.
- ✅ Admin control of referral reward amount (Settings → Referral Reward) via settings.referralReward.
- Verified: backend curl + testing agent (6/6 flows 100%).

## Implemented (2026-08-30 update)
- ✅ Order notifications: admin new-order alert (email+SMS, exact templates) + customer confirmation ("Order #X confirmed. We'll contact you soon."). Fires on placement (customer+admin) and status changes (customer). Non-blocking. Admin contact via Settings adminAlertEmail/adminAlertPhone.
- ✅ Sound system: customer success chime on order placement (Cart + Repair), admin new-order alert ding (AdminOrders, with Sound On/Off toggle), splash whoosh on load. Web Audio, no assets (`frontend/src/lib/sounds.js`).
- ✅ Flash Sale — dedicated ADMIN page /admin/flash-sale (add/remove products, per-product flash_price, countdown timer via settings.flashSaleEndsAt) + customer page /flash (live countdown + grid, linked from home "See all"). Endpoint GET /api/flash-sale.
- ✅ Wallet management ADMIN page /admin/wallet (add/deduct any user's balance + view transactions). POST /api/admin/wallet/adjust, GET /api/admin/wallet/txns.
- ✅ Referral system — capture referral_code at signup (sets referredBy, credits referrer settings.referralReward=₹100 to wallet) + ADMIN tracking page /admin/referrals (referrers, referred users, rewards). GET /api/admin/referrals.
- ✅ Coupon admin CRUD UI at /admin/coupons.
- ✅ Smart header search routing (repair/sell/buy/shop) + removed intrusive AI chat auto-popup.
- All above verified: backend via curl, frontend via testing agent (6/6 flows 100%).

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
