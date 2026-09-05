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


def build_sections_v2(new_id):
    """App-like Shopee-style homepage layout."""
    return [
        {"id": new_id(), "type": "banner", "title": "Hero", "visible": True, "order": 0,
         "config": {"slides": [
             {"heading": "Phone broken? We fix it at your door.", "sub": "30-minute doorstep repair in Jammu", "image": REPAIR_IMG, "cta": "Book Repair Now", "link": "/repair"},
             {"heading": "Sell your old phone in 30 sec", "sub": "Instant price • Free pickup • Get paid", "image": SELL_BANNER, "cta": "Get Instant Price", "link": "/sell"},
             {"heading": "Accessories from ₹0", "sub": "Free products + lightning delivery", "image": SHOP_BANNER, "cta": "Shop Now", "link": "/shop"},
         ]}},
        {"id": new_id(), "type": "category_grid", "title": "What do you need?", "visible": True, "order": 1,
         "config": {"items": [
             {"label": "Repair", "icon": "wrench", "link": "/repair", "color": "#FFF1E8"},
             {"label": "Shop", "icon": "shopping-bag", "link": "/shop", "color": "#E8F1FF"},
             {"label": "Sell", "icon": "refresh-cw", "link": "/sell", "color": "#E8FFF2"},
             {"label": "Buy", "icon": "smartphone", "link": "/buy", "color": "#F3E8FF"},
             {"label": "Wallet", "icon": "wallet", "link": "/wallet", "color": "#FFF9E8"},
             {"label": "Spin & Win", "icon": "gift", "link": "/wallet", "color": "#FFE8F0"},
             {"label": "Free", "icon": "sparkles", "link": "/shop", "color": "#E8FFF2"},
             {"label": "Orders", "icon": "package", "link": "/orders", "color": "#EFEFEF"},
         ]}},
        {"id": new_id(), "type": "wallet", "title": "FixitZ Wallet", "visible": True, "order": 2,
         "config": {"highlight": True, "referralReward": 100}},
        {"id": new_id(), "type": "flash_sale", "title": "⚡ Flash Deals", "visible": True, "order": 3,
         "config": {"tag": "flash", "timer": 7200, "subtitle": "Hurry! Limited stock", "bg": "#FFF1E8", "highlight": True}},
        {"id": new_id(), "type": "repair_service", "title": "30-Min Repairs", "visible": True, "order": 4,
         "config": {"badge": "30 MIN GUARANTEE", "image": REPAIR_IMG2, "cta": "Start Repair", "link": "/repair"}},
        {"id": new_id(), "type": "shop_products", "title": "Trending Accessories", "visible": True, "order": 5,
         "config": {"tag": "featured"}},
        {"id": new_id(), "type": "free_products", "title": "🎁 Grab it FREE", "visible": True, "order": 6,
         "config": {"tag": "free", "bg": "#E8FFF2", "highlight": True, "subtitle": "Only pay delivery"}},
        {"id": new_id(), "type": "sell_phone", "title": "Sell Your Phone", "visible": True, "order": 7,
         "config": {"image": SELL_BANNER, "subtitle": "Sell your phone in 30 seconds", "cta": "Get Instant Price", "link": "/sell", "highlight": True}},
        {"id": new_id(), "type": "buy_phone", "title": "Certified Refurbished", "visible": True, "order": 8,
         "config": {"subtitle": "Up to 50% off • 6-mo warranty"}},
        {"id": new_id(), "type": "order_tracking", "title": "Track Your Order", "visible": True, "order": 9,
         "config": {}},
        {"id": new_id(), "type": "referral", "title": "Invite & Earn ₹100", "visible": True, "order": 10,
         "config": {"reward": 100, "subtitle": "Refer friends, earn wallet cash"}},
        {"id": new_id(), "type": "video", "title": "FixitZ Reels", "visible": False, "order": 11,
         "config": {"url": ""}},
    ]


