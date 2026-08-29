import React, { useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import CrudManager from "@/admin/CrudManager";
import api from "@/lib/api";
import { toast } from "sonner";

export default function AdminProducts() {
  const qc = useQueryClient();
  const fileRef = useRef();
  const { data: cats = [] } = useQuery({ queryKey: ["cats"], queryFn: () => api.get("/categories").then((r) => r.data) });
  const catOptions = () => cats.map((c) => ({ value: c.id, label: c.name }));

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post("/admin/products/bulk", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`${data.inserted} products imported`);
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
    } catch { toast.error("Upload failed"); }
    e.target.value = "";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-sm text-n500">Add products, mark as free/featured/flash, or bulk import via CSV.</p>
        <div>
          <input ref={fileRef} type="file" accept=".csv" onChange={upload} className="hidden" data-testid="csv-input" />
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
          { key: "image", label: "Image URL", type: "text" },
          { key: "stock", label: "Stock", type: "number" },
          { key: "tags", label: "Tags", type: "tags", help: "free, featured, flash" },
          { key: "active", label: "Active", type: "boolean" },
        ]}
      />
    </div>
  );
}
