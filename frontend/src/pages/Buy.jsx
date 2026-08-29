import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { fmt, payWithRazorpay } from "@/lib/utils2";
import { toast } from "sonner";

const CONDITIONS = [
  { key: null, label: "All" },
  { key: "excellent", label: "Excellent" },
  { key: "good", label: "Good" },
  { key: "fair", label: "Fair" },
];
const CONDCLR = { excellent: "text-emerald-600", good: "text-blue-600", fair: "text-amber-600" };

export default function Buy() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [cond, setCond] = useState(null);
  const [maxPrice, setMaxPrice] = useState(50000);
  const { data: phones = [], isLoading } = useQuery({
    queryKey: ["buy", cond, maxPrice], queryFn: () => api.get("/buy/phones", { params: { condition: cond || undefined, max_price: maxPrice } }).then((r) => r.data),
  });

  const buyNow = (p) => {
    if (!user) { toast.error("Login to buy"); nav("/login"); return; }
    payWithRazorpay({
      amount: p.price, user,
      onSuccess: async (resp) => {
        await api.post("/orders", {
          type: "buy", amount: p.price, items: [{ id: p.id, name: p.name, price: p.price }],
          details: { condition: p.condition }, payment: { id: resp.razorpay_payment_id, status: "paid" },
        });
        toast.success("Order placed!"); nav("/orders");
      },
      onFail: () => toast.error("Payment cancelled"),
    });
  };

  return (
    <div className="pb-6" data-testid="buy-page">
      <div className="px-4 pt-4 flex items-center gap-3">
        <button onClick={() => nav(-1)} className="p-1.5 rounded-full bg-white shadow-sm active:scale-90 transition-transform"><ChevronLeft className="w-5 h-5" /></button>
        <h1 className="font-display text-2xl text-n900">Refurbished Phones</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 mt-3">
        {CONDITIONS.map((c) => (
          <button key={c.label} onClick={() => setCond(c.key)} data-testid={`filter-${c.label.toLowerCase()}`}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold ${cond === c.key ? "bg-fx text-white" : "bg-white text-n800 shadow-sm"}`}>{c.label}</button>
        ))}
      </div>

      <div className="px-4 mt-3">
        <div className="bg-white rounded-2xl shadow-sm p-3">
          <div className="flex justify-between text-xs font-semibold text-n800"><span>Max Price</span><span className="text-fx">{fmt(maxPrice)}</span></div>
          <input type="range" min="5000" max="50000" step="1000" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} data-testid="buy-price-range" className="w-full mt-2 accent-fx" />
        </div>
      </div>

      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="fx-skeleton h-56 rounded-2xl" />)}
        {phones.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl overflow-hidden shadow-sm" data-testid={`buy-item-${p.id}`}>
            <img src={p.image} alt="" className="w-full h-32 object-cover" />
            <div className="p-3">
              <span className={`text-[10px] font-bold uppercase ${CONDCLR[p.condition]}`}>{p.condition}</span>
              <p className="text-sm font-semibold text-n800 line-clamp-2 h-10">{p.name}</p>
              <p className="text-[10px] text-n500 flex items-center gap-1 mt-0.5"><ShieldCheck className="w-3 h-3 text-emerald-600" />{p.warranty}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="font-display text-fx">{fmt(p.price)}</span>
                <button onClick={() => buyNow(p)} data-testid={`buy-now-${p.id}`} className="bg-fx text-white text-[11px] font-bold px-3 py-1.5 rounded-full active:scale-90 transition-transform">Buy</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!isLoading && !phones.length && <p className="text-center text-n500 text-sm py-10">No phones match your filters.</p>}
    </div>
  );
}
