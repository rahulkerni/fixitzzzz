import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Volume2, VolumeX } from "lucide-react";
import api from "@/lib/api";
import { fmt } from "@/lib/utils2";
import { playAlert } from "@/lib/sounds";
import { toast } from "sonner";

const STATUSES = ["pending", "confirmed", "in-progress", "completed", "cancelled"];

export default function AdminOrders() {
  const qc = useQueryClient();
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem("fx_admin_sound") !== "0");
  const seen = useRef(null);
  const { data: orders = [] } = useQuery({ queryKey: ["admin-orders"], queryFn: () => api.get("/admin/orders").then((r) => r.data), refetchInterval: 8000 });

  useEffect(() => {
    const ids = new Set(orders.map((o) => o.id));
    if (seen.current === null) { seen.current = ids; return; }
    const fresh = orders.filter((o) => !seen.current.has(o.id));
    if (fresh.length) {
      if (soundOn) playAlert();
      toast.success(`🔔 New order from ${fresh[0].userName || "customer"}`);
    }
    seen.current = ids;
  }, [orders, soundOn]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem("fx_admin_sound", next ? "1" : "0");
    if (next) playAlert();
  };

  const update = useMutation({
    mutationFn: ({ id, status }) => api.put(`/admin/orders/${id}/status`, { data: { status } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-orders"] }); toast.success("Status updated"); },
  });

  return (
    <div data-testid="admin-orders">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-3xl text-n900">Orders</h1>
        <button onClick={toggleSound} data-testid="admin-sound-toggle" className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full ${soundOn ? "bg-fx-light text-fx" : "bg-n200/50 text-n500"}`}>
          {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />} {soundOn ? "Sound On" : "Sound Off"}
        </button>
      </div>
      <p className="text-sm text-n500 mb-4">All repair, product, sell & refurbished orders. Update status live. New orders play an alert.</p>
      <div className="bg-white border border-n200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-n200 text-left text-xs text-n500 uppercase">
            <th className="px-3 py-2">Customer</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Items</th>
            <th className="px-3 py-2">Amount</th><th className="px-3 py-2">Address</th><th className="px-3 py-2">Status</th>
          </tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-n200/60 align-top" data-testid={`admin-order-${o.id}`}>
                <td className="px-3 py-2">{o.userName}<div className="text-[11px] text-n500">{o.userPhone}</div></td>
                <td className="px-3 py-2 capitalize">{o.type}</td>
                <td className="px-3 py-2 max-w-[180px] text-xs">{o.items?.map((i) => i.name).join(", ")}</td>
                <td className="px-3 py-2 font-semibold">{fmt(o.amount)}</td>
                <td className="px-3 py-2 max-w-[140px] text-xs text-n500 truncate">{o.address?.text || "—"}</td>
                <td className="px-3 py-2">
                  <select value={o.status} onChange={(e) => update.mutate({ id: o.id, status: e.target.value })} data-testid={`order-status-${o.id}`} className="bg-n200/30 rounded-lg px-2 py-1.5 text-xs font-semibold capitalize outline-none">
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {!orders.length && <tr><td colSpan={6} className="px-3 py-8 text-center text-n500">No orders yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
