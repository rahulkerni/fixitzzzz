import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Search, Sparkles, MapPin, Phone, Check, TrendingUp, ShieldCheck, Smartphone, BadgeCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { fmt } from "@/lib/utils2";
import { CountUp } from "@/components/common";
import { toast } from "sonner";
import RequestPriceModal from "@/components/RequestPriceModal";

export default function Sell() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);        // 0 device, 1 questions, 2 quote
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("");
  const [modelId, setModelId] = useState("");
  const [catalogStep, setCatalogStep] = useState(0); // 0 brand, 1 model, 2 variant
  const [device, setDevice] = useState(null);
  const [answers, setAnswers] = useState({});
  const [qi, setQi] = useState(0);            // question index
  const [quote, setQuote] = useState(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState(user?.name || "");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Jammu");
  const [timeSlot, setTimeSlot] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank");
  const [req, setReq] = useState(null);

  const { data: catalog = { brands: [], models: [], variants: [] } } = useQuery({ queryKey: ["sell-catalog"], queryFn: () => api.get("/sell/catalog").then((r) => r.data) });
  const { data: conditions = [] } = useQuery({ queryKey: ["sconds"], queryFn: () => api.get("/sell/conditions").then((r) => r.data) });
  const brandOptions = catalog.brands || [];
  const modelOptions = (catalog.models || []).filter((item) => !brand || item.brand_id === brand);
  const variantOptions = (catalog.variants || []).filter((item) => { const model = (catalog.models || []).find((m) => m.id === item.model_id); return (!modelId || item.model_id === modelId) && (!q || `${item.name} ${model?.name || ""}`.toLowerCase().includes(q.toLowerCase())); }).map((item) => ({ ...item, brand: brandOptions.find((b) => b.id === (catalog.models || []).find((m) => m.id === item.model_id)?.brand_id)?.name || "", model: (catalog.models || []).find((m) => m.id === item.model_id)?.name || "", variant: item.name }));
  const selectedModel = modelOptions.find((item) => item.id === modelId);
  const selectedBrand = brandOptions.find((item) => item.id === brand);

  const livePrice = useMemo(() => {
    if (!device) return 0;
    let p = device.base_price;
    conditions.forEach((c) => {
      const sel = answers[c.id];
      if (!sel) return;
      const opt = c.options.find((o) => o.label === sel);
      if (!opt) return;
      const rule = device.deduction_rules?.[c.id]?.[opt.label];
      if (!rule) return;
      p -= rule.mode === "percent" ? p * Number(rule.value || 0) / 100 : Number(rule.value || 0);
    });
    return Math.max(0, Math.round(p));
  }, [device, conditions, answers]);

  const low = Math.round(livePrice * 0.96);
  const high = Math.round(livePrice * 1.03);
  const maxDeduction = conditions.reduce((sum, c) => sum + Math.max(...(c.options || []).map((o) => { const r = device?.deduction_rules?.[c.id]?.[o.label]; return r?.mode === "percent" ? (device?.base_price || 0) * Number(r.value || 0) / 100 : Number(r?.value || 0); }), 0), 0);
  const appliedDeduction = Math.max(0, (device?.base_price || 0) - livePrice);
  const score = Math.max(0, Math.min(100, Math.round(100 - (appliedDeduction / Math.max(device?.base_price || 1, maxDeduction * 2)) * 100)));

  const pickOption = (c, opt) => {
    setAnswers((a) => ({ ...a, [c.id]: opt.label }));
    setTimeout(() => {
      if (qi < conditions.length - 1) setQi(qi + 1);
      else getQuote({ ...answers, [c.id]: opt.label });
    }, 260);
  };

  const getQuote = async (ans) => {
    const { data } = await api.post("/sell/quote", { device_id: device.id, answers: ans });
    setQuote(data); setStep(2);
  };

  const bookPickup = async () => {
    if (!user) { toast.error("Login to sell"); nav("/login"); return; }
    if (!name.trim()) { toast.error("Enter your name"); return; }
    if (!/^\d{10}$/.test(phone.trim())) { toast.error("Enter a valid 10-digit mobile number"); return; }
    if (!address.trim()) { toast.error("Enter pickup address"); return; }
    if (!city.trim() || !timeSlot) { toast.error("Choose a city and pickup time"); return; }
    await api.post("/orders", {
      type: "sell", amount: quote.price,
      items: [{ name: device.model, price: quote.price }],
      details: { brand: device.brand, model: device.model, variant: device.variant, device: device.model, breakdown: quote.breakdown, condition_score: score },
      address: { name, text: address, city, phone, time_slot: timeSlot }, payment: { status: "on_pickup", method: paymentMethod },
    });
    toast.success("Pickup booked! We'll collect & pay you.");
    nav("/orders");
  };

  const back = () => {
    if (step === 0) {
      if (catalogStep === 2) { setCatalogStep(brand ? 1 : 0); setModelId(""); return; }
      if (catalogStep === 1) { setCatalogStep(0); setBrand(""); return; }
      return nav(-1);
    }
    if (step === 1) { if (qi > 0) return setQi(qi - 1); return setStep(0); }
    if (step === 2) { setStep(1); setQi(conditions.length - 1); }
  };

  const cond = conditions[qi];

  return (
    <div className="pb-28" data-testid="sell-page">
      <div className="px-4 pt-4 flex items-center gap-3">
        <button onClick={back} className="p-1.5 rounded-full bg-white shadow-sm active:scale-90 transition-transform"><ChevronLeft className="w-5 h-5" /></button>
        <h1 className="font-display text-2xl text-n900">Sell Your Phone</h1>
      </div>

      <div className="mx-4 mt-4 rounded-3xl bg-n900 overflow-hidden relative shadow-lg" data-testid="sell-hero">
        <div className="absolute -right-10 -top-12 w-40 h-40 rounded-full bg-emerald-400/20 blur-2xl" />
        <div className="relative p-5">
          <p className="text-emerald-300 text-xs font-bold uppercase tracking-wide">Turn your phone into cash</p>
          <h2 className="font-display text-2xl leading-tight text-white mt-2">Get a fair price.<br />Get paid without the wait.</h2>
          <div className="mt-4 flex items-center gap-2 text-white/70 text-xs"><ShieldCheck className="w-4 h-4 text-emerald-300" /> Free pickup · Instant payment</div>
        </div>
      </div>

      {/* STEP 0 — pick device */}
      {step === 0 && (
        <div className="px-4 mt-4">
          <div className="mb-3">
            <p className="text-xs font-semibold text-n500 mb-2">2. Select device</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {brandOptions.map((item) => (
                <button key={item.id} onClick={() => { setBrand(item.id); setModelId(""); setDevice(null); setCatalogStep(1); }} className={`min-h-32 rounded-2xl p-3 flex flex-col items-center justify-center gap-2 text-center font-bold fx-selectable ${brand === item.id ? "bg-fx text-white ring-2 ring-fx ring-offset-2" : "bg-white text-n800 shadow-sm"}`}>
                  {item.image ? <img src={item.image} alt="" onError={(e) => e.currentTarget.style.display = "none"} className="w-16 h-16 rounded-xl object-contain bg-white" /> : <Smartphone className="w-12 h-12" />}
                  <span className="text-sm leading-tight">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-full shadow-sm px-4 py-2.5 mb-3">
            <Search className="w-5 h-5 text-n500" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setBrand(""); setModelId(""); setCatalogStep(2); }} placeholder="Search any variant directly" data-testid="sell-search" className="flex-1 outline-none text-sm bg-transparent" />
          </div>
          {brand && !q && catalogStep === 1 && <div className="space-y-3 mb-4">
            <p className="text-xs font-semibold text-n500">Choose your model</p>
            <div className="grid grid-cols-2 gap-3">{modelOptions.map((item) => <button key={item.id} onClick={() => { setModelId(item.id); setCatalogStep(2); }} className="bg-white rounded-2xl p-3 text-left shadow-sm fx-selectable fx-3d-card">
              {item.image ? <img src={item.image} alt="" className="w-full h-28 object-contain rounded-xl bg-n200/30" /> : <div className="w-full h-28 rounded-xl bg-n200/30 flex items-center justify-center"><Smartphone className="w-10 h-10 text-n500" /></div>}
              <p className="text-sm font-bold text-n900 mt-2">{item.name}</p>
              <p className="text-[10px] text-n500 mt-1 flex items-center gap-1"><BadgeCheck className="w-3 h-3 text-emerald-500" />{item.details?.inspection || "Verified resale model"}</p>
              <p className="text-[10px] text-fx font-semibold mt-1">{item.details?.service || "Free doorstep pickup"}</p>
            </button>)}</div>
          </div>}
          {catalogStep === 2 && <p className="text-xs font-semibold text-n500 mb-3">Choose a variant for {selectedBrand?.name} {selectedModel?.name}</p>}
          {catalogStep === 2 && <div className="space-y-3" data-testid="sell-devices">
            {variantOptions.map((d) => (
              <button key={d.id} onClick={() => { setDevice(d); setAnswers({}); setQi(0); setStep(1); }} data-testid={`device-${d.id}`}
                className="w-full bg-white rounded-2xl p-3 flex items-center gap-3 fx-selectable fx-3d-card">
                <img src={d.image || selectedModel?.image} alt={`${d.brand} ${d.model}`} className="w-16 h-16 rounded-xl object-contain bg-n200/30" />
                <div className="flex-1 text-left"><p className="font-semibold text-n900">{d.brand} {d.model}</p><p className="text-xs text-n500">{d.name} storage · Base {fmt(d.base_price)}</p><p className="text-[10px] text-emerald-600 font-semibold mt-1">Free pickup · Checked at doorstep</p></div>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </button>
            ))}
          </div>}
          {!brand && !q && <p className="text-center text-sm text-n500 py-6">Choose a brand or search a model directly.</p>}
          <button onClick={() => setReq({ urgent: false })} data-testid="sell-other-model" className="w-full mt-3 bg-fx-light text-fx font-bold py-3 rounded-xl active:scale-95 transition-transform">My model isn't listed — Request a price</button>
        </div>
      )}

      {/* STEP 1 — one question per screen */}
      {step === 1 && cond && (
        <div className="px-4 mt-4 pb-40">
          <div className="flex items-center gap-1 mb-2">
            {conditions.map((_, i) => <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= qi ? "bg-fx" : "bg-n200"}`} />)}
          </div>
          <p className="text-xs font-semibold text-n500 mb-4">Step {qi + 1} of {conditions.length}</p>

          <AnimatePresence mode="wait">
            <motion.div key={cond.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }}>
              <h2 className="font-display text-2xl text-n900 mb-1">{cond.label}</h2>
              <p className="text-xs font-semibold text-fx mb-1">{cond.key === "screen" ? "Broken screen, lines or spots?" : cond.key === "battery" ? "Drains fast or heating?" : cond.key === "body" ? "Dents or scratches?" : cond.key === "working" ? "Face ID, fingerprint or camera working?" : "Original bill and box available?"}</p>
              <p className="text-sm text-n500 mb-4">Pick the option that best describes your <span className="font-semibold">{device.model}</span></p>
              <div className="space-y-3" data-testid={`sell-question-${cond.id}`}>
                {cond.options.map((o) => {
                  const active = answers[cond.id] === o.label;
                  return (
                    <button key={o.label} onClick={() => pickOption(cond, o)} data-testid={`cond-${cond.id}-${o.label}`}
                      className={`w-full text-left bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between fx-selectable ${active ? "fx-selectable-active" : ""}`}>
                      <span className="font-semibold text-n800">{o.label}</span>
                      <span className="flex items-center gap-2">
                        {device.deduction_rules?.[cond.id]?.[o.label]?.value > 0 && <span className="text-xs text-red-400 font-medium">-{device.deduction_rules[cond.id][o.label].mode === "percent" ? `${device.deduction_rules[cond.id][o.label].value}%` : fmt(device.deduction_rules[cond.id][o.label].value)}</span>}
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center ${active ? "bg-fx text-white" : "border-2 border-n200"}`}>{active && <Check className="w-3.5 h-3.5" />}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* live estimated price bar */}
          <div className="fixed bottom-[72px] left-1/2 -translate-x-1/2 w-full max-w-[480px] px-4 z-30">
            <div className="bg-n900 rounded-2xl p-4 shadow-xl flex items-center justify-between">
              <div>
                <p className="text-white/60 text-[11px] flex items-center gap-1"><Sparkles className="w-3 h-3 text-fx" /> Estimated Price</p>
                <CountUp value={livePrice} className="font-display text-2xl text-white block" />
                <p className="text-fx text-[11px] font-semibold">{fmt(low)} – {fmt(high)}</p>
              </div>
              <p className="text-white/50 text-[10px] max-w-[130px] text-right">Based on condition + live demand. Final price after inspection.</p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2 — quote + pickup */}
      {step === 2 && quote && (
        <div className="px-4 mt-4 space-y-4" data-testid="sell-quote">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-6 text-white text-center relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/10 blur-2xl" />
            <p className="text-sm text-white/80">Final estimated price</p>
            <CountUp value={quote.price} className="font-display text-4xl mt-1 block" />
            <p className="text-xs text-white/80 mt-1">{fmt(Math.round(quote.price * 0.96))} – {fmt(Math.round(quote.price * 1.03))}</p>
            <p className="text-[11px] text-white/70 mt-1">{device.model} · {device.variant} · Subject to inspection</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl shadow-sm p-4"><p className="text-xs text-n500">Base price</p><p className="font-display text-xl text-n900">{fmt(device.base_price)}</p><p className="text-[11px] text-n500">Before deductions</p></div>
            <div className="bg-white rounded-2xl shadow-sm p-4"><p className="text-xs text-n500">Device score</p><p className="font-display text-xl text-emerald-600">{score}/100</p><p className="text-[11px] text-n500">Based on answers</p></div>
          </div>
          <div className="bg-fx-light rounded-2xl p-3 flex items-start gap-2 border border-fx/20">
            <Sparkles className="w-4 h-4 text-fx mt-0.5" />
            <p className="text-xs text-n800"><span className="font-bold">AI insight:</span> High demand for your model today 🔥 — price is optimized on condition + live market demand.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs font-semibold text-n500 mb-2">Price Breakdown</p>
            <div className="flex justify-between text-sm py-1"><span>Base value</span><span>{fmt(device.base_price)}</span></div>
            {quote.breakdown.map((b, i) => <div key={i} className="flex justify-between text-sm py-1 text-n800"><span>{b.label}</span><span className="text-red-500">{b.effect}</span></div>)}
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs font-semibold text-n500 mb-3">Pickup details</p>
            <label className="text-xs font-semibold text-n800 block mb-2">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} data-testid="sell-name" placeholder="Your full name" className="w-full bg-n200/40 rounded-xl p-3 text-sm outline-none mb-3" />
            <label className="text-xs font-semibold text-n800 flex items-center gap-1 mb-2"><Phone className="w-4 h-4 text-fx" /> Mobile Number</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" data-testid="sell-phone" placeholder="10-digit mobile number" className="w-full bg-n200/40 rounded-xl p-3 text-sm outline-none focus:ring-2 ring-fx" />
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-xs font-semibold text-n800 flex items-center gap-1 mb-2"><MapPin className="w-4 h-4 text-fx" /> Address</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} data-testid="sell-address" rows={2} className="w-full bg-n200/40 rounded-xl p-3 text-sm outline-none" />
            <label className="text-xs font-semibold text-n800 block mt-3 mb-2">City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} data-testid="sell-city" className="w-full bg-n200/40 rounded-xl p-3 text-sm outline-none" />
            <label className="text-xs font-semibold text-n800 block mt-3 mb-2">Pickup time slot</label>
            <select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} data-testid="sell-time-slot" className="w-full bg-n200/40 rounded-xl p-3 text-sm outline-none"><option value="">Choose a slot</option><option>9:00 AM – 12:00 PM</option><option>12:00 PM – 3:00 PM</option><option>3:00 PM – 6:00 PM</option></select>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs font-semibold text-n500 mb-3">Payment option</p>
            <div className="grid grid-cols-2 gap-2">{[["bank", "Bank transfer"], ["upi", "UPI"], ["cash", "Cash on pickup"]].map(([value, label]) => <button key={value} onClick={() => setPaymentMethod(value)} className={`rounded-xl border p-3 text-xs font-bold ${paymentMethod === value ? "border-fx bg-fx-light text-fx" : "border-n200 text-n800"}`}>{label}</button>)}</div>
          </div>
          <div className="flex items-center justify-center gap-1 text-xs text-n500"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Free doorstep pickup · Instant payment</div>
          <button onClick={bookPickup} data-testid="sell-book-btn" className="w-full bg-fx text-white font-bold py-4 rounded-full active:scale-95 transition-transform">Book Free Pickup</button>
        </div>
      )}
      {req && <RequestPriceModal type="sell" urgent={req.urgent} onClose={() => setReq(null)} />}
    </div>
  );
}
