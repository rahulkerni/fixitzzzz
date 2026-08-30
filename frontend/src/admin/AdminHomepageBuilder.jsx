import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, Eye, EyeOff, Pencil, Save, X, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const CARD_STYLES = [{ value: "flat", label: "Flat" }, { value: "elevated", label: "Elevated" }, { value: "outline", label: "Outline" }];
const TYPE_LABEL = {
  banner: "Hero Banner", category_grid: "Category Grid", wallet: "Wallet Card", flash_sale: "Flash Deals",
  exclusive_deals: "Exclusive Discounts",
  repair_service: "Repair Service", shop_products: "Shop Products", free_products: "Free Products",
  sell_phone: "Sell Phone", buy_phone: "Buy Phone", order_tracking: "Order Tracking", referral: "Referral", video: "Video", custom: "Custom",
};

function SectionRow({ section, onToggle, onEdit }) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={section} dragListener={false} dragControls={controls}
      className="bg-white border border-n200 rounded-xl p-3 flex items-center gap-3 mb-2 shadow-sm" data-testid={`builder-row-${section.id}`}>
      <div onPointerDown={(e) => controls.start(e)} className="cursor-grab active:cursor-grabbing touch-none text-n500" data-testid={`drag-${section.id}`}><GripVertical className="w-5 h-5" /></div>
      <div className="w-2.5 h-2.5 rounded-full" style={{ background: section.config?.bg || section.config?.highlight ? "#FF6A00" : "#E6E4DF" }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-n900 truncate">{section.title}</p>
        <p className="text-[11px] text-n500">{TYPE_LABEL[section.type] || section.type}{section.config?.highlight ? " • highlighted" : ""}</p>
      </div>
      <button onClick={() => onToggle(section)} data-testid={`toggle-${section.id}`} className={`p-2 rounded-lg ${section.visible ? "text-emerald-600 bg-emerald-50" : "text-n500 bg-n200/40"}`}>{section.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
      <button onClick={() => onEdit(section)} data-testid={`style-${section.id}`} className="p-2 rounded-lg text-fx bg-fx-light"><Pencil className="w-4 h-4" /></button>
    </Reorder.Item>
  );
}

export default function AdminHomepageBuilder() {
  const qc = useQueryClient();
  const { data: server = [] } = useQuery({ queryKey: ["admin", "sections"], queryFn: () => api.get("/admin/sections").then((r) => r.data) });
  const [list, setList] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  useEffect(() => { setList(server); }, [server]);

  const update = useMutation({
    mutationFn: ({ id, data }) => api.put(`/admin/sections/${id}`, { data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "sections"] }),
  });

  const saveOrder = async () => {
    await Promise.all(list.map((s, i) => api.put(`/admin/sections/${s.id}`, { data: { order: i } })));
    qc.invalidateQueries({ queryKey: ["admin", "sections"] });
    qc.invalidateQueries({ queryKey: ["sections"] });
    setDirty(false); toast.success("Order saved — live on homepage");
  };

  const toggle = (s) => update.mutate({ id: s.id, data: { visible: !s.visible } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: ["sections"] }); toast.success(s.visible ? "Hidden" : "Now visible"); } });

  const openEdit = (s) => { setEditing(s); setForm({ title: s.title, bg: s.config?.bg || "", highlight: !!s.config?.highlight, cardStyle: s.config?.cardStyle || "flat" }); };

  const saveStyle = () => {
    const cfg = { ...editing.config, bg: form.bg || undefined, highlight: form.highlight, cardStyle: form.cardStyle };
    update.mutate({ id: editing.id, data: { title: form.title, config: cfg } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: ["sections"] }); setEditing(null); toast.success("Styling saved"); } });
  };

  return (
    <div data-testid="admin-builder">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-3xl text-n900">Homepage Builder</h1>
        {dirty && <button onClick={saveOrder} data-testid="save-order" className="bg-fx text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1 active:scale-95 transition-transform"><Save className="w-4 h-4" /> Save Order</button>}
      </div>
      <p className="text-sm text-n500 mb-5">Drag to reorder, toggle visibility, and style each section. Changes go live instantly.</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-bold uppercase text-n500 mb-2">Sections</p>
          <Reorder.Group axis="y" values={list} onReorder={(v) => { setList(v); setDirty(true); }}>
            {list.map((s) => <SectionRow key={s.id} section={s} onToggle={toggle} onEdit={openEdit} />)}
          </Reorder.Group>
        </div>

        <div>
          <p className="text-xs font-bold uppercase text-n500 mb-2">Live Preview</p>
          <div className="bg-[#F8F7F5] border border-n200 rounded-2xl p-3 space-y-2 max-h-[70vh] overflow-y-auto" data-testid="builder-preview">
            {list.filter((s) => s.visible).map((s) => (
              <div key={s.id} className="rounded-xl p-3 text-sm font-semibold shadow-sm" style={{ background: s.config?.bg || "#fff", border: s.config?.highlight ? "1.5px solid #FF6A00" : "1px solid #E6E4DF" }}>
                <span className="text-[10px] uppercase text-n500 block">{TYPE_LABEL[s.type]}</span>
                {s.title}
                {s.config?.highlight && <Sparkles className="w-3.5 h-3.5 text-fx inline ml-1" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl w-full max-w-md" onClick={(e) => e.stopPropagation()} data-testid="style-dialog">
            <div className="flex items-center justify-between px-5 py-3 border-b border-n200"><h3 className="font-display text-lg">Style: {TYPE_LABEL[editing.type]}</h3><button onClick={() => setEditing(null)}><X className="w-5 h-5" /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="text-xs font-semibold text-n800">Section Title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="style-title" className="w-full mt-1 bg-n200/30 rounded-lg p-2.5 text-sm outline-none focus:ring-2 ring-fx" /></div>
              <div>
                <label className="text-xs font-semibold text-n800">Background Color</label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={form.bg || "#ffffff"} onChange={(e) => setForm({ ...form, bg: e.target.value })} data-testid="style-bg" className="w-12 h-10 rounded-lg border border-n200" />
                  <input value={form.bg} onChange={(e) => setForm({ ...form, bg: e.target.value })} placeholder="#FFF1E8 (blank = default)" className="flex-1 bg-n200/30 rounded-lg p-2.5 text-sm outline-none" />
                  {form.bg && <button onClick={() => setForm({ ...form, bg: "" })} className="text-xs text-n500">Clear</button>}
                </div>
              </div>
              <div className="flex items-center justify-between"><label className="text-xs font-semibold text-n800">Highlight Mode</label><button onClick={() => setForm({ ...form, highlight: !form.highlight })} data-testid="style-highlight" className={`px-4 py-2 rounded-lg text-sm font-bold ${form.highlight ? "bg-fx text-white" : "bg-n200 text-n800"}`}>{form.highlight ? "ON" : "OFF"}</button></div>
              <div>
                <label className="text-xs font-semibold text-n800">Card Style</label>
                <div className="flex gap-2 mt-1">{CARD_STYLES.map((c) => <button key={c.value} onClick={() => setForm({ ...form, cardStyle: c.value })} className={`px-3 py-2 rounded-lg text-sm font-bold ${form.cardStyle === c.value ? "bg-fx text-white" : "bg-n200/40 text-n800"}`}>{c.label}</button>)}</div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-n200"><button onClick={saveStyle} data-testid="style-save" className="w-full bg-fx text-white font-bold py-3 rounded-lg active:scale-95 transition-transform">Save Styling</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
