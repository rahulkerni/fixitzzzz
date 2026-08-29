import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/AppLayout";
import Home from "@/pages/Home";
import Repair from "@/pages/Repair";
import Shop from "@/pages/Shop";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import Sell from "@/pages/Sell";
import Buy from "@/pages/Buy";
import Orders from "@/pages/Orders";
import Account from "@/pages/Account";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AdminLayout from "@/admin/AdminLayout";
import AdminDashboard from "@/admin/AdminDashboard";
import AdminSettings from "@/admin/AdminSettings";
import AdminSections from "@/admin/AdminSections";
import AdminProducts from "@/admin/AdminProducts";
import AdminRepair from "@/admin/AdminRepair";
import AdminSell from "@/admin/AdminSell";
import AdminBuy from "@/admin/AdminBuy";
import AdminOrders from "@/admin/AdminOrders";
import AdminUsers from "@/admin/AdminUsers";

function Protected({ children, admin }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="fx-shell flex items-center justify-center"><div className="text-fx font-display">Loading…</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/repair" element={<Repair />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="/buy" element={<Buy />} />
          <Route path="/orders" element={<Protected><Orders /></Protected>} />
          <Route path="/account" element={<Account />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<Protected admin><AdminLayout /></Protected>}>
          <Route index element={<AdminDashboard />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="sections" element={<AdminSections />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="repair" element={<AdminRepair />} />
          <Route path="sell" element={<AdminSell />} />
          <Route path="buy" element={<AdminBuy />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
