import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Wrench, ShoppingBag, RefreshCw, Smartphone, Wallet, Gift, Sparkles, Package, Zap, BatteryCharging, Plug, Volume2, Camera, Layers } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const ICONS = { wrench: Wrench, "shopping-bag": ShoppingBag, "refresh-cw": RefreshCw, smartphone: Smartphone, wallet: Wallet, gift: Gift, sparkles: Sparkles, package: Package, zap: Zap, "battery-charging": BatteryCharging, plug: Plug, "volume-2": Volume2, camera: Camera, layers: Layers };
const ICON_OPTS = Object.keys(ICONS);
const COLORS = ["#FFF1E8", "#E8F1FF", "#E8FFF2", "#F3E8FF", "#FFF9E8", "#FFE8F0", "#EFEFEF"];

export default function AdminCategoryGrid() {
  const qc = useQueryClient();
  const { data: sections = [] } = useQuery({ queryKey: ["admin", "sections"], queryFn: () => api.get("/admin/sections").then((r) => r.data) });
  const grid = sections.find((s) => s.type === "category_grid");
  const [items, setItems] = useState([]);
  useEffect(() => { if (grid) setItems(grid.config?.items || []); }, [grid?.id]);

  if (!grid) return <p className="text-n500">No category grid section found. Add one from Homepage Builder.</p>;

  const setItem = (i, k, v) => setItems(items.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const addItem = () => setItems([...items, { label: "New", icon: "sparkles", link: "/shop", color: "#FFF1E8" }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));

  const save = async () => {
    await api.put(`/admin/sections/${grid.id}`, { data: { config: { ...grid.config, items } } });
    qc.invalidateQueries({ queryKey: ["admin", "sections"] });
    qc.invalidateQueries({ queryKey: ["sections"] });
    toast.success("Category icons saved — live on homepage");
  };

  return (
    <div data-testid="admin-categorygrid">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-3xl text-n900">Category Icons</h1>
        <button onClick={addItem} data-testid="add-cat-item" className="bg-fx text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1"><Plus className="w-4 h-4" /> Add</button>
      </div>
      <p className="text-sm text-n500 mb-5">Change the "What do you need?" icons, labels, links and colors.</p>

      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((it, i) => {
          const Icon = ICONS[it.icon] || Sparkles;
          return (
            <div key={i} className="bg-white border border-n200 rounded-xl p-3 flex gap-3" data-testid={`cat-item-${i}`}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden" style={{ background: it.color }}>{it.image ? <img src={it.image} alt="" className="w-full h-full object-cover" /> : <Icon className="w-6 h-6 text-n900" />}</div>
              <div className="flex-1 space-y-2">
                <input value={it.label} onChange={(e) => setItem(i, "label", e.target.value)} placeholder="Label" data-testid={`cat-label-${i}`} className="w-full bg-n200/30 rounded-lg p-2 text-sm outline-none" />
                <div className="flex gap-2">
                  <select value={it.icon} onChange={(e) => setItem(i, "icon", e.target.value)} data-testid={`cat-icon-${i}`} className="flex-1 bg-n200/30 rounded-lg p-2 text-sm outline-none">
                    {ICON_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <input value={it.link} onChange={(e) => setItem(i, "link", e.target.value)} placeholder="/link" className="w-24 bg-n200/30 rounded-lg p-2 text-sm outline-none" />
                </div>
                <input value={it.image || ""} onChange={(e) => setItem(i, "image", e.target.value)} placeholder="Image URL (optional — overrides icon)" data-testid={`cat-image-${i}`} className="w-full bg-n200/30 rounded-lg p-2 text-sm outline-none" />
                <div className="flex items-center gap-1.5">
                  {COLORS.map((c) => <button key={c} onClick={() => setItem(i, "color", c)} className={`w-6 h-6 rounded-full border-2 ${it.color === c ? "border-fx" : "border-transparent"}`} style={{ background: c }} />)}
                  <button onClick={() => removeItem(i)} data-testid={`del-cat-${i}`} className="ml-auto text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={save} data-testid="save-categories" className="mt-5 bg-fx text-white font-bold px-6 py-3 rounded-lg active:scale-95 transition-transform">Save Icons</button>
    </div>
  );
}
