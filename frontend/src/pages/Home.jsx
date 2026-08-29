import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChevronRight, Wrench, ShoppingBag, RefreshCw, Smartphone, Gift, ShieldCheck } from "lucide-react";
import api from "@/lib/api";
import { Section, FadeIn, Price, Empty } from "@/components/common";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

/* ---------------- Section renderers ---------------- */

function BannerSection({ config }) {
  const nav = useNavigate();
  const slides = config.slides || [];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI((p) => (p + 1) % slides.length), 3500);
    return () => clearInterval(t);
  }, [slides.length]);
  if (!slides.length) return null;
  const s = slides[i];
  return (
    <div className="px-4 pt-4">
      <div className="relative rounded-3xl overflow-hidden h-44 shadow-sm" data-testid="hero-banner" onClick={() => s.link && nav(s.link)}>
        <AnimatePresence mode="wait">
          <motion.img key={i} src={s.image} alt="" initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="absolute inset-0 w-full h-full object-cover" />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute bottom-0 p-5 text-white">
          <motion.h3 key={s.heading} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-display text-2xl leading-tight">{s.heading}</motion.h3>
          <p className="text-sm text-white/85 mt-1">{s.sub}</p>
          <button className="mt-3 bg-fx text-white text-xs font-bold px-4 py-2 rounded-full active:scale-95 transition-transform">{s.cta} →</button>
        </div>
      </div>
      <div className="flex gap-1.5 justify-center mt-2">
        {slides.map((_, k) => <div key={k} className={`h-1.5 rounded-full transition-all ${k === i ? "w-5 bg-fx" : "w-1.5 bg-n200"}`} />)}
      </div>
    </div>
  );
}

function QuickActions() {
  const nav = useNavigate();
  const acts = [
    { icon: Wrench, label: "Repair", link: "/repair", bg: "bg-fx-light", fg: "text-fx" },
    { icon: ShoppingBag, label: "Shop", link: "/shop", bg: "bg-blue-50", fg: "text-blue-600" },
    { icon: RefreshCw, label: "Sell", link: "/sell", bg: "bg-emerald-50", fg: "text-emerald-600" },
    { icon: Smartphone, label: "Buy", link: "/buy", bg: "bg-purple-50", fg: "text-purple-600" },
  ];
  return (
    <div className="px-4 mt-4 grid grid-cols-4 gap-3">
      {acts.map((a, idx) => (
        <FadeIn key={a.label} delay={idx * 0.05}>
          <button onClick={() => nav(a.link)} data-testid={`quick-${a.label.toLowerCase()}`} className="w-full flex flex-col items-center gap-1.5 active:scale-90 transition-transform">
            <div className={`w-14 h-14 rounded-2xl ${a.bg} flex items-center justify-center`}>
              <a.icon className={`w-6 h-6 ${a.fg}`} strokeWidth={2.2} />
            </div>
            <span className="text-[11px] font-semibold text-n800">{a.label}</span>
          </button>
        </FadeIn>
      ))}
    </div>
  );
}

function RepairServiceSection({ title, config }) {
  const nav = useNavigate();
  return (
    <Section title={title}>
      <div className="relative rounded-3xl overflow-hidden shadow-sm" data-testid="section-repair" onClick={() => nav(config.link || "/repair")}>
        <img src={config.image} alt="" className="w-full h-40 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/10" />
        <div className="absolute inset-0 p-5 flex flex-col justify-center">
          {config.badge && <span className="self-start bg-fx text-white text-[10px] font-bold px-3 py-1 rounded-full mb-2 flex items-center gap-1"><Clock className="w-3 h-3" />{config.badge}</span>}
          <p className="text-white/90 text-sm max-w-[60%]">Cracked screen? Dead battery? We fix it at your doorstep.</p>
          <button className="mt-3 self-start bg-white text-n900 text-xs font-bold px-4 py-2 rounded-full">{config.cta || "Book Now"}</button>
        </div>
      </div>
    </Section>
  );
}

