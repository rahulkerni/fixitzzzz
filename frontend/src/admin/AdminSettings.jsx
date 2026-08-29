import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export default function AdminSettings() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings"], queryFn: () => api.get("/settings").then((r) => r.data) });
  const [form, setForm] = useState({});
  useEffect(() => { if (data) setForm(data); }, [data]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    await api.put("/admin/settings", {
      appName: form.appName, tagline: form.tagline, logo: form.logo,
      currency: form.currency, deliveryCharge: Number(form.deliveryCharge),
      supportPhone: form.supportPhone, city: form.city,
    });
    qc.invalidateQueries({ queryKey: ["settings"] });
    toast.success("Settings updated");
  };

  const F = [
    { k: "appName", l: "App Name" }, { k: "tagline", l: "Tagline" },
    { k: "city", l: "City" }, { k: "currency", l: "Currency Symbol" },
    { k: "deliveryCharge", l: "Delivery Charge (₹)", t: "number" },
    { k: "supportPhone", l: "Support Phone" }, { k: "logo", l: "Logo URL" },
  ];

  return (
    <div data-testid="admin-settings">
      <h1 className="font-display text-3xl text-n900 mb-6">App Settings</h1>
      <div className="bg-white border border-n200 rounded-lg p-5 max-w-lg space-y-4">
        {F.map((f) => (
          <div key={f.k}>
            <label className="text-xs font-semibold text-n800">{f.l}</label>
            <input type={f.t || "text"} value={form[f.k] ?? ""} onChange={set(f.k)} data-testid={`setting-${f.k}`} className="w-full mt-1 bg-n200/30 rounded-lg p-2.5 text-sm outline-none focus:ring-2 ring-fx" />
          </div>
        ))}
        <button onClick={save} data-testid="settings-save" className="bg-fx text-white font-bold px-6 py-3 rounded-lg active:scale-95 transition-transform">Save Settings</button>
      </div>
    </div>
  );
}
