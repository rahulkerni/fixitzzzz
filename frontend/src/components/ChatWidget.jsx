import React, { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, RefreshCw, Wrench, Package, Tag, Sparkles } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const QUICK = [
  { topic: "sell", label: "Sell Phone", icon: RefreshCw, msg: "I want to sell my phone" },
  { topic: "repair", label: "Repair", icon: Wrench, msg: "My phone needs repair" },
  { topic: "order", label: "Track Order", icon: Package, msg: "Track my order" },
  { topic: "offers", label: "Offers", icon: Tag, msg: "What offers do you have?" },
];

function pageContext(path) {
  if (path.startsWith("/sell")) return "Sell Phone page";
  if (path.startsWith("/repair")) return "Repair page";
  if (path.startsWith("/cart")) return "Cart / Checkout page";
  if (path.startsWith("/shop") || path.startsWith("/product")) return "Shop page";
  if (path.startsWith("/buy")) return "Buy refurbished page";
  if (path.startsWith("/wallet")) return "Wallet page";
  return "Home page";
}

export default function ChatWidget() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef();

  const { data: messages = [] } = useQuery({ queryKey: ["chat"], queryFn: () => api.get("/chat/messages").then((r) => r.data), enabled: !!user && open, refetchInterval: open ? 6000 : false });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api.get("/settings").then((r) => r.data) });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open, busy]);

  const send = async (t, topic = "general") => {
    if (!user) { toast.error("Login to chat with FixitZ AI"); nav("/login"); setOpen(false); return; }
    const body = t || text;
    if (!body.trim() || busy) return;
    setText(""); setBusy(true);
    try {
      await api.post("/chat/ai", { text: body, topic, page: pageContext(pathname) });
      qc.invalidateQueries({ queryKey: ["chat"] });
    } catch { toast.error("Assistant unavailable, try again"); }
    setBusy(false);
  };

  const greeting = settings?.chatbot?.greeting || "Hi! 👋 How can FixitZ help you today?";

  return (
    <>
      <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1, type: "spring" }} onClick={() => setOpen(true)} data-testid="chat-fab"
        className="fixed z-40 bottom-28 right-4 md:right-[calc(50%-232px)] w-14 h-14 rounded-full bg-fx text-white shadow-xl shadow-orange-600/40 flex items-center justify-center active:scale-90 transition-transform">
        <MessageCircle className="w-6 h-6" />
        <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setOpen(false)}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 26 }} onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[480px] bg-n900 rounded-t-3xl h-[78vh] flex flex-col" data-testid="chat-panel">
              <div className="bg-gradient-to-br from-fx to-orange-600 p-4 rounded-t-3xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"><Sparkles className="w-5 h-5" /></div>
                  <div><p className="font-display text-lg leading-none">FixitZ AI</p><p className="text-[11px] text-white/80">Smart assistant · replies instantly</p></div>
                </div>
                <button onClick={() => setOpen(false)} className="text-white p-1"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {!messages.length && (
                  <div className="bg-white/10 text-white/90 px-3 py-2.5 rounded-2xl rounded-bl-sm text-sm max-w-[85%]">{greeting}</div>
                )}
                {messages.map((m) => (
                  <div key={m.id} data-testid={`chat-msg-${m.id}`}
                    className={`max-w-[82%] px-3 py-2 rounded-2xl text-sm ${m.sender === "user" ? "ml-auto bg-fx text-white rounded-br-sm" : m.sender === "admin" ? "bg-emerald-600 text-white rounded-bl-sm" : "bg-white/10 text-white/90 rounded-bl-sm"}`}>
                    {m.sender === "admin" && <span className="block text-[9px] text-white/70 mb-0.5">FixitZ Support</span>}
                    {m.text}
                  </div>
                ))}
                {busy && (
                  <div className="bg-white/10 px-3 py-3 rounded-2xl rounded-bl-sm w-16 flex gap-1" data-testid="chat-typing">
                    {[0, 1, 2].map((i) => <motion.span key={i} className="w-2 h-2 bg-white/70 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />)}
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <div className="p-3 border-t border-white/10">
                <div className="flex gap-2 overflow-x-auto no-scrollbar mb-2">
                  {QUICK.map((q) => (
                    <button key={q.topic} onClick={() => send(q.msg, q.topic)} data-testid={`chat-quick-${q.topic}`} className="whitespace-nowrap flex items-center gap-1 bg-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full active:scale-95 transition-transform"><q.icon className="w-3.5 h-3.5 text-fx" />{q.label}</button>
                  ))}
                </div>
                <div className="flex items-center gap-2 bg-white/10 rounded-full px-3">
                  <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask me anything…" data-testid="chat-input" className="flex-1 bg-transparent outline-none text-sm py-3 text-white placeholder:text-white/40" />
                  <button onClick={() => send()} disabled={busy} data-testid="chat-send" className="w-9 h-9 rounded-full bg-fx text-white flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"><Send className="w-4 h-4" /></button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
