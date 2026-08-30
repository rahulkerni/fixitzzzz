import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, Wand2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const KEYS = [["battery", "Battery"], ["speaker", "Speaker"], ["charging_port", "Charging"], ["back_panel", "Back"]];

export default function AdminRepairTiers() {
  const [bands, setBands] = useState([]);
  const { data } = useQuery({ queryKey: ["repair-tiers"], queryFn: () => api.get("/admin/repair-tiers").then((r) => r.data) });
  useEffect(() => { if (data?.bands) setBands(data.bands); }, [data]);

  const setBand = (i, k, v) => setBands(bands.map((b, idx) => idx === i ? { ...b, [k]: k === "upTo" ? (v === "" ? null : Number(v)) : (v === "" ? "" : Number(v)) } : b));
  const addBand = () => setBands([...bands, { upTo: null, battery: 0, speaker: 0, charging_port: 0, back_panel: 0 }]);
  const removeBand = (i) => setBands(bands.filter((_, idx) => idx !== i));

  const save = async () => { await api.put("/admin/repair-tiers", { data: { bands } }); toast.success("Tier bands saved"); };
  const apply = async (mode) => {
    const { data } = await api.post("/admin/repair/apply-tiers", { data: { mode } });
    toast.success(`Applied to ${data.updated} services across ${data.models} models`);
  };

  return (
    <div data-testid="repair-tiers">
      <div className="bg-fx-light rounded-xl p-3 mb-4 text-sm text-n800">Set the price for Battery / Speaker / Charging / Back per Screen-price band. When a model's Screen price is set, these auto-fill from the matching band.</div>
      <div className="bg-white border border-n200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-n200 text-left text-xs text-n500 uppercase">
            <th className="px-3 py-2">If Screen ≤ (₹)</th>{KEYS.map(([k, l]) => <th key={k} className="px-3 py-2">{l}</th>)}<th></th>
          </tr></thead>
          <tbody>
            {bands.map((b, i) => (
              <tr key={i} className="border-b border-n200/60" data-testid={`tier-band-${i}`}>
                <td className="px-3 py-2"><input type="number" value={b.upTo ?? ""} placeholder="∞ top" onChange={(e) => setBand(i, "upTo", e.target.value)} data-testid={`tier-upto-${i}`} className="w-24 bg-n200/30 rounded px-2 py-1 outline-none focus:ring-2 ring-fx" /></td>
                {KEYS.map(([k]) => (
                  <td key={k} className="px-3 py-2"><input type="number" value={b[k] ?? ""} onChange={(e) => setBand(i, k, e.target.value)} data-testid={`tier-${k}-${i}`} className="w-20 bg-n200/30 rounded px-2 py-1 outline-none focus:ring-2 ring-fx" /></td>
                ))}
                <td className="px-3 py-2"><button onClick={() => removeBand(i)} className="text-red-500"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        <button onClick={addBand} data-testid="tier-add-band" className="bg-white border border-n200 text-n800 text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1"><Plus className="w-4 h-4" /> Add Band</button>
        <button onClick={save} data-testid="tier-save" className="bg-fx text-white text-sm font-bold px-4 py-2 rounded-lg">Save Tier Settings</button>
        <button onClick={() => apply("fill")} data-testid="tier-apply-fill" className="bg-emerald-600 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1"><Wand2 className="w-4 h-4" /> Fill missing</button>
        <button onClick={() => apply("overwrite")} data-testid="tier-apply-overwrite" className="bg-n900 text-white text-sm font-bold px-4 py-2 rounded-lg">Overwrite all</button>
      </div>
    </div>
  );
}
