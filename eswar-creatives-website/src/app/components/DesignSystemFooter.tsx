const MONO = "'IBM Plex Mono', monospace";
const SANS = "'IBM Plex Sans', system-ui, sans-serif";

const C = {
  bg:       "#0a0c0f",
  surface2: "#181b22",
  border:   "rgba(255,255,255,0.07)",
  border2:  "rgba(255,255,255,0.12)",
  text:     "#e8eaf0",
  muted:    "#7a8090",
  dim:      "#767c8a",
  teal:     "#00C4A1",
  tealDim:  "rgba(0,196,161,0.12)",
  green:    "#22c55e",
  greenDim: "rgba(34,197,94,0.12)",
  amber:    "#f59e0b",
  amberDim: "rgba(245,158,11,0.12)",
  blue:     "#3b82f6",
  blueDim:  "rgba(59,130,246,0.12)",
};

const SWATCH_STRIP = [
  "#6b7280", "#9ca3af", "#00C4A1", "#22c55e",
  "#eab308", "#f97316", "#ef4444", "#3b82f6",
  "#f43f5e", "#8b5cf6", "#06b6d4",
];

const STATS = [
  { val: "220",     key: "Design tokens" },
  { val: "11",      key: "Color palettes" },
  { val: "19",      key: "Steps per palette" },
  { val: "3",       key: "Token layers" },
  { val: "V2.1",    key: "Current version" },
  { val: "WCAG AA", key: "Compliance level" },
];

const TOKEN_LAYERS = [
  { color: "#6b7280",  name: "Primitive",  desc: "Raw values. No meaning.",          count: "~80" },
  { color: C.teal,     name: "Semantic",   desc: "Intent layer. What it means.",      count: "~90" },
  { color: C.blue,     name: "Component",  desc: "Leaf tokens. Component-owned.",     count: "~50" },
];

const PALETTES = [
  { label: "Neutral",    count: 19, swatches: ["#f9fafb","#f3f4f6","#e5e7eb","#d1d5db","#9ca3af","#6b7280","#4b5563","#374151","#1f2937","#111827"] },
  { label: "Primary",    count: 19, swatches: ["#f0fdfa","#ccfbf1","#99f6e4","#5eead4","#2dd4bf","#00C4A1","#0d9488","#0f766e","#115e59","#134e4a"] },
  { label: "Success",    count: 19, swatches: ["#f0fdf4","#dcfce7","#bbf7d0","#86efac","#4ade80","#22c55e","#16a34a","#15803d","#166534","#14532d"] },
  { label: "Alert",      count: 19, swatches: ["#fefce8","#fef9c3","#fef08a","#fde047","#facc15","#eab308","#ca8a04","#a16207","#854d0e","#713f12"] },
  { label: "Warning",    count: 19, swatches: ["#fff7ed","#ffedd5","#fed7aa","#fdba74","#fb923c","#f97316","#ea580c","#c2410c","#9a3412","#7c2d12"] },
  { label: "Danger",     count: 19, swatches: ["#fef2f2","#fee2e2","#fecaca","#fca5a5","#f87171","#ef4444","#dc2626","#b91c1c","#991b1b","#7f1d1d"] },
  { label: "Sys-Blue",   count: 19, swatches: ["#eff6ff","#dbeafe","#bfdbfe","#93c5fd","#60a5fa","#3b82f6","#2563eb","#1d4ed8","#1e40af","#1e3a8a"] },
  { label: "Spl-Rose",   count: 19, swatches: ["#fff1f2","#ffe4e6","#fecdd3","#fda4af","#fb7185","#f43f5e","#e11d48","#be123c","#9f1239","#881337"] },
  { label: "Spl-Violet", count: 19, swatches: ["#f5f3ff","#ede9fe","#ddd6fe","#c4b5fd","#a78bfa","#8b5cf6","#7c3aed","#6d28d9","#5b21b6","#4c1d95"] },
  { label: "Spl-Cyan",   count: 19, swatches: ["#ecfeff","#cffafe","#a5f3fc","#67e8f9","#22d3ee","#06b6d4","#0891b2","#0e7490","#155e75","#164e63"] },
];

const BADGES = [
  { label: "WCAG AA Passed", bg: C.greenDim, color: C.green, border: "rgba(34,197,94,0.2)"  },
  { label: "Cross-platform",  bg: C.amberDim, color: C.amber, border: "rgba(245,158,11,0.2)" },
  { label: "Tokens Studio",   bg: C.blueDim,  color: C.blue,  border: "rgba(59,130,246,0.2)" },
];

const BOTTOM_LINKS = [
  { label: "Portfolio",   href: "/work" },
  { label: "Services",    href: "/services" },
  { label: "About",       href: "/about" },
  { label: "LinkedIn ↗",  href: "https://linkedin.com/in/eswaruxui", external: true },
];

function Eyebrow({ label }: { label: string }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: C.dim, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
      {label}
      <span style={{ flex: 1, height: 1, background: C.border, display: "block" }} />
    </div>
  );
}

