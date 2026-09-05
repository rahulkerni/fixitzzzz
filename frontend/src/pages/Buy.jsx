import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ShieldCheck, MapPin, Phone } from "lucide-react";
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
  const [shipping, setShipping] = useState({ name: user?.name || "", phone: user?.phone || "", address: "", city: "", state: "", pincode: "" });
  const [shippingQuote, setShippingQuote] = useState(null);
  const { data: phones = [], isLoading } = useQuery({
    queryKey: ["buy", cond, maxPrice], queryFn: () => api.get("/buy/phones", { params: { condition: cond || undefined, max_price: maxPrice } }).then((r) => r.data),
  });

  const getShippingQuote = async () => {
    if (!/^\d{6}$/.test(shipping.pincode)) { toast.error("Enter a valid 6-digit delivery pincode"); return; }
    try {
      const { data } = await api.get("/shipping/quote", { params: { pincode: shipping.pincode, weight: 1 } });
      setShippingQuote(data);
    } catch (e) { toast.error(e?.response?.data?.detail || "Shipping is not available for this pincode"); }
  };

  const buyNow = (p) => {
    if (!user) { toast.error("Login to buy"); nav("/login"); return; }
    if (!shipping.name.trim() || !/^\d{10}$/.test(shipping.phone) || !shipping.address.trim() || !shipping.city.trim() || !shipping.state.trim() || !/^\d{6}$/.test(shipping.pincode)) {
      toast.error("Complete delivery details before buying"); return;
    }
    if (!shippingQuote) { toast.error("Check delivery charges first"); return; }
    const total = p.price + shippingQuote.charge;
    payWithRazorpay({
      amount: total, user,
      onSuccess: async (resp) => {
        await api.post("/orders", {
          type: "buy", amount: total, items: [{ id: p.id, name: p.name, price: p.price }],
          details: { condition: p.condition, delivery: shippingQuote.charge, delivery_time: shippingQuote.estimated_days },
          address: shipping, shipping: { provider: "shiprocket", status: "pending", quote: shippingQuote },
          payment: { id: resp.razorpay_payment_id, status: "paid" },
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

      <div className="px-4 mt-4">
        <p className="font-display text-lg text-n900 mb-2">Delivery Details</p>
        <div className="bg-white rounded-2xl shadow-sm p-3 space-y-2.5">
          <input value={shipping.name} onChange={(e) => setShipping({ ...shipping, name: e.target.value })} placeholder="Full name" className="w-full bg-n200/30 rounded-xl p-3 text-sm outline-none focus:ring-2 ring-fx" />
          <div className="flex items-center gap-2 bg-n200/30 rounded-xl px-3"><Phone className="w-4 h-4 text-fx" /><input value={shipping.phone} onChange={(e) => setShipping({ ...shipping, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} inputMode="numeric" placeholder="10-digit mobile number" className="flex-1 bg-transparent p-3 text-sm outline-none" /></div>
          <textarea value={shipping.address} onChange={(e) => setShipping({ ...shipping, address: e.target.value })} rows={2} placeholder="Full delivery address" className="w-full bg-n200/30 rounded-xl p-3 text-sm outline-none" />
          <div className="grid grid-cols-2 gap-2"><input value={shipping.city} onChange={(e) => setShipping({ ...shipping, city: e.target.value })} placeholder="City" className="bg-n200/30 rounded-xl p-3 text-sm outline-none" /><input value={shipping.state} onChange={(e) => setShipping({ ...shipping, state: e.target.value })} placeholder="State" className="bg-n200/30 rounded-xl p-3 text-sm outline-none" /></div>
          <div className="flex gap-2"><input value={shipping.pincode} onChange={(e) => setShipping({ ...shipping, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} inputMode="numeric" placeholder="6-digit pincode" className="flex-1 bg-n200/30 rounded-xl p-3 text-sm outline-none" /><button onClick={getShippingQuote} className="bg-n900 text-white px-3 rounded-xl text-xs font-bold">Check delivery</button></div>
          {shippingQuote && <div className="text-sm">
            <div className="flex items-center justify-between"><span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-fx" /> Delivery in {shippingQuote.estimated_days} days</span><span className="font-bold text-fx">{fmt(shippingQuote.charge)}</span></div>
            <p className={`text-[11px] mt-1 ${shippingQuote.available ? "text-emerald-600" : "text-amber-600"}`}>{shippingQuote.available ? "Live Shiprocket rate" : shippingQuote.message}</p>
          </div>}
        </div>
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
        {phones.map((p) => {
          const tag = p.condition === "excellent" ? { l: "Like New", c: "bg-emerald-500" } : p.price <= 12000 ? { l: "Budget Pick", c: "bg-blue-500" } : { l: "Best Value", c: "bg-purple-500" };
          return (
            <div key={p.id} className="bg-white rounded-2xl overflow-hidden shadow-sm fx-selectable" data-testid={`buy-item-${p.id}`}>
              <div className="relative">
                <img src={p.image} alt="" className="w-full h-32 object-cover" />
                <span className={`absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${CONDCLR[p.condition] ? "bg-n900" : "bg-n900"}`}>{p.condition}</span>
                <span className={`absolute top-2 right-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ${tag.c}`}>{tag.l}</span>
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-n800 line-clamp-2 h-10">{p.name}</p>
                <p className="text-[10px] text-n500 flex items-center gap-1 mt-0.5"><ShieldCheck className="w-3 h-3 text-emerald-600" />{p.warranty}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="font-display text-fx">{fmt(p.price)}</span>
                  <button onClick={() => buyNow(p)} data-testid={`buy-now-${p.id}`} className="bg-fx text-white text-[11px] font-bold px-3 py-1.5 rounded-full active:scale-90 transition-transform">Buy</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!isLoading && !phones.length && <p className="text-center text-n500 text-sm py-10">No phones match your filters.</p>}
    </div>
  );
}
