import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Zap, Clock } from "lucide-react";
import api from "@/lib/api";
import { fmt } from "@/lib/utils2";
import { toast } from "sonner";

function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export default function AdminFlashSale() {
  const qc = useQueryClient();
  const { data: products = [] } = useQuery({ queryKey: ["admin", "products"], queryFn: () => api.get("/admin/products").then((r) => r.data) });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api.get("/settings").then((r) => r.data) });
  const [endsAt, setEndsAt] = useState("");
  const [prices, setPrices] = useState({});

  useEffect(() => { if (settings) setEndsAt(toLocalInput(settings.flashSaleEndsAt)); }, [settings]);

  const saveTimer = async () => {
    await api.put("/admin/settings", { flashSaleEndsAt: endsAt ? new Date(endsAt).toISOString() : "" });
    qc.invalidateQueries({ queryKey: ["settings"] });
    toast.success("Flash sale timer saved");
  };

  const toggleFlash = async (p) => {
    const tags = new Set(p.tags || []);
    tags.has("flash") ? tags.delete("flash") : tags.add("flash");
    await api.put(`/admin/products/${p.id}`, { data: { ...p, tags: [...tags] } });
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
    toast.success(tags.has("flash") ? "Added to flash sale" : "Removed from flash sale");
  };

  const savePrice = async (p) => {
    const val = prices[p.id];
    await api.put(`/admin/products/${p.id}`, { data: { ...p, flash_price: val === "" || val == null ? null : Number(val) } });
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
    toast.success("Flash price saved");
  };

  const inFlash = products.filter((p) => (p.tags || []).includes("flash"));
  const others = products.filter((p) => !(p.tags || []).includes("flash"));

  const Row = ({ p, active }) => (
    <tr className="border-b border-n200/60" data-testid={`flash-row-${p.id}`}>
      <td className="px-3 py-2">{p.image ? <img src={p.image} alt="" className="w-9 h-9 rounded object-cover" /> : "—"}</td>
      <td className="px-3 py-2 max-w-[160px] truncate">{p.name}</td>
      <td className="px-3 py-2 text-n500">{fmt(p.price)}</td>
      <td className="px-3 py-2">
        {active ? (
          <div className="flex items-center gap-1">
            <input type="number" defaultValue={p.flash_price ?? ""} onChange={(e) => setPrices({ ...prices, [p.id]: e.target.value })} placeholder="₹" data-testid={`flash-price-${p.id}`} className="w-20 bg-n200/40 rounded px-2 py-1 text-sm outline-none focus:ring-2 ring-fx" />
            <button onClick={() => savePrice(p)} data-testid={`flash-price-save-${p.id}`} className="text-[11px] font-bold text-fx px-1">Save</button>
          </div>
        ) : <span className="text-n300">—</span>}
      </td>
      <td className="px-3 py-2">
        <button onClick={() => toggleFlash(p)} data-testid={`flash-toggle-${p.id}`} className={`text-xs font-bold px-3 py-1.5 rounded-full ${active ? "bg-fx text-white" : "bg-n200/50 text-n800"}`}>{active ? "Remove" : "Add"}</button>
      </td>
    </tr>
  );

  return (
    <div data-testid="admin-flash-sale">
      <h1 className="font-display text-3xl text-n900 mb-1 flex items-center gap-2"><Zap className="w-7 h-7 text-fx fill-fx" /> Flash Sale</h1>
      <p className="text-sm text-n500 mb-4">Add products to the flash sale, set a discounted price, and control the countdown timer.</p>

      <div className="bg-white border border-n200 rounded-lg p-4 mb-6 max-w-lg">
        <label className="text-xs font-semibold text-n800 flex items-center gap-1"><Clock className="w-4 h-4 text-fx" /> Flash sale ends at</label>
        <div className="flex items-center gap-2 mt-2">
          <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} data-testid="flash-timer-input" className="flex-1 bg-n200/30 rounded-lg p-2.5 text-sm outline-none focus:ring-2 ring-fx" />
          <button onClick={saveTimer} data-testid="flash-timer-save" className="bg-fx text-white font-bold px-4 py-2.5 rounded-lg active:scale-95 transition-transform">Save</button>
        </div>
        <p className="text-[11px] text-n500 mt-1">Leave blank for an always-on sale with no countdown.</p>
      </div>

      <h2 className="font-display text-lg text-n900 mb-2">In Flash Sale ({inFlash.length})</h2>
      <div className="bg-white border border-n200 rounded-lg overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-n200 text-left text-xs text-n500 uppercase">
            <th className="px-3 py-2"></th><th className="px-3 py-2">Product</th><th className="px-3 py-2">Original</th><th className="px-3 py-2">Flash Price</th><th className="px-3 py-2"></th>
          </tr></thead>
          <tbody>
            {inFlash.map((p) => <Row key={p.id} p={p} active />)}
            {!inFlash.length && <tr><td colSpan={5} className="px-3 py-6 text-center text-n500">No products in flash sale yet</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 className="font-display text-lg text-n900 mb-2">All Products</h2>
      <div className="bg-white border border-n200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-n200 text-left text-xs text-n500 uppercase">
            <th className="px-3 py-2"></th><th className="px-3 py-2">Product</th><th className="px-3 py-2">Price</th><th className="px-3 py-2">Flash Price</th><th className="px-3 py-2"></th>
          </tr></thead>
          <tbody>
            {others.map((p) => <Row key={p.id} p={p} active={false} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
