import React, { useState, useRef, useEffect } from "react";
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

export function CountUp({ value, prefix = "₹", className = "" }) {
  const [display, setDisplay] = useState(value || 0);
  const prev = useRef(value || 0);
  useEffect(() => {
    const from = prev.current;
    const to = value || 0;
    prev.current = to;
    if (from === to) { setDisplay(to); return; }
    const start = performance.now();
    const dur = 650;
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{prefix}{Number(display).toLocaleString("en-IN")}</span>;
}
