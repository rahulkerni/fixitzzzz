"""Demo seed data for FixitZ. Populates a Shopee-style dynamic super-app."""

REPAIR_IMG = "https://images.unsplash.com/photo-1550041473-d296a3a8a18a?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"
REPAIR_IMG2 = "https://images.pexels.com/photos/6754839/pexels-photo-6754839.jpeg?auto=compress&cs=tinysrgb&w=800"
SHOP_BANNER = "https://images.unsplash.com/photo-1573739022854-abceaeb585dc?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"
SELL_BANNER = "https://images.unsplash.com/photo-1580910051074-3eb694886505?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"
BUY_IMG = "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"

PHONE_IMG = "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?crop=entropy&cs=srgb&fm=jpg&q=85&w=600"
CHARGER_IMG = "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?crop=entropy&cs=srgb&fm=jpg&q=85&w=600"
CABLE_IMG = "https://images.unsplash.com/photo-1585338107529-13afc5f02586?crop=entropy&cs=srgb&fm=jpg&q=85&w=600"
CASE_IMG = "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?crop=entropy&cs=srgb&fm=jpg&q=85&w=600"
EARBUD_IMG = "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?crop=entropy&cs=srgb&fm=jpg&q=85&w=600"


def build_seed(new_id, now_iso):
    ts = now_iso()

    settings = {
        "id": "appConfig",
        "appName": "FixitZ",
        "tagline": "30-Min Doorstep Repair • Jammu",
        "logo": "",
        "city": "Jammu",
        "currency": "₹",
        "deliveryCharge": 49,
        "supportPhone": "9906000000",
        "theme": {"primary": "#F94C10"},
    }

    # ----- Repair brands / models / issues / services -----
    brands = []
    for i, name in enumerate(["Apple", "Samsung", "Xiaomi", "OnePlus", "Vivo", "Oppo", "Realme", "Google"]):
        brands.append({"id": new_id(), "name": name, "active": True, "order": i,
                       "image": f"https://logo.clearbit.com/{name.lower()}.com"})

    issues = []
    for i, (key, label, icon) in enumerate([
        ("screen", "Screen Replacement", "smartphone"),
        ("battery", "Battery Replacement", "battery-charging"),
        ("charging_port", "Charging Port", "plug"),
        ("speaker", "Speaker / Mic", "volume-2"),
        ("back_panel", "Back Panel", "layers"),
        ("camera", "Camera Fix", "camera"),
    ]):
        issues.append({"id": new_id(), "key": key, "name": label, "icon": icon, "order": i})

    models = []
    services = []
    model_defs = {
        "Apple": [("iPhone 11", {"screen": 3200, "battery": 1800, "charging_port": 1200, "speaker": 900, "back_panel": 1500, "camera": 2200}),
                  ("iPhone 13", {"screen": 5500, "battery": 2400, "charging_port": 1500, "speaker": 1100, "back_panel": 2000, "camera": 3000}),
                  ("iPhone 15", {"screen": 8000, "battery": 3200, "charging_port": 1800, "speaker": 1400, "back_panel": 2600, "camera": 4200})],
        "Samsung": [("Galaxy S21", {"screen": 4200, "battery": 1600, "charging_port": 1100, "speaker": 800, "back_panel": 1400, "camera": 2000}),
                    ("Galaxy A54", {"screen": 2600, "battery": 1200, "charging_port": 900, "speaker": 700, "back_panel": 1100, "camera": 1500})],
        "Xiaomi": [("Redmi Note 12", {"screen": 1800, "battery": 900, "charging_port": 650, "speaker": 500, "back_panel": 700, "camera": 1100}),
                   ("Mi 11X", {"screen": 2400, "battery": 1100, "charging_port": 800, "speaker": 600, "back_panel": 900, "camera": 1400})],
        "OnePlus": [("OnePlus 11", {"screen": 4800, "battery": 1900, "charging_port": 1200, "speaker": 900, "back_panel": 1600, "camera": 2400}),
                    ("Nord CE 3", {"screen": 2200, "battery": 1000, "charging_port": 750, "speaker": 550, "back_panel": 850, "camera": 1200})],
        "Vivo": [("Vivo V27", {"screen": 2400, "battery": 1100, "charging_port": 800, "speaker": 600, "back_panel": 900, "camera": 1300})],
        "Oppo": [("Oppo Reno 8", {"screen": 2600, "battery": 1150, "charging_port": 850, "speaker": 650, "back_panel": 950, "camera": 1350})],
        "Realme": [("Realme 11 Pro", {"screen": 2100, "battery": 1050, "charging_port": 780, "speaker": 580, "back_panel": 880, "camera": 1250})],
        "Google": [("Pixel 7", {"screen": 5200, "battery": 2200, "charging_port": 1400, "speaker": 1000, "back_panel": 1800, "camera": 2800})],
    }
    brand_map = {b["name"]: b["id"] for b in brands}
    issue_map = {i["key"]: i["id"] for i in issues}
    for bname, mlist in model_defs.items():
        for mname, prices in mlist:
            mid = new_id()
            models.append({"id": mid, "brand_id": brand_map[bname], "name": mname, "active": True,
                           "image": PHONE_IMG})
            for ikey, base in prices.items():
                services.append({"id": new_id(), "model_id": mid, "issue": ikey,
                                 "issue_name": next(i["name"] for i in issues if i["key"] == ikey),
                                 "base_price": base, "override_price": None, "active": True})

    # ----- Shop categories & products -----
    categories = []
    for i, (name, icon) in enumerate([("Chargers", "plug"), ("Cables", "cable"), ("Cases", "shield"),
                                       ("Audio", "headphones"), ("Screen Guards", "shield-check"), ("Power Banks", "battery-full")]):
        categories.append({"id": new_id(), "name": name, "icon": icon, "order": i, "image": SHOP_BANNER})
    cat_map = {c["name"]: c["id"] for c in categories}

    products = [
        {"name": "65W GaN Fast Charger", "price": 899, "mrp": 1499, "cat": "Chargers", "img": CHARGER_IMG, "tags": ["featured"], "stock": 40},
        {"name": "20W USB-C Adapter", "price": 599, "mrp": 999, "cat": "Chargers", "img": CHARGER_IMG, "tags": ["flash"], "stock": 60},
        {"name": "Braided USB-C Cable 1.5m", "price": 199, "mrp": 499, "cat": "Cables", "img": CABLE_IMG, "tags": ["flash", "featured"], "stock": 120},
        {"name": "Lightning Cable 1m", "price": 249, "mrp": 599, "cat": "Cables", "img": CABLE_IMG, "tags": [], "stock": 90},
        {"name": "Free Micro-USB Cable", "price": 0, "mrp": 199, "cat": "Cables", "img": CABLE_IMG, "tags": ["free"], "stock": 200},
        {"name": "Silicone Case (iPhone 15)", "price": 349, "mrp": 799, "cat": "Cases", "img": CASE_IMG, "tags": ["featured"], "stock": 75},
        {"name": "Clear Rugged Case", "price": 299, "mrp": 699, "cat": "Cases", "img": CASE_IMG, "tags": [], "stock": 80},
        {"name": "TWS Earbuds Pro", "price": 1299, "mrp": 2999, "cat": "Audio", "img": EARBUD_IMG, "tags": ["flash", "featured"], "stock": 35},
        {"name": "Wired Earphones", "price": 149, "mrp": 399, "cat": "Audio", "img": EARBUD_IMG, "tags": [], "stock": 150},
        {"name": "Tempered Glass (Universal)", "price": 99, "mrp": 299, "cat": "Screen Guards", "img": CASE_IMG, "tags": ["flash"], "stock": 300},
        {"name": "Free Screen Cleaning Kit", "price": 0, "mrp": 149, "cat": "Screen Guards", "img": CASE_IMG, "tags": ["free"], "stock": 250},
        {"name": "10000mAh Power Bank", "price": 1099, "mrp": 1999, "cat": "Power Banks", "img": CHARGER_IMG, "tags": ["featured"], "stock": 50},
    ]
    product_docs = []
    for p in products:
        product_docs.append({
            "id": new_id(), "name": p["name"], "description": f"Premium {p['cat'][:-1]} — 6 month warranty. Doorstep delivery in Jammu.",
            "price": p["price"], "mrp": p["mrp"], "category_id": cat_map[p["cat"]],
            "image": p["img"], "tags": p["tags"], "stock": p["stock"], "active": True, "created_at": ts,
        })

    # ----- Sell devices & conditions -----
    sell_devices = []
    for name, base in [("iPhone 13 128GB", 32000), ("iPhone 11 64GB", 16000), ("Samsung Galaxy S21", 18000),
                       ("OnePlus 11 256GB", 24000), ("Redmi Note 12", 7000), ("Pixel 7 128GB", 21000),
                       ("Vivo V27", 12000), ("Realme 11 Pro", 9000)]:
        sell_devices.append({"id": new_id(), "brand": name.split()[0], "model": name,
                             "base_price": base, "demandScore": 1.0, "image": SELL_BANNER, "active": True})

    sell_conditions = [
        {"id": new_id(), "order": 0, "kind": "deduction", "key": "screen", "label": "Screen Condition",
         "options": [{"label": "Flawless", "value": 0}, {"label": "Minor Scratches", "value": 800}, {"label": "Cracked / Broken", "value": 3000}]},
        {"id": new_id(), "order": 1, "kind": "deduction", "key": "battery", "label": "Battery Health",
         "options": [{"label": "Above 90%", "value": 0}, {"label": "80-90%", "value": 500}, {"label": "Below 80%", "value": 1500}]},
        {"id": new_id(), "order": 2, "kind": "deduction", "key": "body", "label": "Body Condition",
         "options": [{"label": "Like New", "value": 0}, {"label": "Minor Dents", "value": 700}, {"label": "Heavy Damage", "value": 2500}]},
        {"id": new_id(), "order": 3, "kind": "deduction", "key": "working", "label": "Working Status",
         "options": [{"label": "Fully Working", "value": 0}, {"label": "Camera/Speaker Issue", "value": 1200}, {"label": "Not Powering On", "value": 6000}]},
        {"id": new_id(), "order": 4, "kind": "deduction", "key": "accessories", "label": "Bill & Box",
         "options": [{"label": "Available", "value": 0}, {"label": "Not Available", "value": 600}]},
    ]

    # ----- Buy refurbished phones -----
    buy_phones = []
    for name, price, cond, stock in [
        ("iPhone 12 128GB (Refurbished)", 32999, "excellent", 4),
        ("Samsung Galaxy S20 FE", 18499, "good", 6),
        ("OnePlus 9 Pro", 22999, "excellent", 3),
        ("iPhone 11 64GB", 21999, "good", 5),
        ("Redmi Note 11 Pro", 9999, "fair", 8),
        ("Pixel 6a", 16999, "excellent", 2),
        ("Vivo V25 Pro", 13499, "good", 7),
        ("Realme GT Neo 3", 15999, "fair", 5),
    ]:
        buy_phones.append({"id": new_id(), "name": name, "brand": name.split()[0],
                           "price": price, "condition": cond, "stock": stock,
                           "image": BUY_IMG, "warranty": "6 months FixitZ warranty",
                           "specs": {"RAM": "8GB", "Storage": "128GB"}, "active": True, "created_at": ts})

    # ----- Coupons -----
    coupons = [
        {"id": new_id(), "code": "FIRST100", "type": "flat", "value": 100, "min_order": 499,
         "first_time": True, "active": True, "expiry": None, "max_discount": None},
        {"id": new_id(), "code": "REPAIR20", "type": "percent", "value": 20, "min_order": 999,
         "first_time": False, "active": True, "expiry": None, "max_discount": 500},
    ]

    # ----- Games -----
    games = [
        {"id": new_id(), "type": "spin", "title": "Spin & Win", "active": True,
         "rewards": [{"label": "₹50 Off", "value": 50}, {"label": "Try Again", "value": 0},
                     {"label": "₹100 Cashback", "value": 100}, {"label": "Free Delivery", "value": 49},
                     {"label": "₹20 Off", "value": 20}, {"label": "Better luck!", "value": 0}],
         "probability": [15, 30, 5, 20, 25, 5]},
    ]

    # ----- Dynamic homepage sections -----
    sections = [
        {"id": new_id(), "type": "banner", "title": "Hero Banner", "visible": True, "order": 0,
         "config": {"slides": [
             {"heading": "Phone broken? We come to you.", "sub": "30-min doorstep repair in Jammu", "image": REPAIR_IMG, "cta": "Book Repair", "link": "/repair"},
             {"heading": "Sell your old phone", "sub": "Instant price. Free pickup.", "image": SELL_BANNER, "cta": "Get Quote", "link": "/sell"},
             {"heading": "Accessories from ₹0", "sub": "Free products + fast delivery", "image": SHOP_BANNER, "cta": "Shop Now", "link": "/shop"},
         ]}},
        {"id": new_id(), "type": "repair_service", "title": "Repair in 30 Minutes", "visible": True, "order": 1,
         "config": {"badge": "30 MIN GUARANTEE", "image": REPAIR_IMG2, "cta": "Start Repair", "link": "/repair"}},
        {"id": new_id(), "type": "flash_sale", "title": "⚡ Flash Sale", "visible": True, "order": 2,
         "config": {"tag": "flash", "timer": 7200, "subtitle": "Ends soon — grab it fast"}},
        {"id": new_id(), "type": "shop_products", "title": "Featured Accessories", "visible": True, "order": 3,
         "config": {"tag": "featured"}},
        {"id": new_id(), "type": "sell_phone", "title": "Sell Your Phone", "visible": True, "order": 4,
         "config": {"image": SELL_BANNER, "subtitle": "Best price guaranteed", "cta": "Sell Now", "link": "/sell"}},
        {"id": new_id(), "type": "buy_phone", "title": "Certified Refurbished Phones", "visible": True, "order": 5,
         "config": {"subtitle": "Up to 50% off with warranty"}},
        {"id": new_id(), "type": "referral", "title": "Refer & Earn ₹100", "visible": True, "order": 6,
         "config": {"reward": 100, "subtitle": "Invite friends, earn wallet cash"}},
    ]

    return {
        "settings": settings,
        "collections": {
            "repair_brands": brands, "repair_issues": issues, "repair_models": models,
            "repair_services": services, "categories": categories, "products": product_docs,
            "sell_devices": sell_devices, "sell_conditions": sell_conditions,
            "buy_phones": buy_phones, "coupons": coupons, "games": games, "sections": sections,
        },
    }
