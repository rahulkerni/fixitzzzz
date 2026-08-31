import React, { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Bot, Send, Loader2, Sparkles } from "lucide-react";
import api from "@/lib/api";

const SUGGESTIONS = [
  "Add a product called Tempered Glass for ₹149",
  "Change the tagline to 'Fixed in 30 minutes'",
  "Create a coupon SAVE10 for 10% off min order 500",
  "Make the theme primary color #1E88E5",
  "Show me today's stats",
];

export default function AdminAI() {
  const qc = useQueryClient();
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi! I'm your FixitZ Admin Assistant. Tell me what to do — add products, change prices, create coupons, edit the theme/header, run flash sales, send emails, or ask for stats." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const { data } = await api.post("/admin/ai", { text: q });
      const done = data.result && !data.result.error && data.action !== "answer" && data.action !== "error";
      setMessages((m) => [...m, { role: "bot", text: data.message, action: data.action, result: data.result, done }]);
      // refresh admin data so changes reflect across the panel
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["sections"] });
    } catch {
      setMessages((m) => [...m, { role: "bot", text: "Something went wrong. Please try again." }]);
    }
    setBusy(false);
  };

  return (
    <div className="max-w-2xl" data-testid="admin-ai">
      <h1 className="font-display text-3xl text-n900 mb-1 flex items-center gap-2"><Bot className="w-7 h-7 text-fx" /> AI Assistant</h1>
      <p className="text-sm text-n500 mb-4">Run your store with plain English. It acts through the same safe controls as this panel.</p>

      <div className="bg-white border border-n200 rounded-2xl p-4 h-[52vh] overflow-y-auto space-y-3" data-testid="ai-messages">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === "user" ? "bg-fx text-white" : "bg-n200/40 text-n900"}`} data-testid={`ai-msg-${m.role}`}>
              {m.text}
              {m.done && <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600"><Sparkles className="w-3 h-3" /> Applied</div>}
              {m.result?.error && <div className="mt-1.5 text-[11px] text-red-500">⚠ {m.result.error}</div>}
              {m.action === "stats" && m.result && (
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>Products: <b>{m.result.products}</b></div>
                  <div>Orders: <b>{m.result.orders}</b></div>
                  <div>Users: <b>{m.result.users}</b></div>
                  <div>Revenue: <b>₹{m.result.revenue}</b></div>
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && <div className="flex justify-start"><div className="bg-n200/40 rounded-2xl px-3.5 py-2.5"><Loader2 className="w-4 h-4 animate-spin text-fx" /></div></div>}
        <div ref={endRef} />
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {SUGGESTIONS.map((s, i) => (
          <button key={i} onClick={() => send(s)} disabled={busy} data-testid={`ai-suggest-${i}`} className="text-xs bg-white border border-n200 text-n700 px-3 py-1.5 rounded-full hover:border-fx active:scale-95 transition-all">{s}</button>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Tell the assistant what to do…" data-testid="ai-input" className="flex-1 bg-white border border-n200 rounded-full px-4 py-3 text-sm outline-none focus:ring-2 ring-fx" />
        <button onClick={() => send()} disabled={busy} data-testid="ai-send" className="w-12 h-12 rounded-full bg-fx text-white flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"><Send className="w-5 h-5" /></button>
      </div>
    </div>
  );
}
