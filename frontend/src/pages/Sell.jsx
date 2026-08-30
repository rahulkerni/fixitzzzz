import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Search, Sparkles, MapPin, Phone, Check, TrendingUp, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { fmt } from "@/lib/utils2";
import { CountUp } from "@/components/common";
import { toast } from "sonner";

export default function Sell() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);        // 0 device, 1 questions, 2 quote
  const [q, setQ] = useState("");
  const [device, setDevice] = useState(null);
  const [answers, setAnswers] = useState({});
  const [qi, setQi] = useState(0);            // question index
  const [quote, setQuote] = useState(null);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const { data: devices = [] } = useQuery({ queryKey: ["sdevices", q], queryFn: () => api.get("/sell/devices", { params: { q: q || undefined } }).then((r) => r.data) });
  const { data: conditions = [] } = useQuery({ queryKey: ["sconds"], queryFn: () => api.get("/sell/conditions").then((r) => r.data) });

  const livePrice = useMemo(() => {
    if (!device) return 0;
    let p = device.base_price;
    conditions.forEach((c) => {
      const sel = answers[c.id];
      if (!sel) return;
      const opt = c.options.find((o) => o.label === sel);
      if (!opt) return;
      if (c.kind === "multiplier") p *= opt.value; else p -= opt.value;
    });
    return Math.max(0, Math.round(p));
  }, [device, conditions, answers]);

  const low = Math.round(livePrice * 0.96);
  const high = Math.round(livePrice * 1.03);

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
    if (!/^\d{10}$/.test(phone.trim())) { toast.error("Enter a valid 10-digit mobile number"); return; }
    if (!address.trim()) { toast.error("Enter pickup address"); return; }
    await api.post("/orders", {
      type: "sell", amount: quote.price,
      items: [{ name: device.model, price: quote.price }],
      details: { device: device.model, breakdown: quote.breakdown },
      address: { text: address, phone }, payment: { status: "on_pickup" },
    });
    toast.success("Pickup booked! We'll collect & pay you.");
    nav("/orders");
  };

  const back = () => {
    if (step === 0) return nav(-1);
    if (step === 1) { if (qi > 0) return setQi(qi - 1); return setStep(0); }
    if (step === 2) { setStep(1); setQi(conditions.length - 1); }
  };

  const cond = conditions[qi];

  return (
    <div className="pb-6" data-testid="sell-page">
      <div className="px-4 pt-4 flex items-center gap-3">
        <button onClick={back} className="p-1.5 rounded-full bg-white shadow-sm active:scale-90 transition-transform"><ChevronLeft className="w-5 h-5" /></button>
        <h1 className="font-display text-2xl text-n900">Sell Your Phone</h1>
      </div>

      {/* STEP 0 — pick device */}
      {step === 0 && (
        <div className="px-4 mt-4">
          <div className="flex items-center gap-2 bg-white rounded-full shadow-sm px-4 py-2.5 mb-3">
            <Search className="w-5 h-5 text-n500" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your phone model…" data-testid="sell-search" className="flex-1 outline-none text-sm bg-transparent" />
          </div>
          <div className="space-y-3" data-testid="sell-devices">
            {devices.map((d) => (
              <button key={d.id} onClick={() => { setDevice(d); setAnswers({}); setQi(0); setStep(1); }} data-testid={`device-${d.id}`}
                className="w-full bg-white rounded-2xl shadow-sm p-3 flex items-center gap-3 fx-selectable">
                <img src={d.image} alt="" className="w-12 h-12 rounded-xl object-cover" />
                <div className="flex-1 text-left"><p className="font-semibold text-n900">{d.model}</p><p className="text-xs text-n500">Up to {fmt(d.base_price)}</p></div>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </button>
            ))}
          </div>
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
              <p className="text-sm text-n500 mb-4">Pick the option that best describes your <span className="font-semibold">{device.model}</span></p>
              <div className="space-y-3" data-testid={`sell-question-${cond.id}`}>
                {cond.options.map((o) => {
                  const active = answers[cond.id] === o.label;
                  return (
                    <button key={o.label} onClick={() => pickOption(cond, o)} data-testid={`cond-${cond.id}-${o.label}`}
                      className={`w-full text-left bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between fx-selectable ${active ? "fx-selectable-active" : ""}`}>
                      <span className="font-semibold text-n800">{o.label}</span>
                      <span className="flex items-center gap-2">
                        {o.value > 0 && <span className="text-xs text-red-400 font-medium">-{fmt(o.value)}</span>}
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
            <p className="text-sm text-white/80">Your instant quote</p>
            <CountUp value={quote.price} className="font-display text-4xl mt-1 block" />
            <p className="text-xs text-white/80 mt-1">{fmt(Math.round(quote.price * 0.96))} – {fmt(Math.round(quote.price * 1.03))}</p>
            <p className="text-[11px] text-white/70 mt-1">{device.model} · Final price after inspection</p>
          </motion.div>
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
            <label className="text-xs font-semibold text-n800 flex items-center gap-1 mb-2"><Phone className="w-4 h-4 text-fx" /> Mobile Number (required)</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" data-testid="sell-phone" placeholder="10-digit mobile number" className="w-full bg-n200/40 rounded-xl p-3 text-sm outline-none focus:ring-2 ring-fx" />
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-xs font-semibold text-n800 flex items-center gap-1 mb-2"><MapPin className="w-4 h-4 text-fx" /> Pickup Address (Jammu)</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} data-testid="sell-address" rows={2} className="w-full bg-n200/40 rounded-xl p-3 text-sm outline-none" />
          </div>
          <div className="flex items-center justify-center gap-1 text-xs text-n500"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Free doorstep pickup · Instant payment</div>
          <button onClick={bookPickup} data-testid="sell-book-btn" className="w-full bg-fx text-white font-bold py-4 rounded-full active:scale-95 transition-transform">Book Free Pickup</button>
        </div>
      )}
    </div>
  );
}
