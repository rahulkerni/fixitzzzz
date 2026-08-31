import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/AppLayout";
import Splash from "@/components/Splash";
import Home from "@/pages/Home";
import Repair from "@/pages/Repair";
import Shop from "@/pages/Shop";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import Sell from "@/pages/Sell";
import Buy from "@/pages/Buy";
import Wallet from "@/pages/Wallet";
import Orders from "@/pages/Orders";
import Account from "@/pages/Account";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AdminLayout from "@/admin/AdminLayout";
import AdminDashboard from "@/admin/AdminDashboard";
import AdminHomepageBuilder from "@/admin/AdminHomepageBuilder";
import AdminBanners from "@/admin/AdminBanners";
import AdminCategoryGrid from "@/admin/AdminCategoryGrid";
import AdminFeatures from "@/admin/AdminFeatures";
import AdminSettings from "@/admin/AdminSettings";
import AdminSections from "@/admin/AdminSections";
import AdminProducts from "@/admin/AdminProducts";
import AdminRepair from "@/admin/AdminRepair";
import AdminSell from "@/admin/AdminSell";
import AdminBuy from "@/admin/AdminBuy";
import AdminOrders from "@/admin/AdminOrders";
import AdminCoupons from "@/admin/AdminCoupons";
import AdminFlashSale from "@/admin/AdminFlashSale";
import AdminWallet from "@/admin/AdminWallet";
import AdminReferrals from "@/admin/AdminReferrals";
import FlashSale from "@/pages/FlashSale";
import AdminUsers from "@/admin/AdminUsers";
import AdminChat from "@/admin/AdminChat";
import AdminFreeProducts from "@/admin/AdminFreeProducts";
import AdminPriceRequests from "@/admin/AdminPriceRequests";
import AdminAI from "@/admin/AdminAI";
import SearchResults from "@/pages/SearchResults";
import ThemeInjector from "@/components/ThemeInjector";

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
      <ThemeInjector />
      <Splash />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/repair" element={<Repair />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="/buy" element={<Buy />} />
          <Route path="/flash" element={<FlashSale />} />
          <Route path="/wallet" element={<Protected><Wallet /></Protected>} />
          <Route path="/orders" element={<Protected><Orders /></Protected>} />
          <Route path="/account" element={<Account />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<Protected admin><AdminLayout /></Protected>}>
          <Route index element={<AdminDashboard />} />
          <Route path="builder" element={<AdminHomepageBuilder />} />
          <Route path="categories" element={<AdminCategoryGrid />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="features" element={<AdminFeatures />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="sections" element={<AdminSections />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="repair" element={<AdminRepair />} />
          <Route path="sell" element={<AdminSell />} />
          <Route path="buy" element={<AdminBuy />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="free-products" element={<AdminFreeProducts />} />
          <Route path="price-requests" element={<AdminPriceRequests />} />
          <Route path="ai" element={<AdminAI />} />
          <Route path="flash-sale" element={<AdminFlashSale />} />
          <Route path="wallet" element={<AdminWallet />} />
          <Route path="referrals" element={<AdminReferrals />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="chat" element={<AdminChat />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