export function DesignSystemFooter() {
  return (
    <footer style={{ background: C.bg, fontFamily: SANS, color: C.text, borderTop: `1px solid ${C.border2}` }}>

      {/* Token swatch strip */}
      <div style={{ display: "flex", height: 4, overflow: "hidden" }}>
        {SWATCH_STRIP.map((color) => (
          <span key={color} style={{ flex: 1, display: "block", background: color }} />
        ))}
      </div>

      {/* Stats bar */}
      <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${C.border}`, overflowX: "auto" as const }}>
        {STATS.map((s, i) => (
          <div
            key={s.key}
            style={{
              flex: 1, minWidth: 120, padding: "20px 28px",
              borderRight: i < STATS.length - 1 ? `1px solid ${C.border}` : "none",
              display: "flex", flexDirection: "column" as const, gap: 4,
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: C.teal, letterSpacing: "-0.02em", lineHeight: 1 }}>{s.val}</span>
            <span style={{ fontSize: 11, color: C.muted, letterSpacing: "0.06em", textTransform: "uppercase" as const, fontWeight: 500 }}>{s.key}</span>
          </div>
        ))}
      </div>

      {/* Main 3-col body */}
      <div
        className="grid grid-cols-1 md:grid-cols-3"
        style={{ borderBottom: `1px solid ${C.border}` }}
      >
        {/* Col 1: System info */}
        <div
          className="border-b md:border-b-0 md:border-r"
          style={{ padding: "40px 32px", borderColor: C.border }}
        >
          <Eyebrow label="Design System" />
          <div style={{ fontSize: 18, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em", marginBottom: 6, lineHeight: 1.3 }}>
            HEX Portal
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 10, fontWeight: 600, color: C.teal, background: C.tealDim, border: "1px solid rgba(0,196,161,0.2)", padding: "2px 8px", borderRadius: 3, letterSpacing: "0.06em", marginBottom: 16 }}>
            <span>●</span> V2.1 · Active
          </div>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 20, maxWidth: 260 }}>
            A token-based design system built for enterprise SaaS —
            cross-platform across Web, iOS, and Android.
            Primitive → semantic → component. One source of truth.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {TOKEN_LAYERS.map((layer) => (
              <div key={layer.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: layer.color }} />
                <span style={{ fontFamily: MONO, fontSize: 11, color: C.text, fontWeight: 500, minWidth: 80 }}>{layer.name}</span>
                <span style={{ fontSize: 11, color: C.muted }}>{layer.desc}</span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, marginLeft: "auto" }}>{layer.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Col 2: Palette preview */}
        <div
          className="border-b md:border-b-0 md:border-r"
          style={{ padding: "40px 32px", borderColor: C.border }}
        >
          <Eyebrow label="Color Library" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PALETTES.map((p) => (
              <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: MONO, fontSize: 10, color: C.muted, width: 76, flexShrink: 0, fontWeight: 500 }}>{p.label}</span>
                <div style={{ display: "flex", gap: 2, flex: 1 }}>
                  {p.swatches.map((hex, si) => (
                    <div key={si} style={{ height: 18, flex: 1, borderRadius: 2, background: hex }} />
                  ))}
                </div>
                <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, width: 28, textAlign: "right" as const, flexShrink: 0 }}>{p.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Col 3: CTA */}
        <div style={{ padding: "40px 32px" }}>
          <Eyebrow label="Architect" />
          <div style={{ fontSize: 20, fontWeight: 600, color: "#fff", lineHeight: 1.3, letterSpacing: "-0.02em", marginBottom: 10 }}>
            Want this system in your product?
          </div>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, marginBottom: 24 }}>
            This is a live demo of a production design system —
            the architecture, token taxonomy, and component library
            I built at CYGNVS. I build systems like this for
            Series B–D SaaS teams.
          </p>
          <a
            href="https://calendly.com/eswarcreatives/25-min-intro-call"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: C.teal, color: "#0a0c0f", fontWeight: 600, fontSize: 13, padding: "12px 18px", borderRadius: 6, textDecoration: "none", marginBottom: 8, fontFamily: SANS }}
          >
            Book a 30-min intro
            <span style={{ fontSize: 16, lineHeight: 1 }}>→</span>
          </a>
          <a
            href="/work/cygnvs-ttx"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: C.surface2, color: C.text, fontWeight: 500, fontSize: 13, padding: "12px 18px", borderRadius: 6, textDecoration: "none", border: `1px solid ${C.border2}`, marginBottom: 20, fontFamily: SANS }}
          >
            Read the full case study
            <span style={{ fontSize: 14, opacity: 0.5 }}>↗</span>
          </a>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
            {BADGES.map((b) => (
              <span
                key={b.label}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", padding: "4px 9px", borderRadius: 4, border: `1px solid ${b.border}`, background: b.bg, color: b.color }}
              >
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
                {b.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between flex-wrap"
        style={{ gap: 16, padding: "16px 32px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" as const }}>
          <a href="mailto:eswar@eswarcreatives.in" style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: "0.04em", textDecoration: "none" }}>
            eswar@eswarcreatives.in
          </a>
          <span style={{ color: C.dim, fontSize: 11 }}>·</span>
          <span style={{ fontSize: 11, color: C.dim, fontFamily: MONO }}>© 2026 Eswar Maheswaran. HEX Portal Design System V2.1.</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {BOTTOM_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              style={{ fontFamily: MONO, fontSize: 10, color: C.dim, textDecoration: "none", padding: "4px 10px", borderRadius: 4, border: `1px solid transparent`, fontWeight: 500, letterSpacing: "0.04em" }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

    </footer>
  );
}
