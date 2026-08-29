import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, ShoppingCart, IndianRupee, Package, Clock, TrendingUp } from "lucide-react";
import api from "@/lib/api";
import { fmt } from "@/lib/utils2";

const STAT = [
  { key: "revenue", label: "Revenue", icon: IndianRupee, money: true },
  { key: "orders", label: "Orders", icon: ShoppingCart },
  { key: "users", label: "Users", icon: Users },
  { key: "products", label: "Products", icon: Package },
  { key: "pending", label: "Pending", icon: Clock },
  { key: "repair_orders", label: "Repairs", icon: TrendingUp },
];

export default function AdminDashboard() {
  const { data: s = {} } = useQuery({ queryKey: ["admin-stats"], queryFn: () => api.get("/admin/stats").then((r) => r.data), refetchInterval: 8000 });

  return (
    <div data-testid="admin-dashboard">
      <h1 className="font-display text-3xl text-n900 mb-1">Dashboard</h1>
      <p className="text-n500 text-sm mb-6">Live overview · updates every 8s</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {STAT.map((st) => (
          <div key={st.key} className="bg-white border border-n200 rounded-lg p-4" data-testid={`stat-${st.key}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-n500 uppercase">{st.label}</span>
              <st.icon className="w-4 h-4 text-fx" />
            </div>
            <p className="font-display text-2xl mt-2">{st.money ? fmt(s[st.key] || 0) : (s[st.key] ?? 0)}</p>
          </div>
        ))}
      </div>

      <h2 className="font-display text-xl mt-8 mb-3">Recent Orders</h2>
      <div className="bg-white border border-n200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-n200 text-left text-xs text-n500 uppercase">
            <th className="px-3 py-2">Customer</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Status</th>
          </tr></thead>
          <tbody>
            {(s.recent_orders || []).map((o) => (
              <tr key={o.id} className="border-b border-n200/60">
                <td className="px-3 py-2">{o.userName}</td>
                <td className="px-3 py-2 capitalize">{o.type}</td>
                <td className="px-3 py-2">{fmt(o.amount)}</td>
                <td className="px-3 py-2 capitalize">{o.status}</td>
              </tr>
            ))}
            {!(s.recent_orders || []).length && <tr><td colSpan={4} className="px-3 py-6 text-center text-n500">No orders yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
