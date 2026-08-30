import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import CrudManager from "@/admin/CrudManager";
import AdminRepairTiers from "@/admin/AdminRepairTiers";
import AdminRepairImport from "@/admin/AdminRepairImport";
import api from "@/lib/api";

const TABS = ["Brands", "Models", "Issues", "Services", "Price Tiers", "Bulk Import"];

export default function AdminRepair() {
  const [tab, setTab] = useState("Brands");
  const { data: brands = [] } = useQuery({ queryKey: ["admin", "repair_brands"], queryFn: () => api.get("/admin/repair_brands").then((r) => r.data) });
  const { data: models = [] } = useQuery({ queryKey: ["admin", "repair_models"], queryFn: () => api.get("/admin/repair_models").then((r) => r.data) });
  const brandOpts = () => brands.map((b) => ({ value: b.id, label: b.name }));
  const modelOpts = () => models.map((m) => ({ value: m.id, label: m.name }));

  return (
    <div data-testid="admin-repair">
      <h1 className="font-display text-3xl text-n900 mb-1">Repair Engine</h1>
      <p className="text-sm text-n500 mb-4">Base price auto-multiplies: &lt;₹800 ×2.5, ₹800–1300 ×2.3, &gt;₹1300 ×2. Set override to fix a price manually.</p>
      <div className="flex gap-2 mb-5">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} data-testid={`repair-tab-${t.toLowerCase()}`} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === t ? "bg-fx text-white" : "bg-white border border-n200 text-n800"}`}>{t}</button>
        ))}
      </div>

      {tab === "Brands" && (
        <CrudManager collection="repair_brands" title="Brand" defaults={{ active: true, order: 0 }}
          columns={[{ key: "image", label: "" }, { key: "name", label: "Name" }, { key: "order", label: "Order" }, { key: "active", label: "Active" }]}
          fields={[
            { key: "name", label: "Brand Name", type: "text" },
            { key: "image", label: "Logo URL", type: "text" },
            { key: "order", label: "Order", type: "number" },
            { key: "active", label: "Active", type: "boolean" },
          ]} />
      )}
      {tab === "Models" && (
        <CrudManager collection="repair_models" title="Model" defaults={{ active: true }}
          columns={[{ key: "name", label: "Model" }, { key: "brand_id", label: "Brand", render: (r) => brands.find((b) => b.id === r.brand_id)?.name || "—" }, { key: "active", label: "Active" }]}
          fields={[
            { key: "brand_id", label: "Brand", type: "select", options: brandOpts },
            { key: "name", label: "Model Name", type: "text" },
            { key: "image", label: "Image URL", type: "text" },
            { key: "active", label: "Active", type: "boolean" },
          ]} />
      )}
      {tab === "Issues" && (
        <CrudManager collection="repair_issues" title="Issue Type" defaults={{ order: 0 }}
          columns={[{ key: "name", label: "Name" }, { key: "key", label: "Key" }, { key: "icon", label: "Icon" }]}
          fields={[
            { key: "name", label: "Issue Name", type: "text" },
            { key: "key", label: "Key", type: "text", help: "e.g. screen, battery" },
            { key: "icon", label: "Lucide icon", type: "text" },
            { key: "order", label: "Order", type: "number" },
          ]} />
      )}
      {tab === "Services" && (
        <CrudManager collection="repair_services" title="Repair Price" defaults={{ active: true, override_price: null }}
          columns={[
            { key: "model_id", label: "Model", render: (r) => models.find((m) => m.id === r.model_id)?.name || "—" },
            { key: "issue_name", label: "Issue" }, { key: "base_price", label: "Base" }, { key: "override_price", label: "Override" },
          ]}
          fields={[
            { key: "model_id", label: "Model", type: "select", options: modelOpts },
            { key: "issue", label: "Issue Key", type: "text", help: "e.g. screen, battery" },
            { key: "issue_name", label: "Issue Display Name", type: "text" },
            { key: "base_price", label: "Base Price (₹)", type: "number", help: "Auto-multiplied for final price" },
            { key: "override_price", label: "Override Price (₹)", type: "number", help: "Leave blank for auto pricing" },
            { key: "active", label: "Active", type: "boolean" },
          ]} />
      )}
      {tab === "Price Tiers" && <AdminRepairTiers />}
      {tab === "Bulk Import" && <AdminRepairImport />}
    </div>
  );
}
