import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth, apiErr } from "@/context/AuthContext";
import { GoogleButton } from "@/components/GoogleButton";
import { toast } from "sonner";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(email, password);
      toast.success("Welcome back!");
      nav(u.role === "admin" ? "/admin" : "/");
    } catch (err) { toast.error(apiErr(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="fx-shell flex flex-col justify-center px-6" data-testid="login-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="w-14 h-14 rounded-2xl bg-fx flex items-center justify-center text-white font-display text-3xl mb-6">F</div>
        <h1 className="font-display text-3xl text-n900">Welcome back</h1>
        <p className="text-n500 text-sm mt-1">Login to FixitZ · Jammu</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="Email" data-testid="login-email" className="w-full bg-white rounded-2xl p-4 text-sm outline-none focus:ring-2 ring-fx shadow-sm" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required placeholder="Password" data-testid="login-password" className="w-full bg-white rounded-2xl p-4 text-sm outline-none focus:ring-2 ring-fx shadow-sm" />
          <button disabled={busy} type="submit" data-testid="login-submit" className="w-full bg-fx text-white font-bold py-4 rounded-full active:scale-95 transition-transform disabled:opacity-50">{busy ? "Logging in…" : "Login"}</button>
        </form>
        <div className="flex items-center gap-3 my-6">
          <div className="h-px flex-1 bg-n200" />
          <span className="text-xs text-n400">or</span>
          <div className="h-px flex-1 bg-n200" />
        </div>
        <GoogleButton />
        <p className="text-center text-sm text-n500 mt-6">New here? <Link to="/register" className="text-fx font-bold" data-testid="go-register">Create account</Link></p>
      </motion.div>
    </div>
  );
}
