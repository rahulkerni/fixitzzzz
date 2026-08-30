import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, ChevronRight, Wrench, ShoppingBag, RefreshCw, Smartphone, Gift, ShieldCheck,
  Wallet, Package, Sparkles, Plus, Zap, ArrowRight, BatteryCharging, Plug, Volume2, Camera, Layers,
} from "lucide-react";
import api from "@/lib/api";
import { Section, Price, Empty, CountUp } from "@/components/common";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { fmt } from "@/lib/utils2";
import { toast } from "sonner";

const ICONS = { wrench: Wrench, "shopping-bag": ShoppingBag, "refresh-cw": RefreshCw, smartphone: Smartphone, wallet: Wallet, gift: Gift, sparkles: Sparkles, package: Package, zap: Zap, "battery-charging": BatteryCharging, plug: Plug, "volume-2": Volume2, camera: Camera, layers: Layers };

/* ---------------- Hero Banner ---------------- */
function BannerSection({ config }) {
  const nav = useNavigate();
  const slides = (config.slides || []).filter((s) => {
    const now = Date.now();
    if (s.startAt && new Date(s.startAt).getTime() > now) return false;
    if (s.endAt && new Date(s.endAt).getTime() < now) return false;
    return true;
  });
  const [i, setI] = useState(0);
  useEffect(() => { if (slides.length < 2) return; const t = setInterval(() => setI((p) => (p + 1) % slides.length), 3800); return () => clearInterval(t); }, [slides.length]);
  if (!slides.length) return null;
  const s = slides[i % slides.length];
  return (
    <div className="pt-0">
      <div className="relative overflow-hidden h-64 shadow-lg" data-testid="hero-banner" onClick={() => s.link && nav(s.link)}>
        <AnimatePresence mode="wait">
          <motion.img key={i} src={s.image} alt="" initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }} className="absolute inset-0 w-full h-full object-cover" />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
        <div className="absolute bottom-0 p-6 text-white">
          <motion.h3 key={s.heading} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="font-display text-[26px] leading-[1.1] drop-shadow-lg">{s.heading}</motion.h3>
          <p className="text-sm text-white/90 mt-1.5">{s.sub}</p>
          <button className="mt-3 bg-fx text-white text-sm font-bold px-5 py-2.5 rounded-full active:scale-95 transition-transform flex items-center gap-1 shadow-lg shadow-orange-600/40">{s.cta} <ArrowRight className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="flex gap-1.5 justify-center mt-2.5 pb-1">
        {slides.map((_, k) => <div key={k} className={`h-1.5 rounded-full transition-all duration-300 ${k === i % slides.length ? "w-6 bg-fx" : "w-1.5 bg-n200"}`} />)}
      </div>
    </div>
  );
}

/* ---------------- Category Grid ---------------- */
function CategoryGridSection({ title, config }) {
  const nav = useNavigate();
  const items = config.items || [];
  return (
    <Section title={title}>
      <div className="grid grid-cols-4 gap-3">
        {items.map((it, idx) => {
          const Icon = ICONS[it.icon] || Sparkles;
          return (
            <motion.button key={idx} whileTap={{ scale: 0.9 }} onClick={() => nav(it.link)} data-testid={`cat-grid-${it.label}`}
              className="flex flex-col items-center gap-2">
              {it.image ? (
                <img src={it.image} alt={it.label} className="w-16 h-16 rounded-2xl object-cover shadow-sm" />
              ) : (
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: it.color || "#FFF1E8" }}>
                  <Icon className="w-7 h-7 text-n900" strokeWidth={2.1} />
                </div>
              )}
              <span className="text-[11px] font-semibold text-n800 text-center leading-tight">{it.label}</span>
            </motion.button>
          );
        })}
      </div>
    </Section>
  );
}

