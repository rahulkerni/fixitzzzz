import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet, Plus, Minus, X, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import api from "@/lib/api";
import { fmt } from "@/lib/utils2";
import { toast } from "sonner";

export default function AdminWallet() {
  const qc = useQueryClient();
  const [sel, setSel] = useState(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");
  const { data: users = [] } = useQuery({ queryKey: ["admin-users"], queryFn: () => api.get("/admin/users").then((r) => r.data) });
  const { data: txns = [] } = useQuery({ queryKey: ["admin-wallet-txns", sel?.id], queryFn: () => api.get("/admin/wallet/txns", { params: { user_id: sel.id } }).then((r) => r.data), enabled: !!sel });

  const adjust = async (sign) => {
    const amt = Number(amount) * sign;
    if (!amt) { toast.error("Enter an amount"); return; }
    try {
      await api.post("/admin/wallet/adjust", { data: { userId: sel.id, amount: amt, note } });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-wallet-txns", sel.id] });
      toast.success(`${amt >= 0 ? "Added" : "Deducted"} ${fmt(Math.abs(amt))}`);
      setAmount(""); setNote("");
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };

  const filtered = users.filter((u) => !q || (u.name || "").toLowerCase().includes(q.toLowerCase()) || (u.email || "").toLowerCase().includes(q.toLowerCase()) || (u.phone || "").includes(q));

  return (
    <div data-testid="admin-wallet">
      <h1 className="font-display text-3xl text-n900 mb-1 flex items-center gap-2"><Wallet className="w-7 h-7 text-fx" /> Wallet Management</h1>
      <p className="text-sm text-n500 mb-4">Add or deduct balance for any user and review their transactions.</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email or phone…" data-testid="wallet-user-search" className="w-full max-w-md mb-4 bg-white border border-n200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 ring-fx" />

      <div className="bg-white border border-n200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-n200 text-left text-xs text-n500 uppercase">
            <th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Phone</th><th className="px-3 py-2">Balance</th><th className="px-3 py-2"></th>
          </tr></thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-n200/60" data-testid={`wallet-user-${u.id}`}>
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.phone}</td>
                <td className="px-3 py-2 font-semibold text-fx">{fmt(u.wallet || 0)}</td>
                <td className="px-3 py-2"><button onClick={() => { setSel(u); setAmount(""); setNote(""); }} data-testid={`wallet-manage-${u.id}`} className="text-xs font-bold text-fx">Manage</button></td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={5} className="px-3 py-8 text-center text-n500">No users</td></tr>}
          </tbody>
        </table>
      </div>

      {sel && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSel(null)}>
          <div className="bg-white rounded-xl w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} data-testid="wallet-dialog">
            <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-3 border-b border-n200">
              <div><h3 className="font-display text-lg">{sel.name}</h3><p className="text-xs text-n500">Balance: <span className="font-bold text-fx">{fmt(sel.wallet || 0)}</span></p></div>
              <button onClick={() => setSel(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (₹)" data-testid="wallet-amount-input" className="w-full bg-n200/30 rounded-lg p-2.5 text-sm outline-none focus:ring-2 ring-fx" />
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" data-testid="wallet-note-input" className="w-full bg-n200/30 rounded-lg p-2.5 text-sm outline-none focus:ring-2 ring-fx" />
              <div className="flex gap-2">
                <button onClick={() => adjust(1)} data-testid="wallet-add-btn" className="flex-1 bg-emerald-500 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform"><Plus className="w-4 h-4" /> Add</button>
                <button onClick={() => adjust(-1)} data-testid="wallet-deduct-btn" className="flex-1 bg-red-500 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform"><Minus className="w-4 h-4" /> Deduct</button>
              </div>
              <div>
                <p className="text-xs font-semibold text-n800 mt-2 mb-1">Transactions</p>
                {!txns.length && <p className="text-center text-n500 text-sm py-4">No transactions</p>}
                <div className="space-y-1.5">
                  {txns.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 text-sm border-b border-n200/50 py-1.5" data-testid={`wallet-txn-${t.id}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${t.type === "credit" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>{t.type === "credit" ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}</div>
                      <div className="flex-1"><p className="text-xs font-semibold">{t.note}</p><p className="text-[10px] text-n500">{new Date(t.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p></div>
                      <span className={`font-semibold text-sm ${t.type === "credit" ? "text-emerald-600" : "text-red-500"}`}>{t.type === "credit" ? "+" : "-"}{fmt(t.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
