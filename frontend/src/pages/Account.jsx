import React from "react";
import { useNavigate } from "react-router-dom";
import { User, Package, LogOut, Shield, Wallet, Gift, Phone, LogIn, Wrench, RefreshCw, Smartphone, MessageCircle, Info, ChevronRight, Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { fmt } from "@/lib/utils2";
import { toast } from "sonner";

export default function Account() {
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api.get("/settings").then((r) => r.data) });
  const { data: wallet } = useQuery({ queryKey: ["wallet"], queryFn: () => api.get("/wallet").then((r) => r.data), enabled: !!user });
  const support = settings?.supportPhone || "9906000000";

  if (!user) return (
    <div className="flex flex-col items-center py-24 px-6" data-testid="account-guest">
      <User className="w-16 h-16 text-n200" />
      <p className="mt-4 font-display text-xl">Welcome to FixitZ</p>
      <p className="text-sm text-n500 mt-1 text-center">Login to book repairs, track orders & more</p>
      <button onClick={() => nav("/login")} data-testid="account-login-btn" className="mt-5 bg-fx text-white font-bold px-8 py-3 rounded-full flex items-center gap-2 active:scale-95 transition-transform"><LogIn className="w-4 h-4" /> Login / Sign Up</button>
    </div>
  );

  const groups = [
    {
      title: "My Activity",
      rows: [
        { icon: Package, label: "My Orders", sub: "All purchases", onClick: () => nav("/orders"), tid: "acc-orders" },
        { icon: Wrench, label: "My Repairs", sub: "Track repair bookings", onClick: () => nav("/orders"), tid: "acc-repairs" },
        { icon: RefreshCw, label: "Sell Requests", sub: "Phone pickups", onClick: () => nav("/orders"), tid: "acc-sells" },
        { icon: Smartphone, label: "Refurbished Orders", sub: "Phones you bought", onClick: () => nav("/orders"), tid: "acc-buys" },
      ],
    },
    {
      title: "Rewards",
      rows: [
        { icon: Wallet, label: "Wallet", sub: fmt(wallet?.balance ?? user.wallet ?? 0), onClick: () => nav("/wallet"), tid: "acc-wallet" },
        { icon: Gift, label: "Refer & Earn ₹100", sub: `Code: ${user.referralCode}`, onClick: () => nav("/wallet"), tid: "acc-referral" },
        { icon: Bell, label: "Notifications", sub: "Order & offer alerts", onClick: () => toast.info("You're all caught up!"), tid: "acc-notifications" },
      ],
    },
    {
      title: "Help & Info",
      rows: [
        { icon: MessageCircle, label: "WhatsApp Support", sub: support, onClick: () => window.open(`https://wa.me/91${support}`, "_blank"), tid: "acc-whatsapp" },
        { icon: Phone, label: "Call Us", sub: support, onClick: () => (window.location.href = `tel:${support}`), tid: "acc-call" },
        { icon: Info, label: "About FixitZ", sub: "Jammu's doorstep repair app", onClick: () => toast.info("FixitZ — 30-min doorstep repair, Jammu"), tid: "acc-about" },
      ],
    },
  ];

  return (
    <div className="pb-6" data-testid="account-page">
      <div className="px-4 pt-6">
        <div className="bg-n900 rounded-3xl p-5 text-white flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-fx flex items-center justify-center font-display text-2xl">{user.name?.[0]?.toUpperCase()}</div>
          <div className="flex-1">
            <p className="font-display text-xl">{user.name}</p>
            <p className="text-xs text-white/60">{user.email}</p>
            <p className="text-xs text-white/60">+91 {user.phone}</p>
          </div>
          <button onClick={() => nav("/wallet")} className="text-right"><span className="block text-[10px] text-white/50">Wallet</span><span className="font-display text-fx text-lg">{fmt(wallet?.balance ?? user.wallet ?? 0)}</span></button>
        </div>
      </div>

      {user.role === "admin" && (
        <div className="px-4 mt-4">
          <button onClick={() => nav("/admin")} data-testid="acc-admin-btn" className="w-full bg-fx-light text-fx font-bold py-3 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"><Shield className="w-4 h-4" /> Open Admin Panel</button>
        </div>
      )}

      {groups.map((g) => (
        <div key={g.title} className="px-4 mt-5">
          <p className="text-xs font-bold uppercase text-n500 mb-2">{g.title}</p>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-n200/60">
            {g.rows.map((r) => (
              <button key={r.label} onClick={r.onClick} data-testid={r.tid} className="w-full p-4 flex items-center gap-3 active:bg-n200/20 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-fx-light flex items-center justify-center"><r.icon className="w-4 h-4 text-fx" /></div>
                <div className="flex-1 text-left"><p className="text-sm font-semibold text-n800">{r.label}</p><p className="text-[11px] text-n500">{r.sub}</p></div>
                <ChevronRight className="w-4 h-4 text-n500" />
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="px-4 mt-5">
        <button onClick={() => { logout(); nav("/"); }} data-testid="acc-logout" className="w-full bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 text-red-500 active:scale-[0.98] transition-transform">
          <LogOut className="w-5 h-5" /><span className="text-sm font-semibold">Logout</span>
        </button>
      </div>
    </div>
  );
}
