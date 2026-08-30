import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gift, ChevronDown, Users } from "lucide-react";
import api from "@/lib/api";
import { fmt } from "@/lib/utils2";

export default function AdminReferrals() {
  const [open, setOpen] = useState(null);
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["admin-referrals"], queryFn: () => api.get("/admin/referrals").then((r) => r.data) });

  const totalRefs = rows.reduce((s, r) => s + r.count, 0);
  const totalReward = rows.reduce((s, r) => s + (r.reward || 0), 0);

  return (
    <div data-testid="admin-referrals">
      <h1 className="font-display text-3xl text-n900 mb-1 flex items-center gap-2"><Gift className="w-7 h-7 text-fx" /> Referral Tracking</h1>
      <p className="text-sm text-n500 mb-4">See who referred whom and the rewards earned.</p>

      <div className="grid grid-cols-3 gap-3 mb-5 max-w-lg">
        <div className="bg-white border border-n200 rounded-xl p-4"><p className="text-xs text-n500">Referrers</p><p className="font-display text-2xl text-n900">{rows.length}</p></div>
        <div className="bg-white border border-n200 rounded-xl p-4"><p className="text-xs text-n500">Referred Users</p><p className="font-display text-2xl text-n900">{totalRefs}</p></div>
        <div className="bg-white border border-n200 rounded-xl p-4"><p className="text-xs text-n500">Rewards Paid</p><p className="font-display text-2xl text-fx">{fmt(totalReward)}</p></div>
      </div>

      <div className="bg-white border border-n200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-n200 text-left text-xs text-n500 uppercase">
            <th className="px-3 py-2">Referrer</th><th className="px-3 py-2">Code</th><th className="px-3 py-2">Referred</th><th className="px-3 py-2">Reward</th><th className="px-3 py-2"></th>
          </tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="px-3 py-8 text-center text-n500">Loading…</td></tr>}
            {!isLoading && !rows.length && <tr><td colSpan={5} className="px-3 py-8 text-center text-n500">No referrals yet</td></tr>}
            {rows.map((r) => (
              <React.Fragment key={r.id}>
                <tr className="border-b border-n200/60 cursor-pointer hover:bg-n200/20" onClick={() => setOpen(open === r.id ? null : r.id)} data-testid={`referral-row-${r.id}`}>
                  <td className="px-3 py-2">{r.name}<div className="text-[11px] text-n500">{r.email}</div></td>
                  <td className="px-3 py-2"><span className="font-mono font-bold text-fx">{r.referralCode}</span></td>
                  <td className="px-3 py-2"><span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5 text-n500" />{r.count}</span></td>
                  <td className="px-3 py-2 font-semibold text-emerald-600">{fmt(r.reward)}</td>
                  <td className="px-3 py-2"><ChevronDown className={`w-4 h-4 text-n500 transition-transform ${open === r.id ? "rotate-180" : ""}`} /></td>
                </tr>
                {open === r.id && (
                  <tr className="bg-n200/10" data-testid={`referral-detail-${r.id}`}>
                    <td colSpan={5} className="px-6 py-3">
                      <p className="text-xs font-semibold text-n800 mb-1">Referred users</p>
                      <div className="space-y-1">
                        {r.referred.map((u, i) => (
                          <div key={i} className="flex items-center justify-between text-xs text-n700 border-b border-n200/40 py-1">
                            <span>{u.name} <span className="text-n500">· {u.email}</span></span>
                            <span className="text-n500">{u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