/* ---------------- Wallet Card ---------------- */
function WalletSection({ title, config }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ["wallet"], queryFn: () => api.get("/wallet").then((r) => r.data), enabled: !!user, refetchInterval: 6000 });
  return (
    <Section title={title}>
      <div className="rounded-3xl bg-gradient-to-br from-n900 to-[#2A2826] p-5 shadow-lg overflow-hidden relative" data-testid="section-wallet">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-fx/20 blur-2xl" />
        <div className="flex items-center justify-between relative">
          <div>
            <p className="text-white/60 text-xs font-medium flex items-center gap-1.5"><Wallet className="w-4 h-4 text-fx" /> Wallet Balance</p>
            <div className="font-display text-3xl text-white mt-1" data-testid="wallet-balance">{user ? <CountUp value={data?.balance ?? user.wallet ?? 0} /> : "₹0"}</div>
          </div>
          <button onClick={() => nav(user ? "/wallet" : "/login")} data-testid="wallet-add-btn" className="bg-fx text-white text-sm font-bold px-4 py-2.5 rounded-full flex items-center gap-1 active:scale-95 transition-transform shadow-lg shadow-orange-600/40"><Plus className="w-4 h-4" /> Add Money</button>
        </div>
        <div className="mt-4 flex items-center gap-2 bg-white/10 rounded-2xl p-3 relative">
          <Gift className="w-5 h-5 text-fx" />
          <div className="flex-1">
            <p className="text-white text-sm font-semibold">Invite & Earn ₹{config.referralReward || 100}</p>
            <p className="text-white/50 text-[11px]">{user ? `Your code: ${user.referralCode}` : "Login to get your referral code"}</p>
          </div>
          <button onClick={() => nav(user ? "/wallet" : "/login")} className="text-fx text-xs font-bold">Share</button>
        </div>
      </div>
    </Section>
  );
}

/* ---------------- Product card ---------------- */
function ProductCard({ p, onAdd, wide, compact }) {
  const nav = useNavigate();
  const disc = p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;
  const stockLeft = p.stock && p.stock <= 20 ? p.stock : null;
  return (
    <motion.div whileTap={{ scale: 0.97 }} className={`${compact ? "min-w-[120px] w-[120px]" : wide ? "min-w-[160px] w-[160px]" : "min-w-[150px] w-[150px]"} bg-white rounded-2xl overflow-hidden shadow-md shadow-black/5`} data-testid={`product-card-${p.id}`}>
      <div className="relative" onClick={() => nav(`/product/${p.id}`)}>
        <img src={p.image} alt={p.name} className="w-full h-32 object-cover" />
        {p.tags?.includes("free") && <Badge className="bg-emerald-500">FREE</Badge>}
        {p.tags?.includes("flash") && <Badge className="bg-fx">🔥 HOT</Badge>}
        {disc > 0 && !p.tags?.includes("free") && !p.tags?.includes("flash") && <Badge className="bg-n900">-{disc}%</Badge>}
      </div>
      <div className="p-2.5">
        <p className="text-xs font-semibold text-n800 line-clamp-2 h-8" onClick={() => nav(`/product/${p.id}`)}>{p.name}</p>
        {stockLeft && <p className="text-[10px] font-bold text-fx mt-0.5">ONLY {stockLeft} LEFT</p>}
        <div className="mt-1.5 flex items-center justify-between">
          <Price price={p.price} mrp={p.mrp} />
          <button onClick={() => onAdd(p)} data-testid={`add-${p.id}`} className="w-7 h-7 rounded-full bg-fx text-white flex items-center justify-center text-lg font-bold active:scale-90 transition-transform">+</button>
        </div>
      </div>
    </motion.div>
  );
}
function Badge({ children, className }) {
  return <span className={`absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow ${className}`}>{children}</span>;
}

function useAutoScroll(ref, count) {
  useEffect(() => {
    const el = ref.current;
    if (!el || count < 3) return;
    const t = setInterval(() => {
      if (!el) return;
      const max = el.scrollWidth - el.clientWidth;
      const next = el.scrollLeft + 132;
      el.scrollTo({ left: next >= max - 4 ? 0 : next, behavior: "smooth" });
    }, 2800);
    return () => clearInterval(t);
  }, [ref, count]);
}