def build_repair_dataset_v3(new_id):
    """Comprehensive brand/model/issue price catalogue."""
    issues_def = [
        ("screen", "Screen Replacement", "smartphone"),
        ("battery", "Battery Replacement", "battery-charging"),
        ("charging_port", "Charging Port", "plug"),
        ("speaker", "Speaker / Mic", "volume-2"),
        ("back_panel", "Back Panel", "layers"),
        ("camera", "Camera Fix", "camera"),
        ("earpiece", "Earpiece Repair", "volume-2"),
        ("vibration", "Vibration Motor", "smartphone"),
        ("water_damage", "Water Damage", "droplets"),
        ("wifi_bluetooth", "Wi-Fi / Bluetooth", "wifi"),
        ("software", "Software & Updates", "cpu"),
        ("face_id", "Face ID / Biometrics", "scan-face"),
    ]
    issues = [{"id": new_id(), "key": k, "name": n, "icon": ic, "order": i} for i, (k, n, ic) in enumerate(issues_def)]
    data = {
        "Apple": [("iPhone 7", 1500), ("iPhone 8", 1600), ("iPhone X", 3500), ("iPhone XR", 3200), ("iPhone XS Max", 4200), ("iPhone 11", 3200), ("iPhone 11 Pro", 4500), ("iPhone 11 Pro Max", 5000), ("iPhone 12", 5200), ("iPhone 12 Pro", 5800), ("iPhone 12 Pro Max", 6500), ("iPhone 13", 5500), ("iPhone 13 Pro", 7000), ("iPhone 13 Pro Max", 7800), ("iPhone 14", 6800), ("iPhone 14 Plus", 7200), ("iPhone 14 Pro", 8500), ("iPhone 14 Pro Max", 9500), ("iPhone 15", 8000), ("iPhone 15 Plus", 8500), ("iPhone 15 Pro", 9800), ("iPhone 15 Pro Max", 11000)],
        "Samsung": [("Galaxy S9", 3000), ("Galaxy S10", 3500), ("Galaxy S20", 4000), ("Galaxy S20 FE", 3200), ("Galaxy S21", 4200), ("Galaxy S21 FE", 3400), ("Galaxy S22", 4800), ("Galaxy S23", 5500), ("Galaxy S24", 6500), ("Galaxy S24 Ultra", 9000), ("Galaxy A14", 1800), ("Galaxy A34", 2400), ("Galaxy A54", 2600), ("Galaxy A73", 3000), ("Galaxy M14", 1600), ("Galaxy M34", 2200), ("Galaxy Note 20", 5200)],
        "Xiaomi": [("Redmi 9", 900), ("Redmi 10", 1100), ("Redmi Note 10", 1600), ("Redmi Note 11", 1700), ("Redmi Note 12", 1800), ("Redmi Note 13", 2000), ("Redmi Note 13 Pro", 2600), ("Mi 11X", 2400), ("Xiaomi 12", 3200), ("Xiaomi 13", 3800), ("Poco X5", 1900), ("Poco F5", 2800)],
        "OnePlus": [("OnePlus 7", 2800), ("OnePlus 8", 3200), ("OnePlus 8T", 3400), ("OnePlus 9", 3800), ("OnePlus 9R", 3400), ("OnePlus 10 Pro", 4600), ("OnePlus 10T", 4200), ("OnePlus 11", 4800), ("Nord 2", 2400), ("Nord CE 3", 2200), ("Nord 3", 2600)],
        "Vivo": [("Vivo Y21", 1400), ("Vivo Y35", 1700), ("Vivo V21", 2200), ("Vivo V23", 2500), ("Vivo V25", 2600), ("Vivo V27", 2800), ("Vivo V29", 3200), ("Vivo T1", 1900), ("Vivo T2", 2100)],
        "Oppo": [("Oppo A17", 1300), ("Oppo A57", 1600), ("Oppo A78", 1900), ("Oppo Reno 7", 2400), ("Oppo Reno 8", 2600), ("Oppo Reno 10", 3000), ("Oppo F21", 2100), ("Oppo F23", 2300)],
        "Realme": [("Realme C55", 1400), ("Realme 9 Pro", 2000), ("Realme 10 Pro", 2200), ("Realme 11 Pro", 2400), ("Realme 11 Pro+", 2800), ("Narzo 60", 2000), ("GT Neo 3", 2600)],
        "Google": [("Pixel 6a", 4200), ("Pixel 7", 5200), ("Pixel 7 Pro", 6800), ("Pixel 8", 6500), ("Pixel 8 Pro", 8500)],
        "Motorola": [("Moto G32", 1400), ("Moto G54", 1700), ("Moto G73", 2000), ("Edge 40", 2800)],
        "Nothing": [("Phone 1", 3200), ("Phone 2", 4200), ("Phone 2a", 2600)],
        "iQOO": [("iQOO Neo 7", 2400), ("iQOO Z7", 1900), ("iQOO 11", 3400)],
    }
    frac = {"battery": 0.4, "charging_port": 0.28, "speaker": 0.22, "back_panel": 0.35, "camera": 0.6,
            "earpiece": 0.2, "vibration": 0.18, "water_damage": 0.45, "wifi_bluetooth": 0.35,
            "software": 0.12, "face_id": 0.55}
    def r(x): return int(round(x / 10.0)) * 10
    brands, models, services = [], [], []
    for i, (bname, mlist) in enumerate(data.items()):
        bid = new_id()
        brands.append({"id": bid, "name": bname, "active": True, "order": i, "image": f"https://logo.clearbit.com/{bname.split()[0].lower()}.com"})
        for mname, sp in mlist:
            mid = new_id()
            models.append({"id": mid, "brand_id": bid, "name": mname, "active": True, "image": PHONE_IMG})
            prices = {"screen": sp}
            for k, f in frac.items():
                prices[k] = r(sp * f)
            for k, n, _ in issues_def:
                services.append({"id": new_id(), "model_id": mid, "issue": k, "issue_name": n, "base_price": prices[k], "override_price": None, "active": True})
    return {"brands": brands, "issues": issues, "models": models, "services": services}


