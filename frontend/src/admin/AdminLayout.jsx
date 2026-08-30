import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Settings, LayoutList, Package, Wrench, RefreshCw, Smartphone, ShoppingCart, Users, ArrowLeft, Blocks, Image, ToggleRight, MessageCircle, Grid3x3, Ticket } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const LINKS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/builder", label: "Homepage Builder", icon: Blocks },
  { to: "/admin/categories", label: "Category Icons", icon: Grid3x3 },
  { to: "/admin/banners", label: "Banner Manager", icon: Image },
  { to: "/admin/features", label: "Feature Toggles", icon: ToggleRight },
  { to: "/admin/chat", label: "Chat Support", icon: MessageCircle },
  { to: "/admin/sections", label: "All Sections", icon: LayoutList },
  { to: "/admin/products", label: "Shop Products", icon: Package },
  { to: "/admin/repair", label: "Repair Engine", icon: Wrench },
  { to: "/admin/sell", label: "Sell Engine", icon: RefreshCw },
  { to: "/admin/buy", label: "Buy / Refurbished", icon: Smartphone },
  { to: "/admin/coupons", label: "Coupons", icon: Ticket },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/settings", label: "App Settings", icon: Settings },
];

export default function AdminLayout() {
  const nav = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#F8F7F5] flex" data-testid="admin-layout">
      <aside className="w-60 bg-white border-r border-n200 hidden md:flex flex-col fixed h-screen">
        <div className="px-5 py-4 border-b border-n200 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-fx flex items-center justify-center text-white font-display">F</div>
          <div><p className="font-display text-lg leading-none">FixitZ</p><p className="text-[10px] text-n500">Admin Console</p></div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} data-testid={`admin-nav-${l.label.split(" ")[0].toLowerCase()}`}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-fx text-white" : "text-n800 hover:bg-n200/40"}`}>
              <l.icon className="w-4 h-4" /> {l.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={() => nav("/")} className="m-3 px-3 py-2.5 rounded-lg text-sm font-medium text-n500 hover:bg-n200/40 flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Back to App</button>
      </aside>

      <div className="flex-1 md:ml-60">
        <header className="bg-white border-b border-n200 px-5 py-3 flex items-center justify-between sticky top-0 z-20">
          <button onClick={() => nav("/")} className="md:hidden flex items-center gap-1 text-sm text-n500"><ArrowLeft className="w-4 h-4" /> App</button>
          <div className="hidden md:block text-sm text-n500">Manage everything — no code required</div>
          <div className="text-sm font-semibold text-n800">{user?.name}</div>
        </header>
        <div className="md:hidden bg-white border-b border-n200 flex gap-1 overflow-x-auto no-scrollbar px-2 py-2">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold ${isActive ? "bg-fx text-white" : "bg-n200/40 text-n800"}`}>{l.label}</NavLink>
          ))}
        </div>
        <main className="p-4 md:p-6 max-w-6xl"><Outlet /></main>
      </div>
    </div>
  );
}