function ProductsSection({ title, config }) {
  const { add } = useCart();
  const { data: products = [] } = useQuery({ queryKey: ["products", config.tag], queryFn: () => api.get("/products", { params: { tag: config.tag } }).then((r) => r.data) });
  const onAdd = (p) => { add(p); toast.success(`${p.name} added`); };
  if (!products.length) return null;
  return (
    <Section title={title} action={<span className="text-fx text-xs font-bold flex items-center">See all <ChevronRight className="w-4 h-4" /></span>}>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">{products.map((p) => <ProductCard key={p.id} p={p} onAdd={onAdd} />)}</div>
    </Section>
  );
}

/* ---------------- Free products (highlighted) ---------------- */
function FreeProductsSection({ title, config }) {
  const { add } = useCart();
  const { data: products = [] } = useQuery({ queryKey: ["free", config.tag], queryFn: () => api.get("/products", { params: { tag: config.tag || "free" } }).then((r) => r.data) });
  if (!products.length) return null;
  return (
    <section className="mt-6 mx-4 rounded-3xl p-4 shadow-sm" style={{ background: config.bg || "#E8FFF2" }} data-testid="section-free">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display text-xl text-n900">{title}</h2>
        <span className="bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">₹0 DEALS</span>
      </div>
      <p className="text-xs text-n500 mb-3">{config.subtitle}</p>
      <div className="flex gap-3 overflow-x-auto no-scrollbar">{products.map((p) => <ProductCard key={p.id} p={p} onAdd={(x) => { add(x); toast.success("Added!"); }} />)}</div>
    </section>
  );
}

/* ---------------- Flash sale ---------------- */
function FlashSaleSection({ title, config }) {
  const { add } = useCart();
  const nav = useNavigate();
  const [left, setLeft] = useState(config.timer || 7200);
  useEffect(() => { const t = setInterval(() => setLeft((p) => (p > 0 ? p - 1 : config.timer || 7200)), 1000); return () => clearInterval(t); }, []);
  const { data: products = [] } = useQuery({ queryKey: ["flash", config.tag], queryFn: () => api.get("/products", { params: { tag: config.tag || "flash" } }).then((r) => r.data) });
  const scrollRef = useRef(null);
  useAutoScroll(scrollRef, products.length);
  const parts = [Math.floor(left / 3600), Math.floor((left % 3600) / 60), left % 60].map((v) => String(v).padStart(2, "0"));
  if (!products.length) return null;
  return (
    <section className="mt-6 mx-4 rounded-3xl p-4 shadow-md" style={{ background: config.bg || "#FFF1E8" }} data-testid="section-flash">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl text-n900 flex items-center gap-1"><Zap className="w-5 h-5 text-fx fill-fx" />{title}</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => nav("/flash")} data-testid="flash-see-all" className="text-fx text-xs font-bold flex items-center">See all <ChevronRight className="w-3.5 h-3.5" /></button>
          <div className="flex items-center gap-1">
          {parts.map((v, i) => (
            <React.Fragment key={i}>
              <motion.span key={v} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className="bg-n900 text-white rounded-md px-1.5 py-1 text-sm font-bold font-mono">{v}</motion.span>
              {i < 2 && <span className="text-n900 font-bold">:</span>}
            </React.Fragment>
          ))}
          </div>
        </div>
      </div>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth">{products.map((p) => <ProductCard key={p.id} p={p} compact onAdd={(x) => { add(x); toast.success("Added!"); }} />)}</div>
    </section>
  );
}

