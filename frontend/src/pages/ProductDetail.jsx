import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ShieldCheck, Truck } from "lucide-react";
import api from "@/lib/api";
import { Price } from "@/components/common";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

export default function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { add } = useCart();
  const { data: p, isLoading } = useQuery({ queryKey: ["product", id], queryFn: () => api.get(`/products/${id}`).then((r) => r.data) });

  if (isLoading) return <div className="p-4"><div className="fx-skeleton h-72 rounded-3xl" /></div>;
  if (!p) return <p className="text-center text-n500 py-10">Product not found.</p>;

  return (
    <div className="pb-24" data-testid="product-detail">
      <div className="relative">
        <img src={p.image} alt={p.name} className="w-full h-80 object-cover" />
        <button onClick={() => nav(-1)} className="absolute top-4 left-4 p-2 rounded-full bg-white/90 shadow active:scale-90 transition-transform"><ChevronLeft className="w-5 h-5" /></button>
      </div>
      <div className="px-4 -mt-6 relative">
        <div className="bg-white rounded-3xl shadow-sm p-5">
          <h1 className="font-display text-2xl text-n900">{p.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <span className="font-display text-2xl text-fx">{p.price === 0 ? "FREE" : `₹${p.price.toLocaleString("en-IN")}`}</span>
            {p.mrp > p.price && <span className="text-n500 line-through">₹{p.mrp.toLocaleString("en-IN")}</span>}
          </div>
          <p className="text-sm text-n800 mt-3">{p.description}</p>
          <div className="flex gap-4 mt-4 text-xs text-n500">
            <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-emerald-600" /> 6-mo warranty</span>
            <span className="flex items-center gap-1"><Truck className="w-4 h-4 text-fx" /> Fast delivery</span>
          </div>
        </div>
      </div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] p-4 bg-white border-t border-n200 z-30">
        <button onClick={() => { add(p); toast.success("Added to cart"); nav("/cart"); }} data-testid="pd-add-cart"
          className="w-full bg-fx text-white font-bold py-4 rounded-full active:scale-95 transition-transform">Add to Cart</button>
      </div>
    </div>
  );
}
