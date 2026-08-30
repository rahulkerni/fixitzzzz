import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, Check, X } from "lucide-react";
import api from "@/lib/api";
import { fmt } from "@/lib/utils2";
import { toast } from "sonner";

export default function AdminFreeProducts() {
  const qc = useQueryClient();
  const { data: products = [] } = useQuery({ queryKey: ["admin", "products"], queryFn: () => api.get("/admin/products").then((r) => r.data) });
  const { data: orders = [] } = useQuery({ queryKey: ["admin-orders"], queryFn: () => api.get("/admin/orders").then((r) => r.data), refetchInterval: 8000 });

  const freeProducts = products.filter((p) => Number(p.price) === 0 || p.is_free);
  const paidProducts = products.filter((p) => Number(p.price) > 0 && !p.is_free);
  const pending = orders.filter((o) => o.freeClaim && o.status === "awaiting_approval");

  const setFree = async (p, free) => {
    const price = free ? 0 : (p.mrp || 99);
    await api.put(`/admin/products/${p.id}`, { data: { ...p, price, is_free: free } });
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
    toast.success(free ? "Marked as FREE" : "Removed from free");
  };

  const decide = async (o, status) => {
    await api.put(`/admin/orders/${o.id}/status`, { data: { status } });
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
    toast.success(status === "confirmed" ? "Approved for dispatch" : "Rejected");
  };

  return (
    <div data-testid="admin-free-products">
      <h1 className="font-display text-3xl text-n900 mb-1 flex items-center gap-2"><Gift className="w-7 h-7 text-fx" /> Free Product Management</h1>
      <p className="text-sm text-n500 mb-5">Mark products as free (₹0), and approve free-product claims before dispatch. Limit: one free product per account.</p>

      <div className="bg-white border border-n200 rounded-xl p-4 mb-6">
        <h2 className="font-display text-lg mb-3">Claims Awaiting Approval ({pending.length})</h2>
        {!pending.length && <p className="text-n500 text-sm">No pending free-product claims.</p>}
        <div className="space-y-2">
          {pending.map((o) => (
            <div key={o.id} className="flex items-center gap-3 border-b border-n200/60 py-2" data-testid={`free-claim-${o.id}`}>
              <div className="flex-1">
                <p className="font-semibold text-sm">{o.userName} · {o.userPhone}</p>
                <p className="text-xs text-n500">{(o.items || []).map((i) => i.name).join(", ")} · pays delivery {fmt((o.details || {}).delivery || 0)}</p>
              </div>
              <button onClick={() => decide(o, "confirmed")} data-testid={`free-approve-${o.id}`} className="bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Approve</button>
              <button onClick={() => decide(o, "cancelled")} data-testid={`free-reject-${o.id}`} className="bg-red-500 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1"><X className="w-3.5 h-3.5" /> Reject</button>
            </div>
          ))}
        </div>
      </div>

      <h2 className="font-display text-lg mb-2">Free Products ({freeProducts.length})</h2>
      <div className="bg-white border border-n200 rounded-xl overflow-hidden mb-6">
        {!freeProducts.length && <p className="text-n500 text-sm p-4">No free products yet. Mark one below.</p>}
        {freeProducts.map((p) => (
          <div key={p.id} className="flex items-center gap-3 border-b border-n200/60 p-3" data-testid={`freeprod-${p.id}`}>
            <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
            <span className="flex-1 text-sm font-semibold">{p.name}</span>
            <span className="text-fx font-bold text-sm mr-2">FREE</span>
            <button onClick={() => setFree(p, false)} data-testid={`unfree-${p.id}`} className="bg-n200/50 text-n800 text-xs font-bold px-3 py-1.5 rounded-lg">Unset</button>
          </div>
        ))}
      </div>

      <h2 className="font-display text-lg mb-2">Make a Product Free</h2>
      <div className="bg-white border border-n200 rounded-xl overflow-hidden">
        {paidProducts.map((p) => (
          <div key={p.id} className="flex items-center gap-3 border-b border-n200/60 p-3">
            <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
            <span className="flex-1 text-sm font-semibold">{p.name}</span>
            <span className="text-n500 text-sm mr-2">{fmt(p.price)}</span>
            <button onClick={() => setFree(p, true)} data-testid={`makefree-${p.id}`} className="bg-fx text-white text-xs font-bold px-3 py-1.5 rounded-lg">Make Free</button>
          </div>
        ))}
      </div>
    </div>
  );
}
