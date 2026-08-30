import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, User } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function AdminChat() {
  const qc = useQueryClient();
  const [active, setActive] = useState(null);
  const [text, setText] = useState("");
  const { data: threads = [] } = useQuery({ queryKey: ["admin-chat"], queryFn: () => api.get("/admin/chat").then((r) => r.data), refetchInterval: 5000 });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api.get("/settings").then((r) => r.data) });
  const [greeting, setGreeting] = useState("");
  const [faqs, setFaqs] = useState("");
  useEffect(() => {
    if (settings?.chatbot) {
      setGreeting(settings.chatbot.greeting || "");
      setFaqs((settings.chatbot.faqs || []).map((f) => `${f.q} :: ${f.a}`).join("\n"));
    }
  }, [settings]);
  const current = threads.find((t) => t.userId === active) || threads[0];

  const reply = useMutation({
    mutationFn: (payload) => api.post("/admin/chat/reply", payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-chat"] }); setText(""); toast.success("Reply sent"); },
  });

  const saveBot = async () => {
    const parsed = faqs.split("\n").map((l) => l.split("::")).filter((p) => p[0]?.trim()).map((p) => ({ q: (p[0] || "").trim(), a: (p[1] || "").trim() }));
    await api.put("/admin/settings", { chatbot: { greeting, faqs: parsed } });
    qc.invalidateQueries({ queryKey: ["settings"] });
    toast.success("Chatbot settings saved");
  };

  return (
    <div data-testid="admin-chat">
      <h1 className="font-display text-3xl text-n900 mb-1">Chat Support</h1>
      <p className="text-sm text-n500 mb-4">FixitZ AI answers automatically. Set the greeting & FAQs below, or take over any conversation manually.</p>

      <div className="bg-white border border-n200 rounded-xl p-4 mb-5 max-w-3xl" data-testid="bot-settings">
        <p className="font-semibold text-sm mb-2">🤖 AI Chatbot Settings</p>
        <label className="text-xs font-semibold text-n800">Greeting message</label>
        <input value={greeting} onChange={(e) => setGreeting(e.target.value)} data-testid="bot-greeting" className="w-full mt-1 mb-3 bg-n200/30 rounded-lg p-2.5 text-sm outline-none focus:ring-2 ring-fx" />
        <label className="text-xs font-semibold text-n800">Custom FAQs (one per line, format: question :: answer)</label>
        <textarea value={faqs} onChange={(e) => setFaqs(e.target.value)} rows={4} data-testid="bot-faqs" placeholder="Do you repair in Jammu? :: Yes, 30-min doorstep across Jammu." className="w-full mt-1 bg-n200/30 rounded-lg p-2.5 text-sm outline-none focus:ring-2 ring-fx font-mono text-xs" />
        <button onClick={saveBot} data-testid="bot-save" className="mt-3 bg-fx text-white font-bold px-5 py-2.5 rounded-lg active:scale-95 transition-transform">Save Chatbot</button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white border border-n200 rounded-xl overflow-hidden max-h-[70vh] overflow-y-auto">
          {threads.map((t) => (
            <button key={t.userId} onClick={() => setActive(t.userId)} data-testid={`thread-${t.userId}`}
              className={`w-full text-left p-3 border-b border-n200/60 flex items-center gap-2 ${current?.userId === t.userId ? "bg-fx-light" : ""}`}>
              <div className="w-8 h-8 rounded-full bg-fx-light flex items-center justify-center"><User className="w-4 h-4 text-fx" /></div>
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{t.userName || "User"}</p><p className="text-[11px] text-n500 truncate">{t.messages[t.messages.length - 1]?.text}</p></div>
            </button>
          ))}
          {!threads.length && <p className="p-4 text-sm text-n500">No conversations yet</p>}
        </div>

        <div className="md:col-span-2 bg-white border border-n200 rounded-xl flex flex-col h-[70vh]">
          {current ? (
            <>
              <div className="p-3 border-b border-n200 font-semibold text-sm">{current.userName || "User"}</div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#F8F7F5]">
                {current.messages.map((m) => (
                  <div key={m.id} className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.sender === "user" ? "bg-white shadow-sm" : m.sender === "admin" ? "ml-auto bg-fx text-white" : "ml-auto bg-n200 text-n800"}`}>
                    {m.text}<span className="block text-[9px] opacity-60 mt-0.5">{m.sender}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-n200 flex items-center gap-2">
                <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && text.trim() && reply.mutate({ userId: current.userId, text })} placeholder="Type a reply…" data-testid="admin-chat-input" className="flex-1 bg-n200/30 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-fx" />
                <button onClick={() => text.trim() && reply.mutate({ userId: current.userId, text })} data-testid="admin-chat-send" className="w-10 h-10 rounded-lg bg-fx text-white flex items-center justify-center"><Send className="w-4 h-4" /></button>
              </div>
            </>
          ) : <div className="flex-1 flex items-center justify-center text-n500 text-sm">Select a conversation</div>}
        </div>
      </div>
    </div>
  );
}
