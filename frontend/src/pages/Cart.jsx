import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Trash2, Minus, Plus, ShoppingCart, Tag } from "lucide-react";
import api from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { fmt, payWithRazorpay } from "@/lib/utils2";
import { apiErr } from "@/lib/api";
import { toast } from "sonner";

export default function Cart() {
  const nav = useNavigate();
  const { items, setQty, remove, subtotal, clear } = useCart();
  const { user } = useAuth();
  const [address, setAddress] = useState("");
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api.get("/settings").then((r) => r.data) });

  const delivery = items.length ? (settings?.deliveryCharge || 0) : 0;
  const total = Math.max(0, subtotal + delivery - discount);

  const applyCoupon = async () => {
    if (!user) { toast.error("Login to apply coupons"); return; }
    try {
      const { data } = await api.get("/coupons/validate", { params: { code, order_value: subtotal } });
      setDiscount(data.discount);
      toast.success(`Coupon applied! ₹${data.discount} off`);
    } catch (e) { toast.error(apiErr(e)); }
  };

  const checkout = () => {
    if (!user) { toast.error("Please login to checkout"); nav("/login"); return; }
    if (!address.trim()) { toast.error("Enter delivery address"); return; }
    payWithRazorpay({
      amount: total, user,
      onSuccess: async (resp) => {
        await api.post("/orders", {
          type: "product", amount: total,
          items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
          details: { discount, delivery },
          address: { text: address }, payment: { id: resp.razorpay_payment_id, status: "paid" },
        });
        clear(); toast.success("Order placed!"); nav("/orders");
      },
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
    <div className="pb-40" data-testid="cart-page">
      <h1 className="font-display text-2xl text-n900 px-4 pt-4">Cart</h1>
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

      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl shadow-sm p-3 flex items-center gap-2">
          <Tag className="w-4 h-4 text-fx" />
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code (FIRST100)" data-testid="coupon-input" className="flex-1 outline-none text-sm bg-transparent uppercase" />
          <button onClick={applyCoupon} data-testid="coupon-apply" className="text-xs font-bold text-fx">APPLY</button>
        </div>
      </div>

      <div className="px-4 mt-4">
        <textarea value={address} onChange={(e) => setAddress(e.target.value)} data-testid="cart-address" rows={2} placeholder="Delivery address…" className="w-full bg-white shadow-sm rounded-2xl p-3 text-sm outline-none" />
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-n200 p-4 z-30">
        <div className="text-xs text-n500 flex justify-between"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
        <div className="text-xs text-n500 flex justify-between"><span>Delivery</span><span>{fmt(delivery)}</span></div>
        {discount > 0 && <div className="text-xs text-emerald-600 flex justify-between"><span>Discount</span><span>-{fmt(discount)}</span></div>}
        <div className="flex justify-between items-center mt-1 mb-2"><span className="font-bold">Total</span><span className="font-display text-xl text-fx">{fmt(total)}</span></div>
        <button onClick={checkout} data-testid="checkout-btn" className="w-full bg-fx text-white font-bold py-4 rounded-full active:scale-95 transition-transform">Pay {fmt(total)}</button>
      </div>
    </div>
  );
}
