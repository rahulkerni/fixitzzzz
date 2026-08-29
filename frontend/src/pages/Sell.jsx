import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Search, Sparkles, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { fmt } from "@/lib/utils2";
import { toast } from "sonner";

export default function Sell() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [q, setQ] = useState("");
  const [device, setDevice] = useState(null);
  const [answers, setAnswers] = useState({});
  const [quote, setQuote] = useState(null);
  const [address, setAddress] = useState("");

  const { data: devices = [] } = useQuery({ queryKey: ["sdevices", q], queryFn: () => api.get("/sell/devices", { params: { q: q || undefined } }).then((r) => r.data) });
  const { data: conditions = [] } = useQuery({ queryKey: ["sconds"], queryFn: () => api.get("/sell/conditions").then((r) => r.data) });

  const getQuote = async () => {
    const { data } = await api.post("/sell/quote", { device_id: device.id, answers });
    setQuote(data); setStep(2);
  };

  const bookPickup = async () => {
    if (!user) { toast.error("Login to sell"); nav("/login"); return; }
    if (!address.trim()) { toast.error("Enter pickup address"); return; }
    await api.post("/orders", {
      type: "sell", amount: quote.price,
      items: [{ name: device.model, price: quote.price }],
      details: { device: device.model, breakdown: quote.breakdown },
      address: { text: address }, payment: { status: "on_pickup" },
    });
    toast.success("Pickup booked! We'll collect & pay you.");
    nav("/orders");
  };

  const back = () => { if (step === 0) nav(-1); else setStep(step - 1); };
  const allAnswered = conditions.length && conditions.every((c) => answers[c.id]);

  return (
    <div className="pb-6" data-testid="sell-page">
      <div className="px-4 pt-4 flex items-center gap-3">
        <button onClick={back} className="p-1.5 rounded-full bg-white shadow-sm active:scale-90 transition-transform"><ChevronLeft className="w-5 h-5" /></button>
        <h1 className="font-display text-2xl text-n900">Sell Your Phone</h1>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="px-4 mt-4">
          {step === 0 && (
            <>
              <div className="flex items-center gap-2 bg-white rounded-full shadow-sm px-4 py-2.5 mb-3">
                <Search className="w-5 h-5 text-n500" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your phone model…" data-testid="sell-search" className="flex-1 outline-none text-sm bg-transparent" />
              </div>
              <div className="space-y-3" data-testid="sell-devices">
                {devices.map((d) => (
                  <button key={d.id} onClick={() => { setDevice(d); setAnswers({}); setStep(1); }} data-testid={`device-${d.id}`}
                    className="w-full bg-white rounded-2xl shadow-sm p-3 flex items-center gap-3 active:scale-[0.98] transition-transform">
                    <img src={d.image} alt="" className="w-12 h-12 rounded-xl object-cover" />
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-n900">{d.model}</p>
                      <p className="text-xs text-n500">Up to {fmt(d.base_price)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 1 && (
            <div className="space-y-4" data-testid="sell-conditions">
              <p className="text-sm text-n500">Answer a few questions about your <span className="font-bold text-n900">{device.model}</span></p>
              {conditions.map((c) => (
                <div key={c.id} className="bg-white rounded-2xl shadow-sm p-4">
                  <p className="font-semibold text-n900 mb-2">{c.label}</p>
                  <div className="grid grid-cols-1 gap-2">
                    {c.options.map((o) => (
                      <button key={o.label} onClick={() => setAnswers({ ...answers, [c.id]: o.label })} data-testid={`cond-${c.id}-${o.label}`}
                        className={`text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${answers[c.id] === o.label ? "bg-fx text-white" : "bg-n200/40 text-n800"}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={getQuote} disabled={!allAnswered} data-testid="sell-getquote"
                className="w-full bg-fx text-white font-bold py-4 rounded-full active:scale-95 transition-transform disabled:opacity-40 flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" /> Get Instant Price
              </button>
            </div>
          )}
          {step === 2 && quote && (
            <div className="space-y-4" data-testid="sell-quote">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-6 text-white text-center">
                <p className="text-sm text-white/80">Your instant quote</p>
                <p className="font-display text-4xl mt-1">{fmt(quote.price)}</p>
                <p className="text-xs text-white/70 mt-1">{device.model}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <p className="text-xs font-semibold text-n500 mb-2">Price Breakdown</p>
                <div className="flex justify-between text-sm py-1"><span>Base value</span><span>{fmt(device.base_price)}</span></div>
                {quote.breakdown.map((b, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 text-n800"><span>{b.label}</span><span className="text-red-500">{b.effect}</span></div>
                ))}
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <label className="text-xs font-semibold text-n800 flex items-center gap-1 mb-2"><MapPin className="w-4 h-4 text-fx" /> Pickup Address (Jammu)</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} data-testid="sell-address" rows={2} className="w-full bg-n200/40 rounded-xl p-3 text-sm outline-none" />
              </div>
              <button onClick={bookPickup} data-testid="sell-book-btn" className="w-full bg-fx text-white font-bold py-4 rounded-full active:scale-95 transition-transform">Book Free Pickup</button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
