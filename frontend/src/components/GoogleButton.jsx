import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useAuth, apiErr } from "@/context/AuthContext";
import { toast } from "sonner";

export const GoogleButton = ({ label = "Continue with Google" }) => {
  const nav = useNavigate();
  const { loginFirebase } = useAuth();
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const idToken = await res.user.getIdToken();
      const u = await loginFirebase(idToken);
      toast.success(`Welcome, ${u.name || "back"}!`);
      if (!u.phone) { nav("/complete-profile", { replace: true }); return; }
      nav(u.role === "admin" ? "/admin" : "/", { replace: true });
    } catch (err) {
      const code = err?.code || "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        /* user closed the popup — ignore */
      } else if (code === "auth/unauthorized-domain") {
        toast.error("This domain isn't authorized in Firebase. Add it under Authentication → Settings → Authorized domains.");
      } else {
        toast.error(apiErr(err) || err?.message || "Google sign-in failed");
      }
    } finally { setBusy(false); }
  };

  return (
    <button
      type="button"
      onClick={start}
      disabled={busy}
      data-testid="google-signin-btn"
      className="w-full bg-white border border-n200 text-n900 font-semibold py-4 rounded-full flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-sm disabled:opacity-60"
    >
      <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
      </svg>
      {busy ? "Signing in…" : label}
    </button>
  );
};
