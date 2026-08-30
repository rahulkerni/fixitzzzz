import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Wrench, Search as SearchIcon } from "lucide-react";
import api from "@/lib/api";
import { Price } from "@/components/common";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

export default function SearchResults() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const nav = useNavigate();
  const { add } = useCart();
  const { data, isLoading } = useQuery({ queryKey: ["search", q], queryFn: () => api.get("/search", { params: { q } }).then((r) => r.data), enabled: !!q });
  const products = data?.products || [];
  const repairModels = data?.repairModels || [];

  return (
    <div className="pb-24" data-testid="search-page">
      <div className="px-4 pt-4 flex items-center gap-3">
        <button onClick={() => nav(-1)} className="p-1.5 rounded-full bg-white shadow-sm active:scale-90 transition-transform" data-testid="search-back"><ChevronLeft className="w-5 h-5" /></button>
        <h1 className="font-display text-xl text-n900 flex items-center gap-2"><SearchIcon className="w-5 h-5 text-fx" /> "{q}"</h1>
      </div>

      {isLoading && <div className="px-4 mt-6 grid grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="fx-skeleton h-44 rounded-2xl" />)}</div>}

      {!isLoading && (
        <>
          <div className="px-4 mt-5">
            <h2 className="font-display text-lg text-n900 mb-2">Products ({products.length})</h2>
            {!products.length && <p className="text-n500 text-sm">No matching products.</p>}
            <div className="grid grid-cols-2 gap-3">
              {products.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl overflow-hidden shadow-sm" data-testid={`search-product-${p.id}`}>
                  <img src={p.image} alt={p.name} className="w-full h-32 object-cover" onClick={() => nav(`/product/${p.id}`)} />
                  <div className="p-2.5">
                    <p className="text-xs font-semibold text-n800 line-clamp-2 h-8" onClick={() => nav(`/product/${p.id}`)}>{p.name}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <Price price={p.price} mrp={p.mrp} />
                      <button onClick={() => { add(p); toast.success("Added!"); }} className="w-7 h-7 rounded-full bg-fx text-white flex items-center justify-center text-lg font-bold active:scale-90 transition-transform">+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-4 mt-6">
            <h2 className="font-display text-lg text-n900 mb-2 flex items-center gap-1"><Wrench className="w-4 h-4 text-fx" /> Repair Models ({repairModels.length})</h2>
            {!repairModels.length && <p className="text-n500 text-sm">No matching repair models.</p>}
            <div className="space-y-2">
              {repairModels.map((m) => (
                <button key={m.id} onClick={() => nav("/repair")} data-testid={`search-repair-${m.id}`}
                  className="w-full bg-white rounded-2xl shadow-sm p-3 flex items-center gap-3 active:scale-[0.98] transition-transform text-left">
                  <img src={m.image} alt="" className="w-11 h-11 rounded-xl object-cover" onError={(e) => (e.target.style.visibility = "hidden")} />
                  <div className="flex-1"><p className="font-semibold text-n900 text-sm">{m.name}</p><p className="text-xs text-n500">{m.brand} · Book a repair</p></div>
                  <span className="text-fx text-xs font-bold">Repair →</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
