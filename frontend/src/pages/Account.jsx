import React from "react";
import { useNavigate } from "react-router-dom";
import { User, Package, LogOut, Shield, Wallet, Gift, Phone, LogIn } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { fmt } from "@/lib/utils2";

export default function Account() {
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api.get("/settings").then((r) => r.data) });

  if (!user) return (
    <div className="flex flex-col items-center py-24 px-6" data-testid="account-guest">
      <User className="w-16 h-16 text-n200" />
      <p className="mt-4 font-display text-xl">Welcome to FixitZ</p>
      <p className="text-sm text-n500 mt-1 text-center">Login to book repairs, track orders & more</p>
      <button onClick={() => nav("/login")} data-testid="account-login-btn" className="mt-5 bg-fx text-white font-bold px-8 py-3 rounded-full flex items-center gap-2 active:scale-95 transition-transform"><LogIn className="w-4 h-4" /> Login / Sign Up</button>
    </div>
  );

  const rows = [
    { icon: Package, label: "My Orders", onClick: () => nav("/orders"), testid: "acc-orders" },
    { icon: Wallet, label: `Wallet — ${fmt(user.wallet || 0)}`, onClick: () => {}, testid: "acc-wallet" },
    { icon: Gift, label: `Refer & Earn — ${user.referralCode}`, onClick: () => {}, testid: "acc-referral" },
    { icon: Phone, label: `Support — ${settings?.supportPhone || ""}`, onClick: () => {}, testid: "acc-support" },
  ];

  return (
    <div className="pb-6" data-testid="account-page">
      <div className="px-4 pt-6">
        <div className="bg-n900 rounded-3xl p-5 text-white flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-fx flex items-center justify-center font-display text-2xl">{user.name?.[0]?.toUpperCase()}</div>
          <div>
            <p className="font-display text-xl">{user.name}</p>
            <p className="text-xs text-white/60">{user.email}</p>
          </div>
        </div>
      </div>

      {user.role === "admin" && (
        <div className="px-4 mt-4">
          <button onClick={() => nav("/admin")} data-testid="acc-admin-btn" className="w-full bg-fx-light text-fx font-bold py-3 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"><Shield className="w-4 h-4" /> Open Admin Panel</button>
        </div>
      )}

      <div className="px-4 mt-4 space-y-2">
        {rows.map((r) => (
          <button key={r.label} onClick={r.onClick} data-testid={r.testid} className="w-full bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 active:scale-[0.98] transition-transform">
            <r.icon className="w-5 h-5 text-fx" />
            <span className="text-sm font-semibold text-n800">{r.label}</span>
          </button>
        ))}
        <button onClick={() => { logout(); nav("/"); }} data-testid="acc-logout" className="w-full bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 text-red-500 active:scale-[0.98] transition-transform">
          <LogOut className="w-5 h-5" /><span className="text-sm font-semibold">Logout</span>
        </button>
      </div>
    </div>
  );
}
