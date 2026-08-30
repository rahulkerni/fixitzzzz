import React, { useEffect, useState } from "react";

function playWhoosh() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(110, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(920, ctx.currentTime + 0.5);
    o.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 1.1);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 1.25);
  } catch (e) { /* blocked */ }
}

export default function Splash() {
  const [show, setShow] = useState(() => !sessionStorage.getItem("fx_splash"));

  useEffect(() => {
    if (!show) return;
    sessionStorage.setItem("fx_splash", "1");
    // try immediately (may be blocked), and also fire on the first user gesture
    playWhoosh();
    let played = false;
    const fire = () => { if (!played) { played = true; playWhoosh(); } };
    window.addEventListener("pointerdown", fire, { once: true });
    window.addEventListener("keydown", fire, { once: true });
    window.addEventListener("touchstart", fire, { once: true });
    const t = setTimeout(() => setShow(false), 2400);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointerdown", fire);
      window.removeEventListener("keydown", fire);
      window.removeEventListener("touchstart", fire);
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-n900 flex items-center justify-center overflow-hidden" data-testid="splash-screen" onClick={() => { playWhoosh(); setShow(false); }}>
      {Array.from({ length: 14 }).map((_, i) => (
        <span key={i} className="absolute h-[3px] rounded-full" style={{ top: `${8 + i * 6}%`, left: 0, right: 0, background: "linear-gradient(90deg,transparent,#EE4D2D,transparent)", animation: `fx-speed ${0.7 + (i % 5) * 0.12}s ${i * 0.05}s ease-in` }} />
      ))}
      <div className="relative text-center" style={{ animation: "fx-pop .55s ease-out both" }}>
        <div className="w-24 h-24 mx-auto rounded-3xl bg-fx flex items-center justify-center text-white font-display text-5xl shadow-2xl shadow-orange-600/50">F</div>
        <h1 className="font-display text-4xl text-white mt-4 tracking-tight">FixitZ</h1>
        <p className="text-fx text-sm font-semibold mt-1">30-Min Doorstep Repair · Jammu</p>
        <p className="text-white/40 text-[11px] mt-4">tap to enter · 🔊</p>
      </div>
    </div>
  );
}
