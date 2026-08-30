import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, Send, Phone } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function AdminPriceRequests() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState({});
  const { data: rows = [] } = useQuery({ queryKey: ["price-requests"], queryFn: () => api.get("/admin/price-requests").then((r) => r.data), refetchInterval: 10000 });

  const set = (id, k, v) => setDraft((d) => ({ ...d, [id]: { ...d[id], [k]: v } }));

  const sendQuote = async (r) => {
    const d = draft[r.id] || {};
    await api.put(`/admin/price-requests/${r.id}`, { data: { quote: d.quote ? Number(d.quote) : r.quote, reply: d.reply ?? r.reply, status: "quoted" } });
    qc.invalidateQueries({ queryKey: ["price-requests"] });
    toast.success("Quote sent to customer");
  };
  const close = async (r) => {
    await api.put(`/admin/price-requests/${r.id}`, { data: { status: "closed" } });
    qc.invalidateQueries({ queryKey: ["price-requests"] });
    toast.success("Marked closed");
  };

  const badge = { new: "bg-fx text-white", quoted: "bg-emerald-100 text-emerald-700", closed: "bg-n200 text-n500" };

  return (
    <div data-testid="admin-price-requests">
      <h1 className="font-display text-3xl text-n900 mb-1 flex items-center gap-2"><Inbox className="w-7 h-7 text-fx" /> Price Requests</h1>
      <p className="text-sm text-n500 mb-5">Customers who couldn't find their model. Send a quote (also texts them) or close.</p>
      {!rows.length && <p className="text-n500 text-sm">No price requests yet.</p>}
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className={`bg-white border rounded-xl p-4 ${r.urgent && r.status === "new" ? "border-fx" : "border-n200"}`} data-testid={`pr-${r.id}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-display text-lg">{r.brand ? `${r.brand} ` : ""}{r.model}</span>
                {r.urgent && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">URGENT</span>}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge[r.status] || "bg-n200"}`}>{r.status.toUpperCase()}</span>
              </div>
              <span className="text-[11px] text-n500 uppercase">{r.type}</span>
            </div>
            <p className="text-sm text-n800 flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-fx" /> {r.phone}</p>
            {r.fault && <p className="text-sm text-n500 mt-0.5">Fault: {r.fault}</p>}
            {r.status !== "closed" && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <input type="number" defaultValue={r.quote ?? ""} onChange={(e) => set(r.id, "quote", e.target.value)} placeholder="Quote ₹" data-testid={`pr-quote-${r.id}`} className="w-24 bg-n200/30 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 ring-fx" />
                <input defaultValue={r.reply ?? ""} onChange={(e) => set(r.id, "reply", e.target.value)} placeholder="Message (optional)" data-testid={`pr-reply-${r.id}`} className="flex-1 min-w-[140px] bg-n200/30 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 ring-fx" />
                <button onClick={() => sendQuote(r)} data-testid={`pr-send-${r.id}`} className="bg-fx text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1"><Send className="w-3.5 h-3.5" /> Send</button>
                <button onClick={() => close(r)} data-testid={`pr-close-${r.id}`} className="bg-n200/50 text-n800 text-xs font-bold px-3 py-2 rounded-lg">Close</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