function ProductCard({ p, onAdd }) {
  const nav = useNavigate();
  const disc = p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;
  return (
    <motion.div whileTap={{ scale: 0.97 }} className="min-w-[150px] w-[150px] bg-white rounded-2xl overflow-hidden shadow-sm" data-testid={`product-card-${p.id}`}>
      <div className="relative" onClick={() => nav(`/product/${p.id}`)}>
        <img src={p.image} alt={p.name} className="w-full h-32 object-cover" />
        {p.tags?.includes("free") && <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">FREE</span>}
        {p.tags?.includes("flash") && <span className="absolute top-2 left-2 bg-fx text-white text-[10px] font-bold px-2 py-0.5 rounded-full">FLASH</span>}
        {disc > 0 && !p.tags?.includes("free") && !p.tags?.includes("flash") && <span className="absolute top-2 left-2 bg-n900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">-{disc}%</span>}
      </div>
      <div className="p-2.5">
        <p className="text-xs font-semibold text-n800 line-clamp-2 h-8" onClick={() => nav(`/product/${p.id}`)}>{p.name}</p>
        <div className="mt-1.5 flex items-center justify-between">
          <Price price={p.price} mrp={p.mrp} />
          <button onClick={() => onAdd(p)} data-testid={`add-${p.id}`} className="w-7 h-7 rounded-full bg-fx text-white flex items-center justify-center text-lg font-bold active:scale-90 transition-transform">+</button>
        </div>
      </div>
    </motion.div>
  );
}

function ProductsSection({ title, config }) {
  const { add } = useCart();
  const { data: products = [] } = useQuery({
    queryKey: ["products", config.tag],
    queryFn: () => api.get("/products", { params: { tag: config.tag } }).then((r) => r.data),
  });
  const onAdd = (p) => { add(p); toast.success(`${p.name} added to cart`); };
  if (!products.length) return null;
  return (
    <Section title={title}>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {products.map((p) => <ProductCard key={p.id} p={p} onAdd={onAdd} />)}
      </div>
    </Section>
  );
}

function FlashSaleSection({ title, config }) {
  const { add } = useCart();
  const [left, setLeft] = useState(config.timer || 7200);
  useEffect(() => { const t = setInterval(() => setLeft((p) => (p > 0 ? p - 1 : 0)), 1000); return () => clearInterval(t); }, []);
  const { data: products = [] } = useQuery({
    queryKey: ["flash", config.tag], queryFn: () => api.get("/products", { params: { tag: config.tag || "flash" } }).then((r) => r.data),
  });
  const h = String(Math.floor(left / 3600)).padStart(2, "0");
  const m = String(Math.floor((left % 3600) / 60)).padStart(2, "0");
  const s = String(left % 60).padStart(2, "0");
  if (!products.length) return null;
  return (
    <section className="mt-6 mx-4 rounded-3xl bg-gradient-to-br from-fx to-orange-600 fx-noise p-4" data-testid="section-flash">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl text-white">{title}</h2>
        <div className="flex items-center gap-1 text-white">
          {[h, m, s].map((v, i) => (
            <React.Fragment key={i}>
              <span className="bg-black/30 rounded-md px-1.5 py-1 text-sm font-bold font-mono">{v}</span>
              {i < 2 && <span className="text-white/80">:</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar">
        {products.map((p) => <ProductCard key={p.id} p={p} onAdd={(x) => { add(x); toast.success("Added to cart"); }} />)}
      </div>
    </section>
  );
}

function SellSection({ title, config }) {
  const nav = useNavigate();
  return (
    <Section title={title}>
      <div className="rounded-3xl bg-white shadow-sm p-4 flex items-center gap-4" data-testid="section-sell" onClick={() => nav(config.link || "/sell")}>
        <img src={config.image} alt="" className="w-20 h-20 rounded-2xl object-cover" />
        <div className="flex-1">
          <p className="font-semibold text-n900">{config.subtitle}</p>
          <p className="text-xs text-n500 mt-0.5">Instant quote in 60 seconds • Free pickup</p>
          <button className="mt-2 bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-full">{config.cta || "Sell Now"}</button>
        </div>
      </div>
    </Section>
  );
}

function BuySection({ title, config }) {
  const nav = useNavigate();
  const { data: phones = [] } = useQuery({ queryKey: ["buy-home"], queryFn: () => api.get("/buy/phones").then((r) => r.data) });
  if (!phones.length) return null;
  return (
    <Section title={title} action={<button onClick={() => nav("/buy")} className="text-fx text-xs font-bold flex items-center">All <ChevronRight className="w-4 h-4" /></button>}>
      <p className="text-xs text-n500 -mt-2 mb-3">{config.subtitle}</p>
      <div className="flex gap-3 overflow-x-auto no-scrollbar">
        {phones.slice(0, 6).map((p) => (
          <div key={p.id} className="min-w-[150px] w-[150px] bg-white rounded-2xl overflow-hidden shadow-sm" data-testid={`buy-card-${p.id}`} onClick={() => nav("/buy")}>
            <img src={p.image} alt="" className="w-full h-28 object-cover" />
            <div className="p-2.5">
              <span className="text-[10px] font-bold text-emerald-600 uppercase">{p.condition}</span>
              <p className="text-xs font-semibold text-n800 line-clamp-2 h-8">{p.name}</p>
              <Price price={p.price} />
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ReferralSection({ title, config }) {
  return (
    <Section title={title}>
      <div className="rounded-3xl bg-n900 p-5 flex items-center gap-4" data-testid="section-referral">
        <div className="w-12 h-12 rounded-2xl bg-fx flex items-center justify-center"><Gift className="w-6 h-6 text-white" /></div>
        <div className="flex-1">
          <p className="text-white font-semibold">Earn ₹{config.reward || 100} per friend</p>
          <p className="text-xs text-white/60 mt-0.5">{config.subtitle}</p>
        </div>
      </div>
    </Section>
  );
}

function VideoSection({ title, config }) {
  if (!config.url) return null;
  return (
    <Section title={title}>
      <div className="rounded-3xl overflow-hidden shadow-sm aspect-video bg-black">
        <iframe src={config.url} title={title} className="w-full h-full" allowFullScreen />
      </div>
    </Section>
  );
}

function CustomSection({ title, config }) {
  return (
    <Section title={title}>
      <div className="rounded-3xl bg-white shadow-sm p-5" data-testid="section-custom">
        {config.image && <img src={config.image} alt="" className="w-full h-32 object-cover rounded-2xl mb-3" />}
        <p className="text-sm text-n800">{config.text || config.subtitle}</p>
      </div>
    </Section>
  );
}

const RENDERERS = {
  banner: BannerSection,
  repair_service: RepairServiceSection,
  shop_products: ProductsSection,
  flash_sale: FlashSaleSection,
  sell_phone: SellSection,
  buy_phone: BuySection,
  referral: ReferralSection,
  video: VideoSection,
  custom: CustomSection,
};

export default function Home() {
  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["sections"], queryFn: () => api.get("/sections").then((r) => r.data),
  });

  return (
    <div className="pb-6" data-testid="home-page">
      {isLoading && <div className="px-4 pt-4"><div className="fx-skeleton h-44 rounded-3xl" /></div>}
      {sections.map((sec, idx) => {
        const R = RENDERERS[sec.type];
        if (!R) return null;
        if (idx === 0) return <React.Fragment key={sec.id}><R title={sec.title} config={sec.config || {}} /><QuickActions /></React.Fragment>;
        return <R key={sec.id} title={sec.title} config={sec.config || {}} />;
      })}
      {!isLoading && !sections.length && <Empty text="No content yet. Add sections from the admin panel." />}
      <div className="px-4 mt-8 flex items-center justify-center gap-2 text-n500 text-xs">
        <ShieldCheck className="w-4 h-4" /> Trusted by 10,000+ customers in Jammu
      </div>
    </div>
  );
}
