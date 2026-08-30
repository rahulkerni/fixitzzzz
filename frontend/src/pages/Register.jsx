import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth, apiErr } from "@/context/AuthContext";
import { toast } from "sonner";

export default function Register() {
  const nav = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    if (!/^\d{10}$/.test(form.phone.trim())) { toast.error("Enter a valid 10-digit mobile number"); setBusy(false); return; }
    try {
      await register(form);
      toast.success("Account created!");
      nav("/");
    } catch (err) { toast.error(apiErr(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="fx-shell flex flex-col justify-center px-6 py-10" data-testid="register-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="w-14 h-14 rounded-2xl bg-fx flex items-center justify-center text-white font-display text-3xl mb-6">F</div>
        <h1 className="font-display text-3xl text-n900">Create account</h1>
        <p className="text-n500 text-sm mt-1">Join FixitZ — repairs, shop & more</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <input value={form.name} onChange={set("name")} required placeholder="Full name" data-testid="reg-name" className="w-full bg-white rounded-2xl p-4 text-sm outline-none focus:ring-2 ring-fx shadow-sm" />
          <input value={form.email} onChange={set("email")} type="email" required placeholder="Email (mandatory)" data-testid="reg-email" className="w-full bg-white rounded-2xl p-4 text-sm outline-none focus:ring-2 ring-fx shadow-sm" />
          <input value={form.phone} onChange={set("phone")} required inputMode="numeric" placeholder="Mobile number (10 digits, required)" data-testid="reg-phone" className="w-full bg-white rounded-2xl p-4 text-sm outline-none focus:ring-2 ring-fx shadow-sm" />
          <input value={form.password} onChange={set("password")} type="password" required placeholder="Password" data-testid="reg-password" className="w-full bg-white rounded-2xl p-4 text-sm outline-none focus:ring-2 ring-fx shadow-sm" />
          <button disabled={busy} type="submit" data-testid="reg-submit" className="w-full bg-fx text-white font-bold py-4 rounded-full active:scale-95 transition-transform disabled:opacity-50">{busy ? "Creating…" : "Sign Up"}</button>
        </form>
        <p className="text-center text-sm text-n500 mt-6">Have an account? <Link to="/login" className="text-fx font-bold" data-testid="go-login">Login</Link></p>
      </motion.div>
    </div>
  );
}
