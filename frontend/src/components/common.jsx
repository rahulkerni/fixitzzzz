import React from "react";
import { motion } from "framer-motion";

export function Section({ title, children, action }) {
  return (
    <section className="px-4 mt-6">
      {title && (
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl text-n900">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`fx-skeleton rounded-2xl ${className}`} />;
}

export function Empty({ text }) {
  return <div className="text-center text-n500 text-sm py-10" data-testid="empty-state">{text}</div>;
}

export function FadeIn({ children, delay = 0, className = "" }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }} className={className}>
      {children}
    </motion.div>
  );
}

export function Price({ price, mrp }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-display text-fx text-base">{price === 0 ? "FREE" : `₹${Number(price).toLocaleString("en-IN")}`}</span>
      {mrp > price && <span className="text-xs text-n500 line-through">₹{Number(mrp).toLocaleString("en-IN")}</span>}
    </div>
  );
}
