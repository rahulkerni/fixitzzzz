import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Package, Wrench, ShoppingBag, RefreshCw, Smartphone } from "lucide-react";
import api from "@/lib/api";
import { fmt } from "@/lib/utils2";

const TYPE_META = {
  repair: { icon: Wrench, label: "Repair", clr: "text-fx bg-fx-light" },
  product: { icon: ShoppingBag, label: "Order", clr: "text-blue-600 bg-blue-50" },
  sell: { icon: RefreshCw, label: "Sell", clr: "text-emerald-600 bg-emerald-50" },
  buy: { icon: Smartphone, label: "Refurbished", clr: "text-purple-600 bg-purple-50" },
};
const STATUS_CLR = {
  pending: "bg-amber-100 text-amber-700", confirmed: "bg-blue-100 text-blue-700",
  "in-progress": "bg-purple-100 text-purple-700", completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function Orders() {
  const nav = useNavigate();
  const { data: orders = [], isLoading } = useQuery({ queryKey: ["myorders"], queryFn: () => api.get("/orders").then((r) => r.data) });

  return (
    <div className="pb-6" data-testid="orders-page">
      <h1 className="font-display text-2xl text-n900 px-4 pt-4">My Orders</h1>
      {isLoading && <div className="px-4 mt-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="fx-skeleton h-24 rounded-2xl" />)}</div>}
      {!isLoading && !orders.length && (
        <div className="flex flex-col items-center py-24">
          <Package className="w-16 h-16 text-n200" />
          <p className="mt-3 text-n500">No orders yet</p>
          <button onClick={() => nav("/")} className="mt-4 bg-fx text-white font-bold px-6 py-3 rounded-full">Explore FixitZ</button>
        </div>
      )}
      <div className="px-4 mt-4 space-y-3">
        {orders.map((o) => {
          const m = TYPE_META[o.type] || TYPE_META.product;
          return (
            <div key={o.id} className="bg-white rounded-2xl shadow-sm p-4" data-testid={`order-${o.id}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${m.clr}`}><m.icon className="w-4 h-4" /></div>
                  <div>
                    <p className="text-sm font-semibold">{m.label}</p>
                    <p className="text-[11px] text-n500">{new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${STATUS_CLR[o.status]}`}>{o.status}</span>
              </div>
              <div className="mt-2 text-xs text-n800">{o.items?.map((i) => i.name).join(", ")}</div>
              <div className="mt-1 font-display text-fx">{fmt(o.amount)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
