import React from "react";
import CrudManager from "@/admin/CrudManager";

export default function AdminCoupons() {
  return (
    <div>
      <p className="text-sm text-n500 mb-4">Create and manage discount coupons. Codes are matched in UPPERCASE at checkout.</p>
      <CrudManager
        collection="coupons"
        title="Coupon"
        defaults={{ active: true, type: "flat", value: 100, min_order: 0 }}
        columns={[
          { key: "code", label: "Code" },
          { key: "type", label: "Type" },
          { key: "value", label: "Value", render: (r) => (r.type === "percent" ? `${r.value}%` : `₹${r.value}`) },
          { key: "min_order", label: "Min Order" },
          { key: "active", label: "Active" },
        ]}
        fields={[
          { key: "code", label: "Coupon Code", type: "text", help: "e.g. FIRST100 — entered as UPPERCASE" },
          { key: "type", label: "Discount Type", type: "select", options: [{ value: "flat", label: "Flat (₹ off)" }, { value: "percent", label: "Percentage (% off)" }, { value: "free_product", label: "Free Product" }] },
          { key: "value", label: "Value (₹ or %)", type: "number" },
          { key: "free_product_id", label: "Free Product ID (for Free Product type)", type: "text", help: "Paste the product ID to give free with this coupon" },
          { key: "min_order", label: "Minimum Order (₹)", type: "number" },
          { key: "max_discount", label: "Max Discount cap (₹, optional — for %)", type: "number" },
          { key: "expiry", label: "Expiry (ISO date, optional)", type: "text", help: "e.g. 2026-12-31T23:59:59Z — leave blank for no expiry" },
          { key: "active", label: "Active", type: "boolean" },
        ]}
      />
    </div>
  );
}
