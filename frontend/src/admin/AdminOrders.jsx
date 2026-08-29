import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { fmt } from "@/lib/utils2";
import { toast } from "sonner";

const STATUSES = ["pending", "confirmed", "in-progress", "completed", "cancelled"];

export default function AdminOrders() {
  const qc = useQueryClient();
  const { data: orders = [] } = useQuery({ queryKey: ["admin-orders"], queryFn: () => api.get("/admin/orders").then((r) => r.data), refetchInterval: 8000 });
  const update = useMutation({
    mutationFn: ({ id, status }) => api.put(`/admin/orders/${id}/status`, { data: { status } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-orders"] }); toast.success("Status updated"); },
  });

  return (
    <div data-testid="admin-orders">
      <h1 className="font-display text-3xl text-n900 mb-1">Orders</h1>
      <p className="text-sm text-n500 mb-4">All repair, product, sell & refurbished orders. Update status live.</p>
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
