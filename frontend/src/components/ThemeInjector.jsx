import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

const OVERRIDE = `
.bg-fx{background-color:var(--fx-primary)!important}
.text-fx{color:var(--fx-primary)!important}
.bg-fx-light{background-color:var(--fx-primary-light)!important}
.border-fx{border-color:var(--fx-primary)!important}
.ring-fx{--tw-ring-color:var(--fx-primary)!important}
.fill-fx{fill:var(--fx-primary)!important}
`;

function hexTint(hex, amt) {
  try {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    const mix = (c) => Math.round(c + (255 - c) * amt);
    return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
  } catch { return "#FFF0EC"; }
}

export default function ThemeInjector() {
  const { data: s } = useQuery({ queryKey: ["settings"], queryFn: () => api.get("/settings").then((r) => r.data) });
  useEffect(() => {
    if (!document.getElementById("fx-theme-override")) {
      const el = document.createElement("style");
      el.id = "fx-theme-override";
      el.innerHTML = OVERRIDE;
      document.head.appendChild(el);
    }
    const root = document.documentElement.style;
    if (s?.primaryColor) {
      root.setProperty("--fx-primary", s.primaryColor);
      root.setProperty("--fx-primary-light", hexTint(s.primaryColor, 0.9));
    }
    if (s?.accentColor) root.setProperty("--fx-primary-hover", s.accentColor);
    if (s?.pageBg) { root.setProperty("--fx-bg", s.pageBg); document.body.style.background = s.pageBg; }
  }, [s]);
  return null;
}
