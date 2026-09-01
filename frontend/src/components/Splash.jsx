import React, { useEffect, useState } from "react";

function playWhoosh() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    if (ctx.state === "suspended") ctx.resume();
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
  } catch (e) { /* autoplay blocked until a gesture */ }
}

export default function Splash() {
  const [show, setShow] = useState(() => !sessionStorage.getItem("fx_splash"));

  useEffect(() => {
    if (!show) return;
    sessionStorage.setItem("fx_splash", "1");
    playWhoosh();
    let played = false;
    const fire = () => { if (!played) { played = true; playWhoosh(); } };
    const evs = ["pointerdown", "keydown", "touchstart"];
    evs.forEach((e) => window.addEventListener(e, fire, { once: true }));
    const t = setTimeout(() => setShow(false), 2600);
    return () => { clearTimeout(t); evs.forEach((e) => window.removeEventListener(e, fire)); };
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden" data-testid="splash-screen"
      onClick={() => { playWhoosh(); setShow(false); }}
      style={{ background: "radial-gradient(circle at 50% 38%, #2a1206 0%, #140904 55%, #090402 100%)" }}>

      <div className="absolute inset-0 opacity-[0.13]" style={{ backgroundImage: "radial-gradient(#EE4D2D 1px, transparent 1px)", backgroundSize: "26px 26px" }} />

      {[0, 1, 2].map((r) => (
        <div key={r} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-fx/20"
          style={{ width: `${190 + r * 96}px`, height: `${190 + r * 96}px`, animation: `fx-spin ${9 + r * 4}s linear infinite ${r % 2 ? "reverse" : ""}` }}>
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-fx" style={{ boxShadow: "0 0 14px #EE4D2D" }} />
        </div>
      ))}

      <div className="relative z-10 text-center px-6" style={{ animation: "fx-pop .6s ease-out both" }}>
        <div className="relative w-28 h-28 mx-auto">
          <div className="absolute inset-0 rounded-[26px] bg-fx blur-2xl" style={{ animation: "fx-logoglow 1.8s ease-in-out infinite" }} />
          <div className="relative w-28 h-28 rounded-[26px] bg-gradient-to-br from-fx to-orange-600 flex items-center justify-center text-white font-display text-6xl shadow-2xl overflow-hidden">
            F
            <span className="absolute inset-0" style={{ background: "linear-gradient(115deg,transparent 30%,rgba(255,255,255,.55) 50%,transparent 70%)", animation: "fx-shimmer 2.4s ease-in-out infinite" }} />
          </div>
        </div>

        <h1 className="font-display text-5xl mt-6 tracking-tight text-transparent bg-clip-text"
          style={{ backgroundImage: "linear-gradient(90deg,#ffffff,#EE4D2D,#ffffff)", backgroundSize: "200% auto", animation: "fx-textshine 3s linear infinite" }}>FixitZ</h1>
        <p className="text-white/70 text-sm font-semibold mt-1.5">30-Min Doorstep Repair · Jammu</p>

        <div className="mt-6 flex items-center justify-center gap-2 text-fx/90 text-[11px] font-semibold tracking-[0.25em] uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-fx" style={{ animation: "fx-blink 1s infinite" }} />
          Powered by AI · tap to enter
        </div>
      </div>
    </div>
  );
}
