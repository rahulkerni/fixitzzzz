import React, { useState } from "react";
import { UploadCloud, FileJson } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const EXAMPLE = JSON.stringify([
  { name: "iPhone 14", brand: "Apple", screen_price: 6500 },
  { name: "Galaxy S23", brand: "Samsung", screen_price: 5200 },
  { name: "Redmi Note 13", brand: "Xiaomi", screen_price: 1900 },
], null, 2);

export default function AdminRepairImport() {
  const [text, setText] = useState("");
  const [allowNew, setAllowNew] = useState(true);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const doImport = async () => {
    let rows;
    try { rows = JSON.parse(text); if (!Array.isArray(rows)) throw new Error(); }
    catch { toast.error("Invalid JSON — must be an array of rows"); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/admin/repair/bulk-import", { data: { rows, allow_new_brands: allowNew } });
      setResult(data);
      toast.success(`Imported ${data.created_models} models (${data.created_brands} new brands)`);
    } catch (e) { toast.error(e?.response?.data?.detail || "Import failed"); }
    setBusy(false);
  };

  return (
    <div data-testid="repair-import">
      <div className="bg-fx-light rounded-xl p-3 mb-4 text-sm text-n800">Paste JSON of models. Missing brands are auto-created. Battery / Speaker / Charging / Back auto-fill from the tier bands. Required per row: <b>name, brand, screen_price</b>.</div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} placeholder='[{"name":"iPhone 14","brand":"Apple","screen_price":6500}]' data-testid="import-json" className="w-full bg-white border border-n200 rounded-xl p-3 text-sm font-mono outline-none focus:ring-2 ring-fx" />
      <div className="flex flex-wrap items-center gap-3 mt-3">
        <button onClick={() => setText(EXAMPLE)} data-testid="import-example" className="bg-white border border-n200 text-n800 text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1"><FileJson className="w-4 h-4" /> Load example</button>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allowNew} onChange={(e) => setAllowNew(e.target.checked)} data-testid="import-allow-new" /> Allow new brands</label>
        <button onClick={doImport} disabled={busy} data-testid="import-run" className="bg-fx text-white text-sm font-bold px-5 py-2 rounded-lg flex items-center gap-1 disabled:opacity-50"><UploadCloud className="w-4 h-4" /> Import & auto-fill prices</button>
      </div>
      {result && (
        <div className="mt-4 bg-white border border-n200 rounded-xl p-4 text-sm" data-testid="import-result">
          <p className="font-bold text-emerald-600">✓ {result.created_models} models created · {result.created_brands} new brands</p>
          {result.skipped?.length > 0 && <div className="mt-2 text-red-500"><p className="font-semibold">{result.skipped.length} rows skipped:</p><ul className="list-disc ml-5">{result.skipped.map((s, i) => <li key={i}>Row {s.row}: {s.reason}</li>)}</ul></div>}
        </div>
      )}
    </div>
  );
}
