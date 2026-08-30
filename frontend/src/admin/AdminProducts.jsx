import React, { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import CrudManager from "@/admin/CrudManager";
import api from "@/lib/api";
import { toast } from "sonner";

const REQUIRED = ["name", "price"];

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row = {};
    headers.forEach((h, i) => { row[h] = (cells[i] || "").trim(); });
    return row;
  });
  return { headers, rows };
}

function rowErrors(row) {
  const errs = [];
  if (!row.name) errs.push("missing name");
  if (row.price === undefined || row.price === "" || isNaN(Number(row.price))) errs.push("invalid price");
  if (row.stock && isNaN(Number(row.stock))) errs.push("invalid stock");
  return errs;
}

export default function AdminProducts() {
  const qc = useQueryClient();
  const fileRef = useRef();
  const [preview, setPreview] = useState(null); // { file, headers, rows }
  const [importing, setImporting] = useState(false);
  const { data: cats = [] } = useQuery({ queryKey: ["cats"], queryFn: () => api.get("/categories").then((r) => r.data) });
  const catOptions = () => cats.map((c) => ({ value: c.id, label: c.name }));

  const onFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const { headers, rows } = parseCSV(text);
    setPreview({ file, headers, rows });
    e.target.value = "";
  };

  const validCount = preview ? preview.rows.filter((r) => rowErrors(r).length === 0).length : 0;
  const errorCount = preview ? preview.rows.length - validCount : 0;

  const confirmImport = async () => {
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", preview.file);
      const { data } = await api.post("/admin/products/bulk", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`${data.inserted} products imported`);
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      setPreview(null);
    } catch { toast.error("Import failed"); }
    setImporting(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-sm text-n500">Add products, mark as free/featured/flash, or bulk import via CSV with preview.</p>
        <div>
          <input ref={fileRef} type="file" accept=".csv" onChange={onFile} className="hidden" data-testid="csv-input" />
          <button onClick={() => fileRef.current.click()} data-testid="csv-upload-btn" className="bg-n900 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1"><Upload className="w-4 h-4" /> Bulk CSV</button>
        </div>
      </div>
      <p className="text-[11px] text-n500 mb-3">CSV headers: name, description, price, mrp, category_id, image, stock, tags (pipe-separated e.g. free|featured)</p>

      <CrudManager
        collection="products"
        title="Product"
        defaults={{ active: true, tags: [], stock: 10, price: 0, mrp: 0 }}
        columns={[
          { key: "image", label: "" }, { key: "name", label: "Name" },
          { key: "price", label: "Price" }, { key: "tags", label: "Tags" }, { key: "stock", label: "Stock" },
        ]}
        fields={[
          { key: "name", label: "Name", type: "text" },
          { key: "description", label: "Description", type: "textarea" },
          { key: "price", label: "Price (₹, 0 = free)", type: "number" },
          { key: "mrp", label: "MRP (₹)", type: "number" },
          { key: "category_id", label: "Category", type: "select", options: catOptions },
          { key: "image", label: "Image", type: "image" },
          { key: "stock", label: "Stock", type: "number" },
          { key: "tags", label: "Tags", type: "tags", help: "free, featured, flash" },
          { key: "active", label: "Active", type: "boolean" },
        ]}
      />

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()} data-testid="csv-preview-dialog">
            <div className="flex items-center justify-between px-5 py-3 border-b border-n200">
              <h3 className="font-display text-lg">CSV Preview</h3>
              <button onClick={() => setPreview(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="px-5 py-2 flex gap-4 text-sm border-b border-n200">
              <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-4 h-4" /> {validCount} valid</span>
              {errorCount > 0 && <span className="flex items-center gap-1 text-red-500"><AlertTriangle className="w-4 h-4" /> {errorCount} with errors</span>}
            </div>
            <div className="flex-1 overflow-auto p-3">
              <table className="w-full text-xs">
                <thead><tr className="text-left text-n500 border-b border-n200">
                  <th className="px-2 py-1">Status</th>
                  {preview.headers.map((h) => <th key={h} className="px-2 py-1">{h}</th>)}
                </tr></thead>
                <tbody>
                  {preview.rows.map((r, i) => {
                    const errs = rowErrors(r);
                    return (
                      <tr key={i} className={`border-b border-n200/60 ${errs.length ? "bg-red-50" : ""}`} data-testid={`csv-row-${i}`}>
                        <td className="px-2 py-1 whitespace-nowrap">{errs.length ? <span className="text-red-500 font-semibold">{errs.join(", ")}</span> : <span className="text-emerald-600">OK</span>}</td>
                        {preview.headers.map((h) => <td key={h} className="px-2 py-1 max-w-[140px] truncate">{r[h]}</td>)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-n200 flex items-center justify-between">
              <span className="text-xs text-n500">Only valid rows (name + numeric price) will be imported.</span>
              <button onClick={confirmImport} disabled={importing || !validCount} data-testid="csv-confirm" className="bg-fx text-white font-bold px-6 py-2.5 rounded-lg active:scale-95 transition-transform disabled:opacity-40">{importing ? "Importing…" : `Import ${validCount} Products`}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