def build_sell_dataset_v3(new_id):
    data = {
        "Apple": [("iPhone 8", 6000), ("iPhone X", 10000), ("iPhone XR", 12000), ("iPhone 11", 16000), ("iPhone 11 Pro", 22000), ("iPhone 12", 24000), ("iPhone 12 Pro", 30000), ("iPhone 13", 32000), ("iPhone 13 Pro", 42000), ("iPhone 14", 46000), ("iPhone 14 Pro", 60000), ("iPhone 15", 68000), ("iPhone 15 Pro Max", 95000)],
        "Samsung": [("Galaxy S20", 15000), ("Galaxy S21", 18000), ("Galaxy S22", 26000), ("Galaxy S23", 38000), ("Galaxy S24 Ultra", 70000), ("Galaxy A54", 14000), ("Galaxy A34", 10000), ("Galaxy Note 20", 22000), ("Galaxy M34", 8000)],
        "OnePlus": [("OnePlus 9", 16000), ("OnePlus 10 Pro", 30000), ("OnePlus 11", 34000), ("Nord 3", 14000), ("Nord CE 3", 10000)],
        "Xiaomi": [("Redmi Note 12", 7000), ("Redmi Note 13 Pro", 12000), ("Xiaomi 13", 28000), ("Poco F5", 16000)],
        "Vivo": [("Vivo V27", 12000), ("Vivo V29", 16000), ("Vivo T2", 9000)],
        "Oppo": [("Oppo Reno 8", 13000), ("Oppo Reno 10", 18000)],
        "Realme": [("Realme 11 Pro", 9000), ("GT Neo 3", 12000)],
        "Google": [("Pixel 6a", 12000), ("Pixel 7", 21000), ("Pixel 8", 32000)],
        "Nothing": [("Phone 1", 12000), ("Phone 2", 22000)],
        "Motorola": [("Edge 40", 14000), ("Moto G73", 8000)],
    }
    out = []
    for brand, mlist in data.items():
        for model, base in mlist:
            out.append({"id": new_id(), "brand": brand, "model": model, "base_price": base, "demandScore": 1.0, "image": SELL_BANNER, "active": True})
    return out


