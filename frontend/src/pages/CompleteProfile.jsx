import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth, apiErr } from "@/context/AuthContext";
import { toast } from "sonner";

export default function CompleteProfile() {
  const nav = useNavigate();
  const { user, loading, completeProfile } = useAuth();
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav("/login", { replace: true }); return; }
    if (user.phone) { nav(user.role === "admin" ? "/admin" : "/", { replace: true }); }
  }, [user, loading, nav]);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(phone.trim())) { toast.error("Enter a valid 10-digit mobile number"); return; }
    setBusy(true);
    try {
      const u = await completeProfile(phone.trim());
      toast.success("Profile completed!");
      nav(u.role === "admin" ? "/admin" : "/", { replace: true });
    } catch (err) { toast.error(apiErr(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="fx-shell flex flex-col justify-center px-6" data-testid="complete-profile-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="w-14 h-14 rounded-2xl bg-fx flex items-center justify-center text-white font-display text-3xl mb-6">F</div>
        <h1 className="font-display text-3xl text-n900">One last step</h1>
        <p className="text-n500 text-sm mt-1">Add your mobile number so we can reach you for repairs & orders.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="numeric" placeholder="Mobile number (10 digits)" data-testid="cp-phone" className="w-full bg-white rounded-2xl p-4 text-sm outline-none focus:ring-2 ring-fx shadow-sm" />
          <button disabled={busy} type="submit" data-testid="cp-submit" className="w-full bg-fx text-white font-bold py-4 rounded-full active:scale-95 transition-transform disabled:opacity-50">{busy ? "Saving…" : "Continue"}</button>
        </form>
      </motion.div>
    </div>
  );
}
