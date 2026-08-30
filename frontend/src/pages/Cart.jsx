import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Minus, Plus, ShoppingCart, Tag, Wallet, Sparkles, Phone } from "lucide-react";
import api, { apiErr } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { fmt, payWithRazorpay } from "@/lib/utils2";
import { playChime } from "@/lib/sounds";
import { toast } from "sonner";

export default function Cart() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { items, setQty, remove, subtotal, clear } = useCart();
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [mobile, setMobile] = useState(user?.phone || "");
  const [address, setAddress] = useState("");
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [influencer, setInfluencer] = useState("");
  const [useWallet, setUseWallet] = useState(false);

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api.get("/settings").then((r) => r.data) });
  const { data: wallet } = useQuery({ queryKey: ["wallet"], queryFn: () => api.get("/wallet").then((r) => r.data), enabled: !!user });

  const delivery = items.length ? (settings?.deliveryCharge || 0) : 0;
  const total = Math.max(0, subtotal + delivery - discount);
  const balance = wallet?.balance || 0;
  const walletApplied = useWallet ? Math.min(balance, total) : 0;
  const payable = Math.max(0, total - walletApplied);

  const applyCoupon = async () => {
    if (!user) { toast.error("Login to apply coupons"); return; }
    try {
      const { data } = await api.get("/coupons/validate", { params: { code, order_value: subtotal } });
      setDiscount(data.discount);
      toast.success(`Coupon applied! ₹${data.discount} off`);
    } catch (e) { toast.error(apiErr(e)); }
  };

  const placeOrder = async (paymentInfo) => {
    if (walletApplied > 0) {
      await api.post("/wallet/spend", { amount: walletApplied, note: "Order payment" });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    }
    await api.post("/orders", {
      type: "product", amount: total,
      items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
      details: { discount, delivery, walletUsed: walletApplied, influencerCode: influencer || null },
      address: { text: address, phone: mobile, name },
      payment: paymentInfo,
    });
    clear(); playChime(); toast.success("Order placed!"); nav("/orders");
  };

  const checkout = async () => {
    if (!user) { toast.error("Please login to checkout"); nav("/login"); return; }
    if (!/^\d{10}$/.test(mobile.trim())) { toast.error("Enter a valid 10-digit mobile number"); return; }
    if (!address.trim()) { toast.error("Enter delivery address"); return; }
    if (payable <= 0) {
      try { await placeOrder({ status: "wallet", method: "wallet" }); } catch (e) { toast.error(apiErr(e)); }
      return;
    }
    payWithRazorpay({
      amount: payable, user,
      onSuccess: (resp) => placeOrder({ id: resp.razorpay_payment_id, status: "paid", method: walletApplied > 0 ? "wallet+razorpay" : "razorpay" }).catch((e) => toast.error(apiErr(e))),
      onFail: () => toast.error("Payment cancelled"),
    });
  };

  if (!items.length) return (
    <div className="flex flex-col items-center justify-center py-24 px-6" data-testid="cart-empty">
      <ShoppingCart className="w-16 h-16 text-n200" />
      <p className="mt-4 font-display text-xl text-n900">Your cart is empty</p>
      <button onClick={() => nav("/shop")} className="mt-4 bg-fx text-white font-bold px-6 py-3 rounded-full active:scale-95 transition-transform">Start Shopping</button>
    </div>
  );

  return (
    <div className="pb-52" data-testid="cart-page">
      <h1 className="font-display text-2xl text-n900 px-4 pt-4">Checkout</h1>
      <div className="px-4 mt-4 space-y-3">
        {items.map((i) => (
          <div key={i.id} className="bg-white rounded-2xl shadow-sm p-3 flex gap-3" data-testid={`cart-item-${i.id}`}>
            <img src={i.image} alt="" className="w-16 h-16 rounded-xl object-cover" />
            <div className="flex-1">
              <p className="text-sm font-semibold line-clamp-1">{i.name}</p>
              <p className="text-fx font-display">{i.price === 0 ? "FREE" : fmt(i.price)}</p>
              <div className="flex items-center gap-2 mt-1">
                <button onClick={() => setQty(i.id, i.qty - 1)} className="w-7 h-7 rounded-full bg-n200/50 flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
                <span className="text-sm font-bold w-5 text-center">{i.qty}</span>
                <button onClick={() => setQty(i.id, i.qty + 1)} className="w-7 h-7 rounded-full bg-fx text-white flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <button onClick={() => remove(i.id)} data-testid={`cart-remove-${i.id}`} className="self-start p-1 text-n500"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      {/* Delivery details */}
      <div className="px-4 mt-4">
        <p className="font-display text-lg text-n900 mb-2">Delivery Details</p>
        <div className="bg-white rounded-2xl shadow-sm p-3 space-y-2.5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" data-testid="cart-name" className="w-full bg-n200/30 rounded-xl p-3 text-sm outline-none focus:ring-2 ring-fx" />
          <div className="flex items-center gap-2 bg-n200/30 rounded-xl px-3">
            <Phone className="w-4 h-4 text-fx" />
            <input value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" placeholder="Mobile number (required)" data-testid="cart-mobile" className="flex-1 bg-transparent p-3 text-sm outline-none" />
          </div>
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} data-testid="cart-address" rows={2} placeholder="Full delivery address, Jammu…" className="w-full bg-n200/30 rounded-xl p-3 text-sm outline-none focus:ring-2 ring-fx" />
        </div>
      </div>

      {/* Coupon + Influencer */}
      <div className="px-4 mt-4 space-y-2">
        <div className="bg-white rounded-2xl shadow-sm p-3 flex items-center gap-2">
          <Tag className="w-4 h-4 text-fx" />
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code (FIRST100)" data-testid="coupon-input" className="flex-1 outline-none text-sm bg-transparent uppercase" />
          <button onClick={applyCoupon} data-testid="coupon-apply" className="text-xs font-bold text-fx">APPLY</button>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-fx" />
          <input value={influencer} onChange={(e) => setInfluencer(e.target.value.toUpperCase())} placeholder="Influencer / Referral code (optional)" data-testid="influencer-input" className="flex-1 outline-none text-sm bg-transparent uppercase" />
        </div>
      </div>

      {/* Wallet */}
      {user && (
        <div className="px-4 mt-2">
          <button onClick={() => setUseWallet((v) => !v)} data-testid="use-wallet-toggle" className="w-full bg-white rounded-2xl shadow-sm p-3 flex items-center gap-3 active:scale-[0.99] transition-transform">
            <div className="w-9 h-9 rounded-xl bg-fx-light flex items-center justify-center"><Wallet className="w-4 h-4 text-fx" /></div>
            <div className="flex-1 text-left"><p className="text-sm font-semibold">Use Wallet Balance</p><p className="text-[11px] text-n500">Available: {fmt(balance)}</p></div>
            <div className={`relative w-11 h-6 rounded-full transition-colors ${useWallet ? "bg-fx" : "bg-n200"}`}><span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${useWallet ? "left-6" : "left-1"}`} /></div>
          </button>
        </div>
      )}

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-n200 p-4 z-30">
        <div className="text-xs text-n500 flex justify-between"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
        <div className="text-xs text-n500 flex justify-between"><span>Delivery</span><span>{fmt(delivery)}</span></div>
        {discount > 0 && <div className="text-xs text-emerald-600 flex justify-between"><span>Discount</span><span>-{fmt(discount)}</span></div>}
        {walletApplied > 0 && <div className="text-xs text-fx flex justify-between"><span>Wallet</span><span>-{fmt(walletApplied)}</span></div>}
        <div className="flex justify-between items-center mt-1 mb-2"><span className="font-bold">To Pay</span><span className="font-display text-xl text-fx">{fmt(payable)}</span></div>
        <button onClick={checkout} data-testid="checkout-btn" className="w-full bg-fx text-white font-bold py-4 rounded-full active:scale-95 transition-transform">
          {payable <= 0 ? `Pay ${fmt(walletApplied)} with Wallet` : `Pay ${fmt(payable)}`}
        </button>
      </div>
    </div>
  );
}
