import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import api from "@/lib/api";
import ImageUpload from "@/components/ImageUpload";
import { toast } from "sonner";

/**
 * Generic admin CRUD table.
 * fields: [{ key, label, type: text|number|textarea|select|boolean|tags|image|json, options?, help? }]
 */
export default function CrudManager({ collection, title, fields, columns, defaults = {} }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", collection], queryFn: () => api.get(`/admin/${collection}`).then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (payload) => editing
      ? api.put(`/admin/${collection}/${editing.id}`, { data: payload })
      : api.post(`/admin/${collection}`, { data: payload }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", collection] }); setOpen(false); toast.success("Saved"); },
    onError: () => toast.error("Save failed"),
  });

  const del = useMutation({
    mutationFn: (id) => api.delete(`/admin/${collection}/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["sections"] }); toast.success("Deleted"); },
  });

  const openNew = () => { setEditing(null); setForm({ ...defaults }); setOpen(true); };
  const openEdit = (row) => {
    const f = { ...row };
    fields.forEach((fl) => { if (fl.type === "json" && typeof f[fl.key] === "object") f[fl.key] = JSON.stringify(f[fl.key], null, 2); });
    setEditing(row); setForm(f); setOpen(true);
  };

  const submit = () => {
    const payload = { ...form };
    fields.forEach((fl) => {
      if (fl.type === "number") payload[fl.key] = payload[fl.key] === "" || payload[fl.key] == null ? null : Number(payload[fl.key]);
      if (fl.type === "tags" && typeof payload[fl.key] === "string") payload[fl.key] = payload[fl.key].split(",").map((s) => s.trim()).filter(Boolean);
      if (fl.type === "json" && typeof payload[fl.key] === "string") { try { payload[fl.key] = JSON.parse(payload[fl.key] || "{}"); } catch { toast.error(`Invalid JSON in ${fl.label}`); throw new Error("bad json"); } }
      if (fl.type === "boolean") payload[fl.key] = !!payload[fl.key];
    });
    save.mutate(payload);
  };

  const cols = columns || fields.slice(0, 4).map((f) => ({ key: f.key, label: f.label }));

  return (
    <div data-testid={`crud-${collection}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl text-n900">{title}</h2>
        <button onClick={openNew} data-testid={`add-${collection}`} className="bg-fx text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1 active:scale-95 transition-transform"><Plus className="w-4 h-4" /> Add</button>
      </div>

      {isLoading ? <div className="fx-skeleton h-40 rounded-md" /> : (
        <div className="bg-white border border-n200 rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-n200 text-left text-xs text-n500 uppercase">
              {cols.map((c) => <th key={c.key} className="px-3 py-2 font-semibold whitespace-nowrap">{c.label}</th>)}
              <th className="px-3 py-2" />
            </tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-n200/60 hover:bg-n200/20" data-testid={`row-${row.id}`}>
                  {cols.map((c) => (
                    <td key={c.key} className="px-3 py-2 max-w-[180px] truncate">
                      {c.render ? c.render(row) : renderCell(row[c.key])}
                    </td>
                  ))}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button onClick={() => openEdit(row)} data-testid={`edit-${row.id}`} className="p-1.5 text-n500 hover:text-fx"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => { if (window.confirm("Delete this item?")) del.mutate(row.id); }} data-testid={`del-${row.id}`} className="p-1.5 text-n500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={cols.length + 1} className="px-3 py-8 text-center text-n500">No items yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} data-testid="crud-dialog">
            <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-3 border-b border-n200">
              <h3 className="font-display text-lg">{editing ? "Edit" : "Add"} {title}</h3>
              <button onClick={() => setOpen(false)} className="p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-n800">{f.label}</label>
                  {f.type === "textarea" || f.type === "json" ? (
                    <textarea value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} rows={f.type === "json" ? 6 : 3}
                      data-testid={`field-${f.key}`} className={`w-full mt-1 bg-n200/30 rounded-lg p-2.5 text-sm outline-none focus:ring-2 ring-fx ${f.type === "json" ? "font-mono text-xs" : ""}`} />
                  ) : f.type === "select" ? (
                    <select value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} data-testid={`field-${f.key}`} className="w-full mt-1 bg-n200/30 rounded-lg p-2.5 text-sm outline-none focus:ring-2 ring-fx">
                      <option value="">Select…</option>
                      {(typeof f.options === "function" ? f.options() : f.options).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : f.type === "boolean" ? (
                    <div className="mt-1"><button type="button" onClick={() => setForm({ ...form, [f.key]: !form[f.key] })} data-testid={`field-${f.key}`} className={`px-4 py-2 rounded-lg text-sm font-bold ${form[f.key] ? "bg-emerald-500 text-white" : "bg-n200 text-n800"}`}>{form[f.key] ? "Visible / Active" : "Hidden / Inactive"}</button></div>
                  ) : f.type === "image" ? (
                    <div className="mt-1"><ImageUpload value={form[f.key]} onChange={(url) => setForm({ ...form, [f.key]: url })} /></div>
                  ) : f.type === "tags" ? (
                    <input value={Array.isArray(form[f.key]) ? form[f.key].join(", ") : (form[f.key] ?? "")} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder="free, featured, flash" data-testid={`field-${f.key}`} className="w-full mt-1 bg-n200/30 rounded-lg p-2.5 text-sm outline-none focus:ring-2 ring-fx" />
                  ) : (
                    <input type={f.type === "number" ? "number" : "text"} value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} data-testid={`field-${f.key}`} className="w-full mt-1 bg-n200/30 rounded-lg p-2.5 text-sm outline-none focus:ring-2 ring-fx" />
                  )}
                  {f.help && <p className="text-[11px] text-n500 mt-0.5">{f.help}</p>}
                </div>
              ))}
            </div>
            <div className="sticky bottom-0 bg-white px-5 py-3 border-t border-n200">
              <button onClick={submit} disabled={save.isPending} data-testid="crud-save" className="w-full bg-fx text-white font-bold py-3 rounded-lg active:scale-95 transition-transform disabled:opacity-50">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderCell(v) {
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "✓" : "✗";
  if (typeof v === "object" && v !== null) return JSON.stringify(v).slice(0, 40);
  if (typeof v === "string" && v.startsWith("http")) return <img src={v} alt="" className="w-8 h-8 rounded object-cover" />;
  return String(v ?? "");
}
