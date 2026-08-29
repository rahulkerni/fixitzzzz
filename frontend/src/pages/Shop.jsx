import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import api from "@/lib/api";
import { Price } from "@/components/common";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

export default function Shop() {
  const nav = useNavigate();
  const { add } = useCart();
  const [cat, setCat] = useState(null);
  const [q, setQ] = useState("");
  const { data: cats = [] } = useQuery({ queryKey: ["cats"], queryFn: () => api.get("/categories").then((r) => r.data) });
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["shop", cat, q], queryFn: () => api.get("/products", { params: { category_id: cat || undefined, q: q || undefined } }).then((r) => r.data),
  });

  return (
    <div className="pb-6" data-testid="shop-page">
      <div className="px-4 pt-4">
        <h1 className="font-display text-2xl text-n900 mb-3">Accessories</h1>
        <div className="flex items-center gap-2 bg-white rounded-full shadow-sm px-4 py-2.5">
          <Search className="w-5 h-5 text-n500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chargers, cases, cables…" data-testid="shop-search"
            className="flex-1 outline-none text-sm bg-transparent" />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 mt-3">
        <button onClick={() => setCat(null)} data-testid="cat-all" className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold ${!cat ? "bg-fx text-white" : "bg-white text-n800 shadow-sm"}`}>All</button>
        {cats.map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)} data-testid={`cat-${c.id}`} className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold ${cat === c.id ? "bg-fx text-white" : "bg-white text-n800 shadow-sm"}`}>{c.name}</button>
        ))}
      </div>

      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="fx-skeleton h-52 rounded-2xl" />)}
        {products.map((p) => {
          const disc = p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;
          return (
            <div key={p.id} className="bg-white rounded-2xl overflow-hidden shadow-sm" data-testid={`shop-product-${p.id}`}>
              <div className="relative" onClick={() => nav(`/product/${p.id}`)}>
                <img src={p.image} alt={p.name} className="w-full h-36 object-cover" />
                {p.tags?.includes("free") && <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">FREE</span>}
                {p.tags?.includes("flash") && <span className="absolute top-2 left-2 bg-fx text-white text-[10px] font-bold px-2 py-0.5 rounded-full">FLASH</span>}
                {disc > 0 && !p.tags?.includes("free") && !p.tags?.includes("flash") && <span className="absolute top-2 left-2 bg-n900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">-{disc}%</span>}
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-n800 line-clamp-2 h-10" onClick={() => nav(`/product/${p.id}`)}>{p.name}</p>
                <div className="mt-2 flex items-center justify-between">
                  <Price price={p.price} mrp={p.mrp} />
                  <button onClick={() => { add(p); toast.success("Added to cart"); }} data-testid={`shop-add-${p.id}`} className="w-8 h-8 rounded-full bg-fx text-white flex items-center justify-center text-xl font-bold active:scale-90 transition-transform">+</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!isLoading && !products.length && <p className="text-center text-n500 text-sm py-10">No products found.</p>}
    </div>
  );
}
