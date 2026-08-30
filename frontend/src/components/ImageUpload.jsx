import React, { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function ImageUpload({ value, onChange, className = "" }) {
  const ref = useRef();
  const [busy, setBusy] = useState(false);

  const pick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const { data } = await api.post("/admin/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      onChange(`${BACKEND}${data.url}`);
      toast.success("Image uploaded");
    } catch { toast.error("Upload failed"); }
    setBusy(false);
    e.target.value = "";
  };

  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid="image-upload">
      {value ? <img src={value} alt="" className="w-14 h-14 rounded-lg object-cover border border-n200 shrink-0" />
        : <div className="w-14 h-14 rounded-lg bg-n200/40 flex items-center justify-center text-n500 text-[10px] shrink-0">No img</div>}
      <input ref={ref} type="file" accept="image/*" onChange={pick} className="hidden" data-testid="image-upload-input" />
      <button type="button" onClick={() => ref.current.click()} disabled={busy} data-testid="image-upload-btn"
        className="bg-n900 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 active:scale-95 transition-transform disabled:opacity-50">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}{value ? "Change" : "Upload"}
      </button>
      {value && <button type="button" onClick={() => onChange("")} className="text-xs text-red-500 font-semibold">Remove</button>}
    </div>
  );
}
