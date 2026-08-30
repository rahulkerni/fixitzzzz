import React, { useState } from "react";
import { X, Send } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function RequestPriceModal({ type, brand, urgent, onClose }) {
  const [model, setModel] = useState("");
  const [phone, setPhone] = useState("");
  const [fault, setFault] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!model.trim()) return toast.error("Enter your phone model");
    if (!/^\d{10}$/.test(phone.trim())) return toast.error("Enter a valid 10-digit number");
    setBusy(true);
    try {
      await api.post("/price-request", { type, brand: brand || null, model, phone, fault, urgent: !!urgent });
      toast.success("Sent to our team! We'll contact you with a price shortly.");
      onClose();
    } catch { toast.error("Could not send. Please try again."); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-[480px] rounded-t-3xl sm:rounded-3xl p-5" onClick={(e) => e.stopPropagation()} data-testid="request-price-modal">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-display text-xl">{urgent ? "Need help finding it? 👋" : "Request a Price"}</h3>
          <button onClick={onClose} data-testid="rp-close"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-n500 mb-4">{urgent ? "Can't find your model or fault? Send your model + number and our team will contact you urgently." : "Tell us your model and we'll send you the best price."}</p>
        <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Your phone model (e.g. iPhone 12 Pro)" data-testid="rp-model" className="w-full bg-n200/40 rounded-xl p-3 text-sm outline-none focus:ring-2 ring-fx mb-2" />
        <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" placeholder="10-digit mobile number" data-testid="rp-phone" className="w-full bg-n200/40 rounded-xl p-3 text-sm outline-none focus:ring-2 ring-fx mb-2" />
        {type === "repair" && <textarea value={fault} onChange={(e) => setFault(e.target.value)} rows={2} placeholder="What's the problem? (e.g. screen cracked, won't charge)" data-testid="rp-fault" className="w-full bg-n200/40 rounded-xl p-3 text-sm outline-none focus:ring-2 ring-fx mb-2" />}
        <button onClick={submit} disabled={busy} data-testid="rp-submit" className="w-full bg-fx text-white font-bold py-3.5 rounded-full active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"><Send className="w-4 h-4" /> Request Price</button>
      </div>
    </div>
  );
}