/* ---------------- Exclusive deals ---------------- */
function ExclusiveDealsSection({ title, config }) {
  const { add } = useCart();
  const nav = useNavigate();
  const scrollRef = useRef(null);
  const { data: products = [] } = useQuery({ queryKey: ["exclusive", config.tag], queryFn: () => api.get("/products", { params: { tag: config.tag || "exclusive" } }).then((r) => r.data) });
  useAutoScroll(scrollRef, products.length);
  if (!products.length) return null;
  return (
    <section className="mt-6 mx-4 rounded-3xl p-4 shadow-md" style={{ background: config.bg || "#F3E8FF" }} data-testid="section-exclusive">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display text-xl text-n900 flex items-center gap-1"><Sparkles className="w-5 h-5 text-fx" />{title}</h2>
        <button onClick={() => nav("/shop")} data-testid="exclusive-see-all" className="text-fx text-xs font-bold flex items-center">See all <ChevronRight className="w-3.5 h-3.5" /></button>
      </div>
      <p className="text-xs text-n500 mb-3">{config.subtitle}</p>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth">{products.map((p) => <ProductCard key={p.id} p={p} compact onAdd={(x) => { add(x); toast.success("Added!"); }} />)}</div>
    </section>
  );
}

/* ---------------- Repair horizontal cards ---------------- */
function RepairServiceSection({ title, config }) {
  const nav = useNavigate();
  const { data: issues = [] } = useQuery({ queryKey: ["issues"], queryFn: () => api.get("/repair/issues").then((r) => r.data) });
  return (
    <Section title={title}>
      <div className="relative rounded-3xl overflow-hidden shadow-md mb-3" data-testid="section-repair" onClick={() => nav(config.link || "/repair")}>
        <img src={config.image} alt="" className="w-full h-36 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 to-black/20" />
        <div className="absolute inset-0 p-5 flex flex-col justify-center">
          {config.badge && <span className="self-start bg-fx text-white text-[10px] font-bold px-3 py-1 rounded-full mb-2 flex items-center gap-1"><Clock className="w-3 h-3" />{config.badge}</span>}
          <p className="text-white/90 text-sm max-w-[65%]">Doorstep repair in Jammu. Pay only after the fix.</p>
          <button className="mt-3 self-start bg-white text-n900 text-xs font-bold px-4 py-2 rounded-full">{config.cta || "Book Now"}</button>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar">
        {issues.map((iss) => {
          const Icon = ICONS[iss.icon] || Wrench;
          return (
            <button key={iss.id} onClick={() => nav("/repair")} data-testid={`repair-issue-${iss.id}`} className="min-w-[110px] w-[110px] bg-white rounded-2xl shadow-sm p-3 flex flex-col items-center gap-2 active:scale-95 transition-transform">
              <div className="w-11 h-11 rounded-xl bg-fx-light flex items-center justify-center"><Icon className="w-5 h-5 text-fx" /></div>
              <span className="text-[11px] font-semibold text-n800 text-center leading-tight">{iss.name}</span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

/* ---------------- Sell big block ---------------- */
function SellSection({ title, config }) {
  const nav = useNavigate();
  return (
    <Section title={title}>
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 shadow-lg relative overflow-hidden" data-testid="section-sell" onClick={() => nav(config.link || "/sell")}>
        <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex items-center gap-4">
          <img src={config.image} alt="" className="w-24 h-24 rounded-2xl object-cover border-2 border-white/30" />
          <div className="flex-1">
            <p className="font-display text-xl text-white leading-tight">{config.subtitle}</p>
            <p className="text-xs text-white/80 mt-1">Instant quote • Free pickup • Get paid on spot</p>
            <button className="mt-3 bg-white text-emerald-700 text-sm font-bold px-4 py-2 rounded-full active:scale-95 transition-transform">{config.cta || "Sell Now"} →</button>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---------------- Buy slider ---------------- */
function BuySection({ title, config }) {
  const nav = useNavigate();
  const { data: phones = [] } = useQuery({ queryKey: ["buy-home"], queryFn: () => api.get("/buy/phones").then((r) => r.data) });
  if (!phones.length) return null;
  return (
    <Section title={title} action={<button onClick={() => nav("/buy")} className="text-fx text-xs font-bold flex items-center">All <ChevronRight className="w-4 h-4" /></button>}>
      <p className="text-xs text-n500 -mt-2 mb-3">{config.subtitle}</p>
      <div className="flex gap-3 overflow-x-auto no-scrollbar">
        {phones.slice(0, 6).map((p) => (
          <div key={p.id} className="min-w-[150px] w-[150px] bg-white rounded-2xl overflow-hidden shadow-md" data-testid={`buy-card-${p.id}`} onClick={() => nav("/buy")}>
            <div className="relative"><img src={p.image} alt="" className="w-full h-28 object-cover" /><span className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">{p.condition}</span></div>
            <div className="p-2.5"><p className="text-xs font-semibold text-n800 line-clamp-2 h-8">{p.name}</p><Price price={p.price} /></div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------------- Order tracking ---------------- */
const STATUS_STEPS = ["pending", "confirmed", "in-progress", "completed"];
function OrderTrackingSection({ title }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const { data: orders = [] } = useQuery({ queryKey: ["myorders"], queryFn: () => api.get("/orders").then((r) => r.data), enabled: !!user, refetchInterval: 8000 });
  if (!user || !orders.length) return null;
  const o = orders[0];
  const idx = STATUS_STEPS.indexOf(o.status);
  return (
    <Section title={title}>
      <div className="bg-white rounded-3xl shadow-sm p-4" data-testid="section-order-tracking" onClick={() => nav("/orders")}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><Package className="w-5 h-5 text-fx" /><span className="text-sm font-semibold capitalize">{o.type} order</span></div>
          <span className="text-xs font-bold text-fx capitalize">{o.status}</span>
        </div>
        {o.status === "cancelled" ? <p className="text-sm text-red-500">Order cancelled</p> : (
          <div className="flex items-center">
            {STATUS_STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i <= idx ? "bg-fx text-white" : "bg-n200 text-n500"}`}>{i + 1}</div>
                {i < STATUS_STEPS.length - 1 && <div className={`flex-1 h-1 ${i < idx ? "bg-fx" : "bg-n200"}`} />}
              </React.Fragment>
            ))}
          </div>
        )}
        <p className="text-xs text-n500 mt-2">{o.items?.map((x) => x.name).join(", ")}</p>
      </div>
    </Section>
  );
}

function ReferralSection({ title, config }) {
  const nav = useNavigate();
  return (
    <Section title={title}>
      <div className="rounded-3xl bg-fx-light p-5 flex items-center gap-4 border border-fx/20" data-testid="section-referral">
        <div className="w-12 h-12 rounded-2xl bg-fx flex items-center justify-center shadow-lg shadow-orange-500/30"><Gift className="w-6 h-6 text-white" /></div>
        <div className="flex-1"><p className="text-n900 font-semibold">Earn ₹{config.reward || 100} per friend</p><p className="text-xs text-n500 mt-0.5">{config.subtitle}</p></div>
        <button onClick={() => nav("/wallet")} className="text-fx text-sm font-bold">Invite</button>
      </div>
    </Section>
  );
}

function VideoSection({ title, config }) {
  if (!config.url) return null;
  return (
    <Section title={title}>
      <div className="rounded-3xl overflow-hidden shadow-sm aspect-video bg-black"><iframe src={config.url} title={title} className="w-full h-full" allowFullScreen /></div>
    </Section>
  );
}

function CustomSection({ title, config }) {
  return (
    <Section title={title}>
      <div className="rounded-3xl shadow-sm p-5" style={{ background: config.bg || "#fff" }} data-testid="section-custom">
        {config.image && <img src={config.image} alt="" className="w-full h-32 object-cover rounded-2xl mb-3" />}
        <p className="text-sm text-n800">{config.text || config.subtitle}</p>
      </div>
    </Section>
  );
}

function FullShopSection({ title, config }) {
  const nav = useNavigate();
  const { add } = useCart();
  const { data: products = [] } = useQuery({ queryKey: ["fullshop"], queryFn: () => api.get("/products").then((r) => r.data) });
  if (!products.length) return null;
  return (
    <Section title={title} action={<button onClick={() => nav("/shop")} data-testid="fullshop-see-all" className="text-fx text-xs font-bold flex items-center">See all <ChevronRight className="w-4 h-4" /></button>}>
      <div className="grid grid-cols-2 gap-3">
        {products.slice(0, 8).map((p) => (
          <div key={p.id} className="bg-white rounded-2xl overflow-hidden shadow-sm" data-testid={`fullshop-product-${p.id}`}>
            <img src={p.image} alt={p.name} className="w-full h-32 object-cover" onClick={() => nav(`/product/${p.id}`)} />
            <div className="p-2.5">
              <p className="text-xs font-semibold text-n800 line-clamp-2 h-8" onClick={() => nav(`/product/${p.id}`)}>{p.name}</p>
              <div className="mt-1.5 flex items-center justify-between">
                <Price price={p.price} mrp={p.mrp} />
                <button onClick={() => { add(p); toast.success("Added!"); }} className="w-7 h-7 rounded-full bg-fx text-white flex items-center justify-center text-lg font-bold active:scale-90 transition-transform">+</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => nav("/shop")} className="w-full mt-3 bg-fx-light text-fx font-bold py-3 rounded-full active:scale-95 transition-transform">View All Products</button>
    </Section>
  );
}

const RENDERERS = {
  banner: BannerSection, category_grid: CategoryGridSection, wallet: WalletSection,
  repair_service: RepairServiceSection, shop_products: ProductsSection, flash_sale: FlashSaleSection,
  free_products: FreeProductsSection, sell_phone: SellSection, buy_phone: BuySection,
  order_tracking: OrderTrackingSection, referral: ReferralSection, video: VideoSection, custom: CustomSection,
  exclusive_deals: ExclusiveDealsSection,
  full_shop: FullShopSection,
};
const FEATURE_MAP = { wallet: "wallet", referral: "referral", flash_sale: "flash", repair_service: "repair", sell_phone: "sell", buy_phone: "buy" };

export default function Home() {
  const nav = useNavigate();
  const { data: sections = [], isLoading } = useQuery({ queryKey: ["sections"], queryFn: () => api.get("/sections").then((r) => r.data) });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api.get("/settings").then((r) => r.data) });
  const features = settings?.features || {};

  return (
    <div className="pb-28" data-testid="home-page">
      {isLoading && <div className="px-4 pt-4"><div className="fx-skeleton h-56 rounded-[28px]" /></div>}
      {sections.map((sec) => {
        const feat = FEATURE_MAP[sec.type];
        if (feat && features[feat] === false) return null;
        const R = RENDERERS[sec.type];
        if (!R) return null;
        const bg = sec.config?.bg;
        return (
          <div key={sec.id} style={bg ? { background: bg } : undefined} className={bg ? "py-1" : ""}>
            <R title={sec.title} config={sec.config || {}} />
          </div>
        );
      })}
      {!isLoading && !sections.length && <Empty text="No content yet. Add sections from the admin panel." />}
      <div className="px-4 mt-8 flex items-center justify-center gap-2 text-n500 text-xs"><ShieldCheck className="w-4 h-4" /> Trusted by 10,000+ customers in Jammu</div>

      {/* Sticky Book Repair bar */}
      <div className="fixed bottom-[72px] left-1/2 -translate-x-1/2 w-full max-w-[480px] px-4 z-30 pointer-events-none">
        <motion.button initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} onClick={() => nav("/repair")} data-testid="sticky-book-repair"
          className="pointer-events-auto w-full bg-fx text-white font-bold py-3.5 rounded-full shadow-xl shadow-orange-600/40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
          <Wrench className="w-5 h-5" /> Book 30-Min Repair
        </motion.button>
      </div>
    </div>
  );
}
