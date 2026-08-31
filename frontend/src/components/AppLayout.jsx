import React, { useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { Home, Wrench, ShoppingBag, RefreshCw, User, ShoppingCart, Search, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useCart } from "@/context/CartContext";
import ChatWidget from "@/components/ChatWidget";

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
  const [q, setQ] = useState("");
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api.get("/settings").then((r) => r.data) });

  const submitSearch = (e) => {
    e.preventDefault();
    const term = q.trim();
    nav(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <div className="fx-shell pb-20">
      {/* Highlighted FixitZ top section */}
      <header className="sticky top-0 z-40 bg-white px-4 pt-3 pb-3 shadow-md border-b border-n200" data-testid="app-header">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="brand-logo">
            <div className="w-10 h-10 relative">
              <div className="w-10 h-10 rounded-xl bg-fx flex items-center justify-center text-white font-display text-xl shadow-md shadow-orange-500/40">F</div>
              {settings?.logo && <img src={settings.logo} alt="logo" onError={(e) => e.target.remove()} className="absolute inset-0 w-10 h-10 rounded-xl object-cover" />}
            </div>
            <div className="leading-tight">
              <div className="font-display text-xl text-fx" style={{ textShadow: "0 2px 8px rgba(238,77,45,0.30)" }}>{settings?.appName || "FixitZ"}</div>
              <div className="text-[10px] font-bold -mt-0.5 flex items-center gap-1 text-fx" style={{ textShadow: "0 1px 3px rgba(238,77,45,0.22)" }}><MapPin className="w-3 h-3" />{settings?.city || "Jammu"} · {settings?.tagline || "30-Min Doorstep Repair"}</div>
            </div>
          </Link>
          <button onClick={() => nav("/cart")} className="relative p-2.5 bg-fx-light rounded-full ring-1 ring-fx/30 active:scale-90 transition-transform" data-testid="cart-button">
            <ShoppingCart className="w-6 h-6 text-fx" strokeWidth={2.4} />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-fx text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 shadow" data-testid="cart-count">{count}</span>
            )}
          </button>
        </div>
        <form onSubmit={submitSearch} className="mt-3 flex items-center gap-2 bg-n200/50 rounded-full px-4 py-2.5">
          <Search className="w-5 h-5 text-fx" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search phones, repairs, accessories…" data-testid="header-search"
            className="flex-1 outline-none text-sm bg-transparent text-n900" />
          <button type="submit" data-testid="header-search-btn" className="bg-fx text-white text-xs font-bold px-3 py-1.5 rounded-full">Search</button>
        </form>
      </header>

      <main className="min-h-[calc(100vh-160px)]"><Outlet /></main>

      {settings?.features?.chat !== false && <ChatWidget />}

      <nav className="fx-glass fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 grid grid-cols-5 px-2 pt-2 pb-3 border-t border-black/5" data-testid="bottom-nav">
        {TABS.map((t) => {
          const active = t.to === "/" ? pathname === "/" : pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <button key={t.to} onClick={() => nav(t.to)} data-testid={`nav-${t.label.toLowerCase()}`}
              className="flex flex-col items-center gap-1 py-1 active:scale-90 transition-transform">
              <Icon className={active ? "w-6 h-6 text-fx" : "w-6 h-6 text-n500"} strokeWidth={active ? 2.5 : 2} fill={active ? "#FFF1E8" : "none"} />
              <span className={`text-[10px] font-semibold ${active ? "text-fx" : "text-n500"}`}>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
