// Lightweight Web Audio cues — no asset hosting required.
let _ctx;
function ctx() {
  if (!_ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    _ctx = new AC();
  }
  if (_ctx.state === "suspended") _ctx.resume().catch(() => {});
  return _ctx;
}

function tone(freq, start, dur, type = "sine", gain = 0.15) {
  const c = ctx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g); g.connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.02);
}

// Happy rising chime — customer order confirmation
export function playChime() {
  try { tone(523.25, 0, 0.18, "sine"); tone(659.25, 0.12, 0.18, "sine"); tone(783.99, 0.24, 0.3, "sine"); } catch (e) {}
}

// Attention ding-dong — admin new-order alert
export function playAlert() {
  try { tone(880, 0, 0.22, "triangle", 0.2); tone(1174.66, 0.18, 0.35, "triangle", 0.2); } catch (e) {}
}
