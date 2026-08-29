import React, { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem("fixitz_cart") || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("fixitz_cart", JSON.stringify(items));
  }, [items]);

  const add = (product, qty = 1) => {
    setItems((prev) => {
      const found = prev.find((i) => i.id === product.id);
      if (found) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { ...product, qty }];
    });
  };
  const remove = (id) => setItems((prev) => prev.filter((i) => i.id !== id));
  const setQty = (id, qty) => setItems((prev) =>
    qty <= 0 ? prev.filter((i) => i.id !== id) : prev.map((i) => i.id === id ? { ...i, qty } : i));
  const clear = () => setItems([]);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{ items, add, remove, setQty, clear, count, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
