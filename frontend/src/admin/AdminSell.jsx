import React, { useState } from "react";
import CrudManager from "@/admin/CrudManager";

export default function AdminSell() {
  const [tab, setTab] = useState("Devices");
  return (
    <div data-testid="admin-sell">
      <h1 className="font-display text-3xl text-n900 mb-1">Sell Engine</h1>
      <p className="text-sm text-n500 mb-4">Set base price per device and deduction rules per condition. Final = Base − deductions (× multipliers).</p>
      <div className="flex gap-2 mb-5">
        {["Devices", "Conditions"].map((t) => (
          <button key={t} onClick={() => setTab(t)} data-testid={`sell-tab-${t.toLowerCase()}`} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === t ? "bg-fx text-white" : "bg-white border border-n200 text-n800"}`}>{t}</button>
        ))}
      </div>

      {tab === "Devices" && (
        <CrudManager collection="sell_devices" title="Sell Device" defaults={{ active: true, demandScore: 1.0 }}
          columns={[{ key: "model", label: "Model" }, { key: "brand", label: "Brand" }, { key: "base_price", label: "Base Price" }, { key: "active", label: "Active" }]}
          fields={[
            { key: "model", label: "Model Name", type: "text" },
            { key: "brand", label: "Brand", type: "text" },
            { key: "base_price", label: "Base Price (₹)", type: "number" },
            { key: "image", label: "Image URL", type: "text" },
            { key: "active", label: "Active", type: "boolean" },
          ]} />
      )}
      {tab === "Conditions" && (
        <CrudManager collection="sell_conditions" title="Condition Question" defaults={{ order: 0, kind: "deduction", options: "[]" }}
          columns={[{ key: "label", label: "Question" }, { key: "kind", label: "Kind" }, { key: "order", label: "Order" }]}
          fields={[
            { key: "label", label: "Question Label", type: "text" },
            { key: "key", label: "Key", type: "text" },
            { key: "kind", label: "Kind", type: "select", options: [{ value: "deduction", label: "Deduction (₹)" }, { value: "multiplier", label: "Multiplier (×)" }] },
            { key: "order", label: "Order", type: "number" },
            { key: "options", label: "Options (JSON)", type: "json", help: '[{"label":"Cracked","value":3000}]' },
          ]} />
      )}
    </div>
  );
}
