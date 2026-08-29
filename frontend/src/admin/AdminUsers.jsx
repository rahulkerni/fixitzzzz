import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { fmt } from "@/lib/utils2";

export default function AdminUsers() {
  const { data: users = [] } = useQuery({ queryKey: ["admin-users"], queryFn: () => api.get("/admin/users").then((r) => r.data) });
  return (
    <div data-testid="admin-users">
      <h1 className="font-display text-3xl text-n900 mb-4">Users</h1>
      <div className="bg-white border border-n200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-n200 text-left text-xs text-n500 uppercase">
            <th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Phone</th>
            <th className="px-3 py-2">Role</th><th className="px-3 py-2">Wallet</th><th className="px-3 py-2">Referral</th>
          </tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-n200/60" data-testid={`user-${u.id}`}>
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.phone}</td>
                <td className="px-3 py-2"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${u.role === "admin" ? "bg-fx-light text-fx" : "bg-n200/50 text-n800"}`}>{u.role}</span></td>
                <td className="px-3 py-2">{fmt(u.wallet || 0)}</td>
                <td className="px-3 py-2 text-xs">{u.referralCode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
