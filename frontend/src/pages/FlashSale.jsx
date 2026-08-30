import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Zap } from "lucide-react";
import api from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

function useCountdown(endsAt) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setLeft(Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  return left;
}

export default function FlashSale() {
  const nav = useNavigate();
  const { add } = useCart();
  const { data, isLoading } = useQuery({ queryKey: ["flash-sale"], queryFn: () => api.get("/flash-sale").then((r) => r.data), refetchInterval: 15000 });
  const products = data?.products || [];
  const left = useCountdown(data?.endsAt);
  const parts = [Math.floor(left / 3600), Math.floor((left % 3600) / 60), left % 60].map((v) => String(v).padStart(2, "0"));
  const live = !!data?.endsAt && left > 0;

  return (
    <div className="pb-24" data-testid="flash-sale-page">
      <div className="bg-gradient-to-br from-fx to-orange-600 px-4 pt-4 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => nav(-1)} className="p-1.5 rounded-full bg-white/20 text-white active:scale-90 transition-transform" data-testid="flash-back"><ChevronLeft className="w-5 h-5" /></button>
          <h1 className="font-display text-2xl text-white flex items-center gap-1.5"><Zap className="w-6 h-6 fill-white" /> Flash Sale</h1>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className="text-white/90 text-sm font-semibold">{live ? "Ends in" : "Deals live now"}</span>
          {live && (
            <div className="flex items-center gap-1" data-testid="flash-countdown">
              {parts.map((v, i) => (
                <React.Fragment key={i}>
                  <motion.span key={v} initial={{ scale: 1.15 }} animate={{ scale: 1 }} className="bg-n900 text-white rounded-md px-2 py-1 text-sm font-bold font-mono">{v}</motion.span>
                  {i < 2 && <span className="text-white font-bold">:</span>}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 mt-5 grid grid-cols-2 gap-3">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="fx-skeleton h-52 rounded-2xl" />)}
        {products.map((p) => {
          const price = p.flash_price != null && p.flash_price !== "" ? Number(p.flash_price) : p.price;
          const disc = p.mrp > price ? Math.round((1 - price / p.mrp) * 100) : 0;
          return (
            <div key={p.id} className="bg-white rounded-2xl overflow-hidden shadow-sm" data-testid={`flash-product-${p.id}`}>
              <div className="relative" onClick={() => nav(`/product/${p.id}`)}>
                <img src={p.image} alt={p.name} className="w-full h-36 object-cover" />
                <span className="absolute top-2 left-2 bg-fx text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5"><Zap className="w-3 h-3 fill-white" /> FLASH</span>
                {disc > 0 && <span className="absolute top-2 right-2 bg-n900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">-{disc}%</span>}
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-n800 line-clamp-2 h-10">{p.name}</p>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <span className="font-display text-lg text-fx">{price === 0 ? "FREE" : `₹${price.toLocaleString("en-IN")}`}</span>
                    {p.mrp > price && <span className="text-n500 line-through text-xs ml-1">₹{p.mrp.toLocaleString("en-IN")}</span>}
                  </div>
                  <button onClick={() => { add({ ...p, price }); toast.success("Added to cart"); }} data-testid={`flash-add-${p.id}`} className="w-8 h-8 rounded-full bg-fx text-white flex items-center justify-center text-xl font-bold active:scale-90 transition-transform">+</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!isLoading && !products.length && <p className="text-center text-n500 text-sm py-16">No flash-sale products right now. Check back soon! ⚡</p>}
    </div>
  );
}
