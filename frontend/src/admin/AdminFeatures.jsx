import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet, Gift, Disc3, Zap, MessageCircle, Wrench, Smartphone, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const FEATURES = [
  { key: "wallet", label: "Wallet System", desc: "Show wallet card & add-money on homepage", icon: Wallet },
  { key: "referral", label: "Referral Program", desc: "Invite & Earn cards across the app", icon: Gift },
  { key: "spin", label: "Spin & Win", desc: "Gamification rewards", icon: Disc3 },
  { key: "flash", label: "Flash Deals", desc: "Countdown flash sale section", icon: Zap },
  { key: "repair", label: "Repair Engine", desc: "30-min repair booking section", icon: Wrench },
  { key: "buy", label: "Buy Phone", desc: "Refurbished phones section", icon: Smartphone },
  { key: "sell", label: "Sell Phone", desc: "Sell your phone section", icon: RefreshCw },
  { key: "chat", label: "Chat Support", desc: "Floating chat widget for customers", icon: MessageCircle },
];

export default function AdminFeatures() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api.get("/settings").then((r) => r.data) });
  const [features, setFeatures] = useState({});
  useEffect(() => { if (settings?.features) setFeatures(settings.features); }, [settings]);

  const toggle = async (key) => {
    const next = { ...features, [key]: !features[key] };
    setFeatures(next);
    await api.put("/admin/settings", { features: next });
    qc.invalidateQueries({ queryKey: ["settings"] });
    qc.invalidateQueries({ queryKey: ["sections"] });
    toast.success(`${key} ${next[key] ? "enabled" : "disabled"}`);
  };

  const [reward, setReward] = useState(100);
  useEffect(() => { if (settings?.referralReward != null) setReward(settings.referralReward); }, [settings]);
  const saveReward = async () => {
    await api.put("/admin/settings", { referralReward: reward });
    qc.invalidateQueries({ queryKey: ["settings"] });
    toast.success("Referral reward updated");
  };

  return (
    <div data-testid="admin-features">
      <h1 className="font-display text-3xl text-n900 mb-1">Feature Toggles</h1>
      <p className="text-sm text-n500 mb-5">Enable or disable features instantly across the app.</p>
      <div className="grid md:grid-cols-2 gap-4 max-w-3xl">
        {FEATURES.map((f) => (
          <div key={f.key} className="bg-white border border-n200 rounded-xl p-4 flex items-center gap-3" data-testid={`feature-${f.key}`}>
            <div className="w-11 h-11 rounded-xl bg-fx-light flex items-center justify-center"><f.icon className="w-5 h-5 text-fx" /></div>
            <div className="flex-1"><p className="text-sm font-semibold text-n900">{f.label}</p><p className="text-[11px] text-n500">{f.desc}</p></div>
            <button onClick={() => toggle(f.key)} data-testid={`feature-toggle-${f.key}`}
              className={`relative w-12 h-7 rounded-full transition-colors ${features[f.key] ? "bg-fx" : "bg-n200"}`}>
              <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${features[f.key] ? "left-6" : "left-1"}`} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-white border border-n200 rounded-xl p-4 max-w-md" data-testid="referral-control">
        <p className="font-semibold text-sm mb-2">Referral & Wallet Control</p>
        <label className="text-xs font-semibold text-n800">Referral reward (₹ per friend)</label>
        <div className="flex gap-2 mt-1">
          <input type="number" value={reward} onChange={(e) => setReward(Number(e.target.value))} data-testid="referral-reward" className="flex-1 bg-n200/30 rounded-lg p-2.5 text-sm outline-none focus:ring-2 ring-fx" />
          <button onClick={saveReward} data-testid="save-reward" className="bg-fx text-white font-bold px-5 rounded-lg active:scale-95 transition-transform">Save</button>
        </div>
        <p className="text-[11px] text-n500 mt-2">Wallet & Referral visibility is controlled by the switches above.</p>
      </div>
    </div>
  );
}
