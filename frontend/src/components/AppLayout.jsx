import React from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { Home, Wrench, ShoppingBag, RefreshCw, User, ShoppingCart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

const TABS = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/shop", icon: ShoppingBag, label: "Shop" },
  { to: "/repair", icon: Wrench, label: "Repair" },
  { to: "/sell", icon: RefreshCw, label: "Sell" },
  { to: "/account", icon: User, label: "Account" },
];

export default function AppLayout() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { count } = useCart();
  const { user } = useAuth();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api.get("/settings").then((r) => r.data) });

  return (
    <div className="fx-shell pb-20">
      <header className="fx-glass sticky top-0 z-40 px-4 py-3 flex items-center justify-between" data-testid="app-header">
        <Link to="/" className="flex items-center gap-2" data-testid="brand-logo">
          <div className="w-9 h-9 rounded-xl bg-fx flex items-center justify-center text-white font-display text-lg">F</div>
          <div className="leading-tight">
            <div className="font-display text-lg text-n900">{settings?.appName || "FixitZ"}</div>
            <div className="text-[10px] text-n500 font-medium -mt-0.5">{settings?.tagline || "Doorstep Repair"}</div>
          </div>
        </Link>
        <button onClick={() => nav("/cart")} className="relative p-2 active:scale-90 transition-transform" data-testid="cart-button">
          <ShoppingCart className="w-6 h-6 text-n900" strokeWidth={2} />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-fx text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1" data-testid="cart-count">{count}</span>
          )}
        </button>
      </header>

      <main className="min-h-[calc(100vh-140px)]"><Outlet /></main>

      <nav className="fx-glass fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 grid grid-cols-5 px-2 pt-2 pb-3 border-t border-black/5" data-testid="bottom-nav">
        {TABS.map((t) => {
          const active = t.to === "/" ? pathname === "/" : pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <button key={t.to} onClick={() => nav(t.to)} data-testid={`nav-${t.label.toLowerCase()}`}
              className="flex flex-col items-center gap-1 py-1 active:scale-90 transition-transform">
              <Icon className={active ? "w-6 h-6 text-fx" : "w-6 h-6 text-n500"} strokeWidth={active ? 2.5 : 2} fill={active ? "#FFF0EB" : "none"} />
              <span className={`text-[10px] font-semibold ${active ? "text-fx" : "text-n500"}`}>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
