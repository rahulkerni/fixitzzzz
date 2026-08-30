import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, ArrowDownLeft, ArrowUpRight, Gift, Copy, Wallet as WalletIcon } from "lucide-react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { fmt, payWithRazorpay } from "@/lib/utils2";
import { CountUp } from "@/components/common";
import { toast } from "sonner";

const PRESETS = [100, 250, 500, 1000, 2000];

export default function Wallet() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [amount, setAmount] = useState(500);
  const { data, isLoading } = useQuery({ queryKey: ["wallet"], queryFn: () => api.get("/wallet").then((r) => r.data), enabled: !!user, refetchInterval: 5000 });

  if (!user) { nav("/login"); return null; }

  const addMoney = () => {
    if (amount < 10) { toast.error("Minimum ₹10"); return; }
    payWithRazorpay({
      amount, user,
      onSuccess: async (resp) => {
        await api.post("/wallet/add", { amount, note: "Added via Razorpay", payment: { id: resp.razorpay_payment_id } });
        qc.invalidateQueries({ queryKey: ["wallet"] });
        toast.success(`₹${amount} added to wallet`);
      },
      onFail: () => toast.error("Payment cancelled"),
    });
  };

  const copyCode = () => { navigator.clipboard.writeText(user.referralCode); toast.success("Referral code copied!"); };

  return (
    <div className="pb-24" data-testid="wallet-page">
      <div className="px-4 pt-4 flex items-center gap-3">
        <button onClick={() => nav(-1)} className="p-1.5 rounded-full bg-white shadow-sm active:scale-90 transition-transform"><ChevronLeft className="w-5 h-5" /></button>
        <h1 className="font-display text-2xl text-n900">Wallet</h1>
      </div>

      <div className="px-4 mt-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-gradient-to-br from-n900 to-[#2A2826] p-6 shadow-lg relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-fx/20 blur-3xl" />
          <p className="text-white/60 text-xs flex items-center gap-1.5"><WalletIcon className="w-4 h-4 text-fx" /> Available Balance</p>
          <div className="font-display text-4xl text-white mt-2" data-testid="wallet-page-balance"><CountUp value={data?.balance ?? 0} /></div>
        </motion.div>
      </div>

      <div className="px-4 mt-5">
        <p className="font-display text-lg text-n900 mb-3">Add Money</p>
        <div className="flex gap-2 flex-wrap mb-3">
          {PRESETS.map((v) => (
            <button key={v} onClick={() => setAmount(v)} data-testid={`preset-${v}`} className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${amount === v ? "bg-fx text-white" : "bg-white shadow-sm text-n800"}`}>₹{v}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white rounded-2xl shadow-sm px-4 py-3">
          <span className="font-display text-xl text-n900">₹</span>
          <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} data-testid="wallet-amount" className="flex-1 outline-none text-lg font-bold bg-transparent" />
        </div>
        <button onClick={addMoney} data-testid="wallet-addmoney-btn" className="w-full mt-3 bg-fx text-white font-bold py-4 rounded-full active:scale-95 transition-transform flex items-center justify-center gap-2"><Plus className="w-5 h-5" /> Add {fmt(amount)}</button>
      </div>

      <div className="px-4 mt-5">
        <div className="rounded-3xl bg-fx-light p-4 flex items-center gap-3 border border-fx/20">
          <Gift className="w-6 h-6 text-fx" />
          <div className="flex-1"><p className="text-sm font-semibold text-n900">Invite & Earn ₹100</p><p className="text-xs text-n500">Code: <span className="font-bold text-fx">{user.referralCode}</span></p></div>
          <button onClick={copyCode} data-testid="copy-referral" className="bg-white p-2 rounded-full shadow-sm active:scale-90 transition-transform"><Copy className="w-4 h-4 text-fx" /></button>
        </div>
      </div>

      <div className="px-4 mt-6">
        <p className="font-display text-lg text-n900 mb-3">Transactions</p>
        {isLoading && <div className="fx-skeleton h-20 rounded-2xl" />}
        {!isLoading && !(data?.transactions || []).length && <p className="text-center text-n500 text-sm py-8">No transactions yet</p>}
        <div className="space-y-2">
          {(data?.transactions || []).map((t) => (
            <div key={t.id} className="bg-white rounded-2xl shadow-sm p-3 flex items-center gap-3" data-testid={`txn-${t.id}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${t.type === "credit" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                {t.type === "credit" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
              </div>
              <div className="flex-1"><p className="text-sm font-semibold">{t.note}</p><p className="text-[11px] text-n500">{new Date(t.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p></div>
              <span className={`font-display ${t.type === "credit" ? "text-emerald-600" : "text-red-500"}`}>{t.type === "credit" ? "+" : "-"}{fmt(t.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
