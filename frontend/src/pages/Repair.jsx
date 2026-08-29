import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Check, Clock, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Price } from "@/components/common";
import { fmt, track, payWithRazorpay } from "@/lib/utils2";
import { toast } from "sonner";

export default function Repair() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [brand, setBrand] = useState(null);
  const [model, setModel] = useState(null);
  const [service, setService] = useState(null);
  const [address, setAddress] = useState("");

  const { data: brands = [] } = useQuery({ queryKey: ["rbrands"], queryFn: () => api.get("/repair/brands").then((r) => r.data) });
  const { data: models = [] } = useQuery({ queryKey: ["rmodels", brand?.id], queryFn: () => api.get("/repair/models", { params: { brand_id: brand.id } }).then((r) => r.data), enabled: !!brand });
  const { data: services = [] } = useQuery({ queryKey: ["rservices", model?.id], queryFn: () => api.get("/repair/services", { params: { model_id: model.id } }).then((r) => r.data), enabled: !!model });

  useEffect(() => { if (model) { const start = Date.now(); return () => track({ type: "model_view", model: model.name, seconds: Math.round((Date.now() - start) / 1000) }); } }, [model]);

  const back = () => { if (step === 0) nav(-1); else setStep(step - 1); };

  const book = async () => {
    if (!user) { toast.error("Please login to book"); nav("/login"); return; }
    if (!address.trim()) { toast.error("Enter your address"); return; }
    payWithRazorpay({
      amount: service.price, user,
      onSuccess: async (resp) => {
        await api.post("/orders", {
          type: "repair", amount: service.price,
          items: [{ name: `${model.name} — ${service.issue_name}`, price: service.price }],
          details: { brand: brand.name, model: model.name, issue: service.issue_name },
          address: { text: address }, payment: { id: resp.razorpay_payment_id, status: "paid" },
        });
        toast.success("Repair booked! Technician arriving in 30 min.");
        nav("/orders");
      },
      onFail: () => toast.error("Payment cancelled"),
    });
  };

  const steps = ["Brand", "Model", "Issue", "Confirm"];

  return (
    <div className="pb-6" data-testid="repair-page">
      <div className="px-4 pt-4 flex items-center gap-3">
        <button onClick={back} className="p-1.5 rounded-full bg-white shadow-sm active:scale-90 transition-transform" data-testid="repair-back"><ChevronLeft className="w-5 h-5" /></button>
        <h1 className="font-display text-2xl text-n900">Book a Repair</h1>
      </div>

      <div className="px-4 mt-3 flex items-center gap-1">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex-1 h-1.5 rounded-full ${i <= step ? "bg-fx" : "bg-n200"}`} />
          </React.Fragment>
        ))}
      </div>
      <p className="px-4 mt-2 text-xs text-n500 font-semibold">Step {step + 1} of 4 · {steps[step]}</p>

      <div className="mx-4 mt-3 bg-fx-light rounded-2xl p-3 flex items-center gap-2">
        <Clock className="w-4 h-4 text-fx" /><span className="text-xs font-bold text-fx">30-Minute Repair Guarantee · Jammu Doorstep</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="px-4 mt-4">
          {step === 0 && (
            <div className="grid grid-cols-3 gap-3" data-testid="repair-brands">
              {brands.map((b) => (
                <button key={b.id} onClick={() => { setBrand(b); setStep(1); }} data-testid={`brand-${b.id}`}
                  className="bg-white rounded-2xl shadow-sm p-3 flex flex-col items-center gap-2 active:scale-95 transition-transform">
                  <img src={b.image} alt={b.name} className="w-10 h-10 object-contain" onError={(e) => (e.target.style.display = "none")} />
                  <span className="text-xs font-semibold">{b.name}</span>
                </button>
              ))}
            </div>
          )}
          {step === 1 && (
            <div className="space-y-3" data-testid="repair-models">
              {models.map((m) => (
                <button key={m.id} onClick={() => { setModel(m); setStep(2); }} data-testid={`model-${m.id}`}
                  className="w-full bg-white rounded-2xl shadow-sm p-3 flex items-center gap-3 active:scale-[0.98] transition-transform">
                  <img src={m.image} alt="" className="w-12 h-12 rounded-xl object-cover" />
                  <span className="font-semibold text-n900">{m.name}</span>
                </button>
              ))}
              {!models.length && <p className="text-n500 text-sm text-center py-6">No models yet.</p>}
            </div>
          )}
          {step === 2 && (
            <div className="space-y-3" data-testid="repair-issues">
              {services.map((s) => (
                <button key={s.id} onClick={() => { setService(s); setStep(3); }} data-testid={`service-${s.id}`}
                  className="w-full bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between active:scale-[0.98] transition-transform">
                  <span className="font-semibold text-n900">{s.issue_name}</span>
                  <Price price={s.price} />
                </button>
              ))}
              {!services.length && <p className="text-n500 text-sm text-center py-6">No services configured.</p>}
            </div>
          )}
          {step === 3 && service && (
            <div className="space-y-4" data-testid="repair-confirm">
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <p className="text-xs text-n500">Repair Summary</p>
                <p className="font-display text-lg mt-1">{brand.name} {model.name}</p>
                <p className="text-sm text-n800">{service.issue_name}</p>
                <div className="border-t border-n200 mt-3 pt-3 flex justify-between items-center">
                  <span className="font-semibold">Total</span>
                  <span className="font-display text-2xl text-fx">{fmt(service.price)}</span>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <label className="text-xs font-semibold text-n800 flex items-center gap-1 mb-2"><MapPin className="w-4 h-4 text-fx" /> Doorstep Address (Jammu)</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} data-testid="repair-address" rows={3}
                  placeholder="House no, street, area, landmark…" className="w-full bg-n200/40 rounded-xl p-3 text-sm outline-none focus:ring-2 ring-fx" />
              </div>
              <button onClick={book} data-testid="repair-book-btn"
                className="w-full bg-fx text-white font-bold py-4 rounded-full active:scale-95 transition-transform flex items-center justify-center gap-2">
                <Check className="w-5 h-5" /> Pay {fmt(service.price)} & Book
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