def build_sell_deduction_rules(conditions, base_price, model_name):
    """Create deterministic model-specific deductions from the global questions."""
    model_factor = 0.82 + (sum(ord(char) for char in model_name) % 35) / 100
    price_factor = max(0.65, min(1.45, base_price / 20000))
    rules = {}
    for condition in conditions:
        rules[condition["id"]] = {}
        for option in condition.get("options", []):
            source_value = float(option.get("value", 0))
            value = round(source_value * model_factor * price_factor / 10) * 10
            rules[condition["id"]][option["label"]] = {"mode": "fixed", "value": value}
    return rules


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
        "theme": {"primary": "#FF6A00"},
        "features": {"wallet": True, "referral": True, "spin": True, "flash": True},
        "builderVersion": 2,
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
        ("earpiece", "Earpiece Repair", "volume-2"),
        ("vibration", "Vibration Motor", "smartphone"),
        ("water_damage", "Water Damage", "droplets"),
        ("wifi_bluetooth", "Wi-Fi / Bluetooth", "wifi"),
        ("software", "Software & Updates", "cpu"),
        ("face_id", "Face ID / Biometrics", "scan-face"),
    ]):
        issues.append({"id": new_id(), "key": key, "name": label, "icon": icon, "order": i})

    models = []
    services = []
    def r(value): return int(round(value / 10.0)) * 10
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
            extra_prices = {"earpiece": prices["speaker"], "vibration": prices["speaker"],
                            "water_damage": r(prices["screen"] * 0.45), "wifi_bluetooth": r(prices["screen"] * 0.35),
                            "software": r(prices["screen"] * 0.12), "face_id": prices["camera"]}
            for ikey, base in extra_prices.items():
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

    # ----- Sell hierarchy, variants, and global questions -----
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
    sell_brands, sell_models, sell_variants = [], [], []
    brand_ids, model_ids = {}, {}
    brand_images = {
        "Apple": "https://logo.clearbit.com/apple.com",
        "Samsung": "https://logo.clearbit.com/samsung.com",
        "OnePlus": "https://logo.clearbit.com/oneplus.com",
        "Redmi": "https://logo.clearbit.com/mi.com",
        "Google": "https://logo.clearbit.com/google.com",
        "Vivo": "https://logo.clearbit.com/vivo.com",
        "Realme": "https://logo.clearbit.com/realme.com",
    }
    for brand_name in ["Apple", "Samsung", "OnePlus", "Redmi", "Google", "Vivo", "Realme"]:
        brand_ids[brand_name] = new_id()
        sell_brands.append({"id": brand_ids[brand_name], "name": brand_name, "image": brand_images[brand_name], "active": True})
    variants = [("Apple", "iPhone 13", "128GB", 32000), ("Apple", "iPhone 11", "64GB", 16000),
                ("Samsung", "Galaxy S21", "128GB", 18000), ("OnePlus", "OnePlus 11", "256GB", 24000),
                ("Redmi", "Note 12", "128GB", 7000), ("Google", "Pixel 7", "128GB", 21000),
                ("Vivo", "V27", "128GB", 12000), ("Realme", "11 Pro", "128GB", 9000)]
    for brand_name, model_name, variant_name, base_price in variants:
        model_key = (brand_name, model_name)
        if model_key not in model_ids:
            model_ids[model_key] = new_id()
            sell_models.append({
                "id": model_ids[model_key], "brand_id": brand_ids[brand_name], "name": model_name,
                "image": PHONE_IMG,
                "details": {"category": "Smartphone", "service": "Free doorstep pickup", "inspection": "Verified at pickup"},
                "active": True,
            })
        rules = build_sell_deduction_rules(sell_conditions, base_price, f"{brand_name} {model_name}")
        sell_variants.append({
            "id": new_id(), "model_id": model_ids[model_key], "name": variant_name,
            "base_price": base_price, "deduction_rules": rules,
            "rules_version": 2, "demandScore": 1.0, "image": PHONE_IMG, "active": True,
        })
    sell_devices = []

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
    sections = build_sections_v2(new_id)

    return {
        "settings": settings,
        "collections": {
            "repair_brands": brands, "repair_issues": issues, "repair_models": models,
            "repair_services": services, "categories": categories, "products": product_docs,
            "sell_devices": sell_devices, "sell_conditions": sell_conditions,
            "sell_brands": sell_brands, "sell_models": sell_models, "sell_variants": sell_variants,
            "buy_phones": buy_phones, "coupons": coupons, "games": games, "sections": sections,
        },
    }
