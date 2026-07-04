import { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from "react";
import { Link } from "react-router";
import confetti from "canvas-confetti";
import eswarLogo from "../../imports/eswar-logo.svg";
import { getPackFromSearch, getPackKeyFromSearch } from "./questionnairePacks";

// ── Gamification ─────────────────────────────────────────────────────
// Messages shown briefly after completing each section (1-indexed).
// Section 7 is intentionally absent — its completion triggers the final
// celebration card + confetti instead.
const STEP_TOAST_MESSAGES = [
  "Great start! Your brand story is taking shape ✨",
  "Love it — now we can see who you're speaking to 🎯",
  "Your brand personality is coming alive 🌟",
  "Smart choices — the visual direction is getting clear 🎨",
  "Almost there — you're building something special 🔥",
  "Brilliant — just one more step to go! 💎",
];

// Fires confetti from both bottom corners for ~3s on submit success.
function fireCelebration() {
  const colors = ["#0d9488", "#14b8a6", "#5eead4", "#a7f3d0", "#fbbf24", "#f59e0b"];
  const burst = (origin: { x: number; y: number }, angle: number, particleCount = 60) =>
    confetti({
      particleCount,
      angle,
      spread: 70,
      origin,
      colors,
      startVelocity: 55,
      gravity: 1,
      scalar: 1.0,
      zIndex: 9999,
    });

  burst({ x: 0, y: 1 }, 60);
  burst({ x: 1, y: 1 }, 120);

  const duration = 3000;
  const end = Date.now() + duration;
  const interval = setInterval(() => {
    if (Date.now() > end) {
      clearInterval(interval);
      return;
    }
    burst({ x: 0, y: 1 }, 60, 35);
    burst({ x: 1, y: 1 }, 120, 35);
  }, 550);
}

// ── Formspree ──────────────────────────────────────────────────────
const FORMSPREE_ID = "maqvagwj";
const SHEETS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyEmYryPGYUID2akiY13GGJfsMlfyOivEVLfywHX29np-XTrSmj-gM7MHWa5Y8f1geW/exec';

// ── Light theme tokens ─────────────────────────────────────────────
const C = {
  bg: "#f5f4f0",
  surface: "#ffffff",
  surface2: "#f0eeea",
  border: "rgba(0,0,0,0.10)",
  borderInput: "rgba(0,0,0,0.15)",
  borderFocus: "#0d9488",
  text: "#1a1a1a",
  textSoft: "#4a4a4a",
  textMuted: "#6b7280",
  accent: "#0d9488",
  accentDark: "#0a7c72",
  accentLight: "#e6f7f5",
  error: "#dc2626",
  success: "#16a34a",
} as const;

// ── Font context (propagates Tamil font through form components) ───
const FontCtx = createContext("var(--font-family-primary)");

// ── Section metadata ───────────────────────────────────────────────
const SECTIONS = [
  { num: "01", title: "The Business" },
  { num: "02", title: "The Audience" },
  { num: "03", title: "The Brand Soul" },
  { num: "04", title: "Competitors & Positioning" },
  { num: "05", title: "Visual Direction" },
  { num: "06", title: "Practical Details" },
  { num: "07", title: "Final Thoughts" },
] as const;

// ── Example modal ──────────────────────────────────────────────────
function ExampleModal({
  qKey, onClose, examples, logoTypeIntro, packKey,
}: {
  qKey: string;
  onClose: () => void;
  examples: Record<string, string>;
  logoTypeIntro: string;
  packKey: string;
}) {
  const text = examples[qKey] ?? "";
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          background: "#fff", borderRadius: 16, maxWidth: 480, width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Modal header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px 0",
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {qKey === "logoTypePreference"
              ? logoTypeIntro
              : "Here's how another client answered this"}
          </p>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close example"
            style={{
              background: "none", border: "none", cursor: "pointer", padding: 4,
              color: C.textMuted, fontSize: 20, lineHeight: 1, borderRadius: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Modal body */}
        <div style={{ padding: "16px 24px 0" }}>
          {qKey === "logoTypePreference" ? (
            packKey === "default" ? (
              <>
                <div style={{ background: "#f8f7f5", padding: 14, borderRadius: 8, marginBottom: 10 }}>
                  <svg width="180" height="32" viewBox="0 0 180 32" style={{ display: "block", marginBottom: 8 }}>
                    <text x="0" y="24" fontFamily="'Playfair Display', serif" fontSize="18" fontWeight="400" fill="#1a1a1a">Sunrise Consulting</text>
                  </svg>
                  <p style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 6px" }}>
                    WORDMARK — works when your business name carries the brand
                  </p>
                  <p style={{ fontSize: 13, color: "#4a4a4a", margin: 0, lineHeight: "20px" }}>
                    Clean and direct — the name does the work. Scales easily across letterheads, signage, and digital touchpoints.
                  </p>
                </div>
                <div style={{ background: "#f8f7f5", padding: 14, borderRadius: 8, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8Z" stroke="#1a1a1a" strokeWidth="1.4" strokeLinejoin="round" />
                    </svg>
                    <svg width="130" height="24" viewBox="0 0 130 24">
                      <text x="0" y="18" fontFamily="'Inter', sans-serif" fontSize="14" fill="#1a1a1a">Northstar Studio</text>
                    </svg>
                  </div>
                  <p style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 6px" }}>
                    COMBINATION MARK — works for studios, agencies, and product brands
                  </p>
                  <p style={{ fontSize: 13, color: "#4a4a4a", margin: 0, lineHeight: "20px" }}>
                    The symbol stands alone in tight spaces — app icons, favicons, profile photos — while the full lockup carries the name everywhere else.
                  </p>
                </div>
                <div style={{ background: "#f8f7f5", padding: 14, borderRadius: 8, marginBottom: 10 }}>
                  <svg width="60" height="36" viewBox="0 0 60 36" style={{ display: "block", marginBottom: 8 }}>
                    <text x="0" y="30" fontFamily="'Playfair Display', serif" fontSize="28" fontWeight="700" fill="#1a1a1a" letterSpacing="3">NS</text>
                  </svg>
                  <p style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 6px" }}>
                    LETTERMARK — useful when the full name is long or hard to read small
                  </p>
                  <p style={{ fontSize: 13, color: "#4a4a4a", margin: 0, lineHeight: "20px" }}>
                    Short, memorable, and scales cleanly — from a 3mm stamp to a 3-metre banner.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div style={{ background: "#f8f7f5", padding: 14, borderRadius: 8, marginBottom: 10 }}>
                  <svg width="160" height="32" viewBox="0 0 160 32" style={{ display: "block", marginBottom: 8 }}>
                    <text x="0" y="24" fontFamily="'Playfair Display', serif" fontSize="18" fontWeight="400" fill="#1a1a1a">Palam Silks</text>
                  </svg>
                  <p style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 6px" }}>
                    WORDMARK — most common for premium South Indian brands
                  </p>
                  <p style={{ fontSize: 13, color: "#4a4a4a", margin: 0, lineHeight: "20px" }}>
                    Clean, elegant, lets the name do the work. Works beautifully on saree tags, invitations, and signage.
                  </p>
                </div>
                <div style={{ background: "#f8f7f5", padding: 14, borderRadius: 8, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <svg width="24" height="24" viewBox="-12 -12 24 24">
                      <ellipse rx="4" ry="10" stroke="#1a1a1a" strokeWidth="1" fill="none" />
                      <ellipse rx="4" ry="10" stroke="#1a1a1a" strokeWidth="1" fill="none" transform="rotate(-40)" />
                      <ellipse rx="4" ry="10" stroke="#1a1a1a" strokeWidth="1" fill="none" transform="rotate(40)" />
                    </svg>
                    <svg width="110" height="24" viewBox="0 0 110 24">
                      <text x="0" y="18" fontFamily="'Inter', sans-serif" fontSize="14" fill="#1a1a1a">Jasmine Events</text>
                    </svg>
                  </div>
                  <p style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 6px" }}>
                    COMBINATION MARK — popular for event &amp; floristry studios
                  </p>
                  <p style={{ fontSize: 13, color: "#4a4a4a", margin: 0, lineHeight: "20px" }}>
                    The symbol gives you an icon for social media profiles; the full lockup works on everything else.
                  </p>
                </div>
                <div style={{ background: "#f8f7f5", padding: 14, borderRadius: 8, marginBottom: 10 }}>
                  <svg width="60" height="36" viewBox="0 0 60 36" style={{ display: "block", marginBottom: 8 }}>
                    <text x="0" y="30" fontFamily="'Playfair Display', serif" fontSize="28" fontWeight="700" fill="#1a1a1a" letterSpacing="3">JE</text>
                  </svg>
                  <p style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 6px" }}>
                    LETTERMARK — works when the business name is long
                  </p>
                  <p style={{ fontSize: 13, color: "#4a4a4a", margin: 0, lineHeight: "20px" }}>
                    Short, memorable, and scales to any size — from a 3mm stamp to a 3-metre banner.
                  </p>
                </div>
              </>
            )
          ) : qKey === "logosAdmired" && packKey === "creative" ? (
            <>
              <div style={{ background: "#f8f7f5", borderRadius: 10, padding: "16px 20px", marginBottom: 12 }}>
                <img
                  src="https://upload.wikimedia.org/wikipedia/en/thumb/7/7e/Sabyasachi_logo.svg/320px-Sabyasachi_logo.svg.png"
                  alt="Sabyasachi logo — for reference only"
                  style={{ maxHeight: 48, maxWidth: 180, objectFit: "contain", display: "block", marginBottom: 12 }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const fb = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fb) fb.style.display = "block";
                  }}
                />
                <p style={{ display: "none", fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 400, letterSpacing: "4px", textTransform: "uppercase", color: "#1a1a1a", margin: "0 0 12px", lineHeight: 1.2 }}>
                  SABYASACHI
                </p>
                <span style={{ fontSize: 10, color: "#9ca3af", letterSpacing: "0.5px" }}>Reference only · Not affiliated</span>
                <p style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "1.5px", margin: "6px 0 0" }}>
                  SABYASACHI
                </p>
                <p style={{ fontSize: 13, color: "#4a4a4a", margin: "8px 0 0", lineHeight: "20px" }}>
                  Rooted and handcrafted — the typography feels like it has history without being dated.
                </p>
              </div>
              <div style={{ background: "#f8f7f5", borderRadius: 10, padding: "16px 20px", marginBottom: 12 }}>
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/The_Leela_Palaces_Hotels_and_Resorts_logo.svg/320px-The_Leela_Palaces_Hotels_and_Resorts_logo.svg.png"
                  alt="The Leela Hotels logo — for reference only"
                  style={{ maxHeight: 48, maxWidth: 180, objectFit: "contain", display: "block", marginBottom: 12 }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const fb = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fb) fb.style.display = "block";
                  }}
                />
                <p style={{ display: "none", fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 400, letterSpacing: "6px", textTransform: "uppercase", color: "#1a1a1a", margin: "0 0 12px", lineHeight: 1.2 }}>
                  THE LEELA
                </p>
                <span style={{ fontSize: 10, color: "#9ca3af", letterSpacing: "0.5px" }}>Reference only · Not affiliated</span>
                <p style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "1.5px", margin: "6px 0 0" }}>
                  THE LEELA HOTELS
                </p>
                <p style={{ fontSize: 13, color: "#4a4a4a", margin: "8px 0 0", lineHeight: "20px" }}>
                  Restrained confidence — wide letter-spacing signals luxury without shouting it.
                </p>
              </div>
              <div style={{ background: "#f8f7f5", borderRadius: 10, padding: "16px 20px", marginBottom: 12 }}>
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Tanishq_logo.svg/320px-Tanishq_logo.svg.png"
                  alt="Tanishq logo — for reference only"
                  style={{ maxHeight: 48, maxWidth: 180, objectFit: "contain", display: "block", marginBottom: 12 }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const fb = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fb) fb.style.display = "block";
                  }}
                />
                <p style={{ display: "none", fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 400, letterSpacing: "1px", color: "#1a1a1a", margin: "0 0 12px", lineHeight: 1.2 }}>
                  Tanishq
                </p>
                <span style={{ fontSize: 10, color: "#9ca3af", letterSpacing: "0.5px" }}>Reference only · Not affiliated</span>
                <p style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "1.5px", margin: "6px 0 0" }}>
                  TANISHQ
                </p>
                <p style={{ fontSize: 13, color: "#4a4a4a", margin: "8px 0 0", lineHeight: "20px" }}>
                  The warmth comes from the soft serif curves — trustworthy and approachable, not cold.
                </p>
              </div>
            </>
          ) : (
            <p style={{
              fontSize: 15, lineHeight: "26px", color: C.textSoft,
              whiteSpace: "pre-line",
            }}>
              "{text}"
            </p>
          )}
        </div>

        {/* Modal footer */}
        <div style={{
          margin: "16px 24px 20px",
          padding: "12px 16px",
          background: C.surface2,
          borderRadius: 8,
        }}>
          <p style={{ fontSize: 12, color: C.textMuted, lineHeight: "18px" }}>
            Your answer will be completely your own — this is just to get you started.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── "See an example" trigger ───────────────────────────────────────
function ExTrigger({ qKey, onOpen }: { qKey: string; onOpen: (k: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(qKey)}
      style={{
        background: "none", border: "none", padding: 0, cursor: "pointer",
        fontSize: 12, color: C.accent, display: "inline-flex", alignItems: "center",
        gap: 4, marginBottom: 10, textDecoration: "none",
      }}
      onMouseOver={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
      onMouseOut={(e) => { e.currentTarget.style.textDecoration = "none"; }}
    >
      💡 See an example
    </button>
  );
}

// ── Top step progress bar ──────────────────────────────────────────
function TopBar({ step, pulseKey }: { step: number; pulseKey: number }) {
  const pct = Math.round(((step + 1) / 7) * 100);
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 100, background: "#e5e7eb" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: C.accent, transition: "width 0.4s ease" }} />
      {pulseKey > 0 && (
        <div
          key={pulseKey}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: `${pct}%`,
            background: C.accent,
            animation: "pulseProgress 0.7s ease",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}

// ── Step indicator ─────────────────────────────────────────────────
function StepIndicator({ step, titles }: { step: number; titles: string[] }) {
  const title = titles[step] ?? SECTIONS[step].title;
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px 28px" }}>
      {/* Desktop */}
      <div className="hidden sm:block">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: C.text }}>
            Section {step + 1} of 7 — {title}
          </p>
          <p style={{ fontSize: 12, color: C.textMuted }}>{step + 1} / 7</p>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {SECTIONS.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: i <= step ? C.accent : "#e5e7eb",
              transition: "background 0.3s",
            }} />
          ))}
        </div>
      </div>
      {/* Mobile */}
      <div className="sm:hidden">
        <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 8 }}>
          Step {step + 1} / 7 — {title}
        </p>
        <div style={{ height: 3, background: "#e5e7eb", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%", background: C.accent,
            width: `${Math.round(((step + 1) / 7) * 100)}%`,
            transition: "width 0.4s ease",
          }} />
        </div>
      </div>
    </div>
  );
}

// ── Section heading ────────────────────────────────────────────────
function SHead({ num, title }: { num: string; title: string }) {
  const font = useContext(FontCtx);
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 28 }}>
      <span style={{
        fontFamily: font, fontSize: 48, fontWeight: 500,
        lineHeight: 1, color: C.accent, letterSpacing: "-0.04em", userSelect: "none",
      }}>{num}</span>
      <h2 style={{
        fontFamily: font, fontSize: 20, fontWeight: 600,
        lineHeight: "28px", letterSpacing: "-0.01em", color: C.text, margin: 0,
      }}>{title}</h2>
    </div>
  );
}

// ── Question divider ───────────────────────────────────────────────
function QDivider() {
  return <div style={{ height: 1, background: C.border, margin: "22px 0" }} />;
}

// ── Question label ─────────────────────────────────────────────────
function QL({ children, required }: { children: React.ReactNode; required?: boolean }) {
  const font = useContext(FontCtx);
  return (
    <label style={{
      display: "block", fontFamily: font, fontSize: 14,
      fontWeight: 500, lineHeight: "20px", color: C.text, marginBottom: 8,
    }}>
      {children}
      {required && <span style={{ color: C.error, marginLeft: 4 }} aria-hidden="true">*</span>}
    </label>
  );
}

// ── Text input ─────────────────────────────────────────────────────
function TInput({
  value, onChange, placeholder, type = "text", required, hasError, id,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; required?: boolean; hasError?: boolean; id?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      style={{
        width: "100%", background: C.surface, boxSizing: "border-box",
        border: `1px solid ${hasError ? C.error : focused ? C.borderFocus : C.borderInput}`,
        boxShadow: focused ? `0 0 0 3px rgba(13,148,136,0.12)` : hasError ? `0 0 0 3px rgba(220,38,38,0.10)` : "none",
        borderRadius: 8, padding: "12px 14px",
        fontFamily: "var(--font-family-primary)", fontSize: 15, lineHeight: "24px",
        color: C.text, outline: "none", transition: "border-color 0.18s, box-shadow 0.18s",
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

// ── Textarea ───────────────────────────────────────────────────────
function TArea({
  value, onChange, placeholder, rows = 4,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%", background: C.surface, boxSizing: "border-box",
        border: `1px solid ${focused ? C.borderFocus : C.borderInput}`,
        boxShadow: focused ? `0 0 0 3px rgba(13,148,136,0.12)` : "none",
        borderRadius: 8, padding: "12px 14px", resize: "vertical", minHeight: "120px",
        fontFamily: "var(--font-family-primary)", fontSize: 15, lineHeight: "24px",
        color: C.text, outline: "none", transition: "border-color 0.18s, box-shadow 0.18s",
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

// ── Radio option ───────────────────────────────────────────────────
function RadioOpt({ label, checked, onSelect }: { label: string; checked: boolean; onSelect: () => void }) {
  return (
    <label
      onClick={onSelect}
      style={{
        display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
        padding: "10px 13px", borderRadius: 8, marginBottom: 6,
        border: `1.5px solid ${checked ? C.accent : C.borderInput}`,
        background: checked ? C.accentLight : C.surface,
        transition: "all 0.18s",
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
        border: `2px solid ${checked ? C.accent : C.borderInput}`,
        background: checked ? C.accent : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.18s",
      }}>
        {checked && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
      </div>
      <input type="radio" checked={checked} onChange={onSelect} style={{ display: "none" }} />
      <span style={{
        fontFamily: "var(--font-family-primary)", fontSize: 14, lineHeight: "20px",
        color: checked ? C.accentDark : C.textSoft, fontWeight: checked ? 500 : 400,
        transition: "color 0.18s",
      }}>{label}</span>
    </label>
  );
}

// ── Checkbox option ────────────────────────────────────────────────
function CbOpt({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <label
      onClick={onToggle}
      style={{
        display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
        padding: "10px 13px", borderRadius: 8, marginBottom: 6,
        border: `1.5px solid ${checked ? C.accent : C.borderInput}`,
        background: checked ? C.accentLight : C.surface,
        transition: "all 0.18s",
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
        border: `2px solid ${checked ? C.accent : C.borderInput}`,
        background: checked ? C.accent : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.18s",
      }}>
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <input type="checkbox" checked={checked} onChange={onToggle} style={{ display: "none" }} />
      <span style={{
        fontFamily: "var(--font-family-primary)", fontSize: 14, lineHeight: "20px",
        color: checked ? C.accentDark : C.textSoft, fontWeight: checked ? 500 : 400,
        transition: "color 0.18s",
      }}>{label}</span>
    </label>
  );
}

// ── Field error ────────────────────────────────────────────────────
function FErr({ msg }: { msg: string }) {
  return (
    <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: "18px", color: C.error, fontFamily: "var(--font-family-primary)" }}>
      {msg}
    </p>
  );
}

// ── Hint text ──────────────────────────────────────────────────────
function Hint({ children }: { children: React.ReactNode }) {
  const font = useContext(FontCtx);
  return (
    <p style={{ fontSize: 13, color: C.textMuted, lineHeight: "18px", marginBottom: 8, fontFamily: font }}>
      {children}
    </p>
  );
}

// ── Typography card options ────────────────────────────────────────
interface TypoOption {
  label: string;
  font?: string;
  specimenText: string;
  subtext: string;
  specimenWeight?: number;
  isMixed?: boolean;
}

const TYPO_OPTIONS: TypoOption[] = [
  {
    label: "Classic serif",
    font: "'Playfair Display', serif",
    specimenText: "Elegance",
    subtext: "Traditional · Established · Timeless",
  },
  {
    label: "Modern serif",
    font: "'DM Serif Display', serif",
    specimenText: "Editorial",
    subtext: "Contemporary · Refined · Forward",
  },
  {
    label: "Hand-lettered script",
    font: "'Dancing Script', cursive",
    specimenText: "Graceful",
    subtext: "Romantic · Personal · Handcrafted",
    specimenWeight: 600,
  },
  {
    label: "Clean sans-serif",
    font: "'Inter', sans-serif",
    specimenText: "Minimal",
    subtext: "Modern · Architectural · Clean",
  },
  {
    label: "Mixed — trust your judgment",
    specimenText: "",
    subtext: "We'll find the perfect combination for you",
    isMixed: true,
  },
];

function TypoCard({
  option, selected, onSelect,
}: {
  option: TypoOption; selected: boolean; onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <label
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "block", cursor: "pointer",
        background: selected ? "#f0faf9" : "#ffffff",
        border: `1.5px solid ${selected ? "#0d9488" : hovered ? "rgba(13,148,136,0.4)" : "rgba(0,0,0,0.12)"}`,
        borderRadius: 12, padding: 20,
        boxShadow: hovered && !selected ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
        transition: "border-color 0.18s, background 0.18s, box-shadow 0.18s",
      }}
    >
      <input type="radio" checked={selected} onChange={onSelect} style={{ display: "none" }} />
      {option.isMixed ? (
        <div style={{ display: "flex", gap: 14, alignItems: "baseline", marginBottom: 8 }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: "#1a1a1a", lineHeight: 1.1 }}>Your</span>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: "#1a1a1a", lineHeight: 1.1 }}>Own</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: "#1a1a1a", lineHeight: 1.1 }}>Voice</span>
        </div>
      ) : (
        <p style={{
          fontFamily: option.font, fontSize: 36, fontWeight: option.specimenWeight ?? 400,
          color: "#1a1a1a", lineHeight: 1.1, margin: "0 0 8px",
        }}>
          {option.specimenText}
        </p>
      )}
      <p style={{
        fontSize: 12, letterSpacing: "0.5px", color: "#6b7280",
        textTransform: "uppercase", margin: 0,
      }}>
        {option.subtext}
      </p>
      <p style={{
        fontSize: 13, fontWeight: 600, color: "#1a1a1a",
        margin: "12px 0 0", paddingTop: 12,
        borderTop: "1px solid rgba(0,0,0,0.08)",
      }}>
        {option.label}
      </p>
    </label>
  );
}

// ── Motif chip ─────────────────────────────────────────────────────
function MotifChip({
  symbol, label, selected, onToggle, dashed,
}: {
  symbol: React.ReactNode; label: string; selected: boolean; onToggle: () => void; dashed?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "16px 12px", borderRadius: 10, cursor: "pointer",
        border: `1.5px ${dashed ? "dashed" : "solid"} ${selected ? "#0d9488" : hovered ? "rgba(13,148,136,0.5)" : "rgba(0,0,0,0.12)"}`,
        background: selected ? "#f0faf9" : "#ffffff",
        boxShadow: hovered && !selected ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        transition: "border-color 0.18s, background 0.18s, box-shadow 0.18s",
      }}
    >
      <div style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {symbol}
      </div>
      <span style={{ fontSize: 12, color: "#4a4a4a", textAlign: "center", lineHeight: "16px" }}>
        {label}
      </span>
    </button>
  );
}

// ── Cultural cue card ──────────────────────────────────────────────
function CultureCard({
  visual, title, desc, selected, onSelect, dashed,
}: {
  visual: React.ReactNode; title: string; desc: string;
  selected: boolean; onSelect: () => void; dashed?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "block", padding: 20, borderRadius: 12, textAlign: "left", width: "100%", cursor: "pointer",
        border: `1.5px ${dashed ? "dashed" : "solid"} ${selected ? "#0d9488" : hovered ? "rgba(13,148,136,0.5)" : "rgba(0,0,0,0.12)"}`,
        background: selected ? "#f0faf9" : "#ffffff",
        boxShadow: hovered && !selected ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
        transition: "border-color 0.18s, background 0.18s, box-shadow 0.18s",
      }}
    >
      <div style={{ height: 52, display: "flex", alignItems: "center", marginBottom: 12 }}>
        {visual}
      </div>
      <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", margin: 0, lineHeight: "20px" }}>{title}</p>
      {desc && <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0", lineHeight: "18px" }}>{desc}</p>}
    </button>
  );
}

// ── Mood-board culture card ────────────────────────────────────────
interface MoodBoardCultureCardProps {
  title: string; desc: string; selected: boolean; onSelect: () => void;
  imageSrc?: string; gradient: string; tintColor: string;
  chips: Array<{ icon: React.ReactNode; label: string }>;
}

function MoodBoardCultureCard({
  title, desc, selected, onSelect, imageSrc, gradient, tintColor, chips,
}: MoodBoardCultureCardProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "block", width: "100%", height: "100%", padding: 0, border: "none",
        borderRadius: 16, overflow: "hidden", cursor: "pointer",
        background: tintColor, textAlign: "left",
        outline: selected ? "3px solid #0d9488" : hovered ? "2px solid rgba(13,148,136,0.4)" : "none",
        outlineOffset: 2,
        boxShadow: hovered ? "0 4px 16px rgba(0,0,0,0.10)" : "0 1px 4px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.18s ease",
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", height: 180, background: gradient, overflow: "hidden" }}>
        {imageSrc && (
          <img src={imageSrc} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }} />
        )}
      </div>
      <div style={{ padding: 20 }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", margin: "0 0 6px" }}>{title}</p>
        <p style={{ fontSize: 13, color: "#4a4a4a", lineHeight: 1.5, margin: "0 0 16px" }}>{desc}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {chips.map((chip, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.55)", borderRadius: 8, padding: "8px 10px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              backdropFilter: "blur(4px)",
            }}>
              {chip.icon}
              <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.8px", color: "#4a4a4a", textAlign: "center", maxWidth: 56 }}>
                {chip.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </button>
  );
}

// ── Logo type card ─────────────────────────────────────────────────
interface LogoTypeOption {
  value: string; name: string; desc: string;
  visual: React.ReactNode; fullWidth?: boolean; dashed?: boolean;
  images?: string[];
}

const LOGO_TYPE_OPTIONS: LogoTypeOption[] = [
  {
    value: "Pictorial mark",
    name: "Pictorial mark",
    desc: "A symbol or icon that represents your brand — no text needed",
    images: [
      "/assets/logo-types/pictorial/layer-1.png",
      "/assets/logo-types/pictorial/layer-2.png",
      "/assets/logo-types/pictorial/layer-3.png",
      "/assets/logo-types/pictorial/layer-4.png",
    ],
    visual: (
      <svg width="60" height="40" viewBox="0 0 60 40">
        <circle cx="30" cy="24" r="14" fill="#1a1a1a" />
        <path d="M 30 10 C 34 4 43 7 39 14" fill="#1a1a1a" />
        <line x1="30" y1="10" x2="30" y2="8" stroke="#1a1a1a" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    value: "Lettermark",
    name: "Lettermark",
    desc: "Your initials crafted into a distinctive identity",
    images: [
      "/assets/logo-types/lettermark/layer-5.png",
      "/assets/logo-types/lettermark/layer-6.png",
      "/assets/logo-types/lettermark/layer-7.png",
      "/assets/logo-types/lettermark/layer-8.png",
    ],
    visual: (
      <svg width="60" height="40" viewBox="0 0 60 40">
        <text x="30" y="30" textAnchor="middle" fontFamily="serif" fontSize="24" fontWeight="700" fill="#1a1a1a" letterSpacing="2">EC</text>
      </svg>
    ),
  },
  {
    value: "Wordmark",
    name: "Wordmark",
    desc: "Your full business name as the logo — typography does the work",
    images: [
      "/assets/logo-types/wordmark/layer-9.png",
      "/assets/logo-types/wordmark/layer-10.png",
      "/assets/logo-types/wordmark/layer-11.png",
    ],
    visual: (
      <svg width="60" height="40" viewBox="0 0 60 40">
        <text x="30" y="27" textAnchor="middle" fontFamily="serif" fontSize="18" fontWeight="400" fill="#1a1a1a" letterSpacing="3">Brand</text>
      </svg>
    ),
  },
  {
    value: "Combination mark",
    name: "Combination mark",
    desc: "A symbol and your name together — versatile and recognisable",
    images: [
      "/assets/logo-types/combination/layer-12.png",
      "/assets/logo-types/combination/layer-13.png",
      "/assets/logo-types/combination/layer-14.png",
    ],
    visual: (
      <svg width="60" height="40" viewBox="0 0 60 40">
        <text x="6" y="26" fontSize="16" fill="#1a1a1a">✦</text>
        <text x="26" y="26" fontFamily="sans-serif" fontSize="14" fill="#1a1a1a">Brand</text>
      </svg>
    ),
  },
  {
    value: "Emblem",
    name: "Emblem",
    desc: "Text enclosed within a shape — classic, badge-like, authoritative",
    images: [
      "/assets/logo-types/emblem/layer-15.png",
      "/assets/logo-types/emblem/layer-16.png",
      "/assets/logo-types/emblem/layer-17.png",
      "/assets/logo-types/emblem/layer-18.png",
    ],
    visual: (
      <svg width="60" height="40" viewBox="0 0 60 40">
        <ellipse cx="30" cy="20" rx="28" ry="18" stroke="#1a1a1a" strokeWidth="1.5" fill="none" />
        <text x="30" y="23" textAnchor="middle" fontFamily="serif" fontSize="10" fill="#1a1a1a">Studio</text>
      </svg>
    ),
  },
  {
    value: "Abstract mark",
    name: "Abstract mark",
    desc: "A unique geometric shape — modern, open to interpretation",
    images: [
      "/assets/logo-types/abstract/layer-19.png",
      "/assets/logo-types/abstract/layer-20.png",
      "/assets/logo-types/abstract/layer-24.png",
      "/assets/logo-types/abstract/layer-25.png",
    ],
    visual: (
      <svg width="60" height="40" viewBox="0 0 60 40">
        <circle cx="30" cy="12" r="10" stroke="#1a1a1a" strokeWidth="1.5" fill="none" />
        <circle cx="20" cy="28" r="10" stroke="#1a1a1a" strokeWidth="1.5" fill="none" />
        <circle cx="40" cy="28" r="10" stroke="#1a1a1a" strokeWidth="1.5" fill="none" />
      </svg>
    ),
  },
  {
    value: "Help me decide",
    name: "Help me decide",
    desc: "Share your other answers and we'll recommend the right logo style for your brand",
    visual: (
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" stroke="#9ca3af" strokeWidth="1.5" fill="none" />
        <text x="20" y="20" textAnchor="middle" dominantBaseline="central" fontSize="18" fill="#9ca3af">?</text>
      </svg>
    ),
    fullWidth: true, dashed: true,
  },
];

function LogoTypeCard({ option, selected, onSelect }: {
  option: LogoTypeOption; selected: boolean; onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: selected ? "#f0faf9" : "#ffffff",
        border: `1.5px ${option.dashed ? "dashed" : "solid"} ${selected ? "#0d9488" : hovered ? "rgba(13,148,136,0.5)" : "rgba(0,0,0,0.12)"}`,
        borderRadius: 12, padding: "16px", cursor: "pointer", textAlign: "center",
        width: "100%", boxSizing: "border-box",
        boxShadow: hovered && !selected ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
        transition: "border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease",
        gridColumn: option.fullWidth ? "1 / -1" : undefined,
      }}
    >
      {option.images ? (
        <div style={{ display: "flex", gap: 6, marginBottom: 14, justifyContent: "center" }}>
          {option.images.map((src, i) => (
            <div key={i} style={{
              flex: 1, height: 48, background: "#f8f7f5", borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
            }}>
              <img src={src} alt="" style={{ maxWidth: "100%", maxHeight: 36, objectFit: "contain" }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
          {option.visual}
        </div>
      )}
      <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", margin: "0 0 4px" }}>{option.name}</p>
      <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.4, margin: 0 }}>{option.desc}</p>
    </button>
  );
}

// ── Selector trigger button ───────────────────────────────────────
function SelectorTrigger({ placeholder, selectedChips, onClick, isOpen, isMulti }: {
  placeholder: string;
  selectedChips: string[];
  onClick: () => void;
  isOpen: boolean;
  isMulti?: boolean;
}) {
  const show = isMulti ? selectedChips.slice(0, 3) : selectedChips;
  const overflow = isMulti ? Math.max(0, selectedChips.length - 3) : 0;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%", padding: "12px 16px", borderRadius: 10,
        border: "1.5px solid rgba(0,0,0,0.15)",
        background: "#ffffff", cursor: "pointer",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        gap: 12, boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: 1, minWidth: 0 }}>
        {selectedChips.length === 0 ? (
          <span style={{ fontSize: 14, color: "#9ca3af" }}>{placeholder}</span>
        ) : (
          <>
            {show.map((chip, i) => (
              <span key={i} style={{
                background: "#e6f7f5", color: "#0a7c72",
                borderRadius: 20, padding: "4px 12px",
                fontSize: 13, fontWeight: 500, whiteSpace: "nowrap",
              }}>{chip}</span>
            ))}
            {overflow > 0 && (
              <span style={{
                background: "#e6f7f5", color: "#0a7c72",
                borderRadius: 20, padding: "4px 12px",
                fontSize: 13, fontWeight: 500,
              }}>+{overflow} more</span>
            )}
          </>
        )}
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
        style={{
          flexShrink: 0, color: "#9ca3af",
          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s ease",
        }}
      >
        <path d="M3 5.5L8 10.5L13 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

// ── Selector lightbox modal ────────────────────────────────────────
function SelectorLightbox({ isOpen, onClose, title, children, footer }: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const isWide = typeof window !== "undefined" && window.innerWidth >= 680;

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => setVisible(true), 10);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      setVisible(false);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: `rgba(0,0,0,${visible ? 0.5 : 0})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: isWide ? "0 20px" : "0 16px",
        transition: "background 0.2s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          width: "100%", maxWidth: 680, maxHeight: "80vh",
          background: "#fff",
          borderRadius: 16,
          display: "flex", flexDirection: "column", overflow: "hidden",
          transform: visible ? "translateY(0) scale(1)" : "translateY(16px) scale(0.98)",
          opacity: visible ? 1 : 0,
          transition: "transform 0.25s ease-out, opacity 0.2s ease",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px 16px",
          borderBottom: "1px solid rgba(0,0,0,0.08)", flexShrink: 0,
        }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#1a1a1a", margin: 0 }}>{title}</p>
          <button type="button" onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9ca3af", padding: 4, lineHeight: 1 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#1a1a1a")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
          >×</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {children}
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(0,0,0,0.08)", flexShrink: 0 }}>
          {footer}
        </div>
      </div>
    </div>
  );
}

// ── Form state ─────────────────────────────────────────────────────
interface FS {
  businessName: string; tagline: string; whatYouDo: string;
  businessStage: string; operationArea: string; successIn3Years: string;
  idealClient: string; pricePoint: string;
  clientChannels: string[]; clientFrustrations: string; clientFeedback: string;
  brandWords: string; avoidWords: string; brandAsPerson: string;
  clientFeelings: string[]; clientFeelingsOther: string;
  brandAsPlace: string; brandPromise: string;
  competitors: string; differentFrom: string; competitorReasons: string;
  positioning: string; neverThink: string;
  typographyDir: string; logoTypePreference: string; logosAdmired: string; logosDisliked: string;
  motifsElements: string; culturalCues: string;
  usageChannels: string[]; projectTimeline: string;
  budget: string; decisionMaker: string; preferredComm: string;
  personalSymbolic: string; anythingElse: string;
  fullName: string; email: string; phone: string;
}

const BLANK: FS = {
  businessName: "", tagline: "", whatYouDo: "",
  businessStage: "", operationArea: "", successIn3Years: "",
  idealClient: "", pricePoint: "",
  clientChannels: [], clientFrustrations: "", clientFeedback: "",
  brandWords: "", avoidWords: "", brandAsPerson: "",
  clientFeelings: [], clientFeelingsOther: "",
  brandAsPlace: "", brandPromise: "",
  competitors: "", differentFrom: "", competitorReasons: "",
  positioning: "", neverThink: "",
  typographyDir: "", logoTypePreference: "", logosAdmired: "", logosDisliked: "",
  motifsElements: "", culturalCues: "",
  usageChannels: [], projectTimeline: "",
  budget: "", decisionMaker: "", preferredComm: "",
  personalSymbolic: "", anythingElse: "",
  fullName: "", email: "", phone: "",
};

// ── Success celebration card ───────────────────────────────────────
// Owns its own <style> block — when status === "success" the main page
// tree is unmounted, so any @keyframes defined there are gone.
function SuccessScreen({ title, text, font }: { title: string; text: string; font: string }) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // Fire confetti from both bottom corners the moment the card mounts.
    // canvas-confetti attaches its own <canvas> to document.body with
    // zIndex 9999 (set in fireCelebration), which sits above this card.
    fireCelebration();
    // Brief RAF so the card's transition fires from opacity 0 → 1.
    const t = setTimeout(() => setRevealed(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, fontFamily: font,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px",
    }}>
      <style>{`
        @keyframes fillCircle {
          0%   { background-color: transparent; transform: scale(0.92); }
          60%  { background-color: ${C.success}; transform: scale(1.05); }
          100% { background-color: ${C.success}; transform: scale(1); }
        }
        @keyframes drawCheck { to { stroke-dashoffset: 0; } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={{
        background: C.surface, borderRadius: 20, padding: "52px 40px",
        maxWidth: 520, width: "100%", textAlign: "center",
        boxShadow: "0 12px 40px rgba(0,0,0,0.10)",
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0) scale(1)" : "translateY(12px) scale(0.98)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "transparent",
          border: `2.5px solid ${C.success}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 28px",
          animation: "fillCircle 0.45s cubic-bezier(0.34, 1.2, 0.64, 1) 0.15s forwards",
        }}>
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <path
              d="M12 23L19 30L32 15"
              stroke="#ffffff" strokeWidth="3.5"
              strokeLinecap="round" strokeLinejoin="round"
              style={{
                strokeDasharray: 32,
                strokeDashoffset: 32,
                animation: "drawCheck 0.6s ease-out 0.55s forwards",
              }}
            />
          </svg>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: C.text, marginBottom: 14, fontFamily: font }}>
          {title}
        </h1>
        <p style={{ fontSize: 15, lineHeight: "26px", color: C.textSoft, marginBottom: 36, fontFamily: font }}>
          {text}
        </p>
        <a
          href="/"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "transparent", color: C.textSoft,
            border: `1px solid ${C.border}`, borderRadius: 8,
            padding: "10px 24px", fontSize: 14, fontWeight: 500,
            textDecoration: "none", fontFamily: font,
            transition: "border-color 0.18s, color 0.18s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderInput; e.currentTarget.style.color = C.text; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSoft; }}
        >
          Close
        </a>
      </div>
    </div>
  );
}

// ── Selected-tier banner data ──────────────────────────────────────
// Mirrors the three Brand Identity tiers from scripts/seed-catalog.mjs.
// Hardcoded here so the banner doesn't pull Supabase just to render a
// pill; the seed is the source of truth for live pricing.
const TIER_INFO: Record<string, { name: string; price: string }> = {
  foundation:   { name: "Foundation",   price: "₹25,000" },
  professional: { name: "Professional", price: "₹55,000" },
  complete:     { name: "Complete",     price: "₹95,000" },
};

function getTierFromSearch(search: string): { slug: string; name: string; price: string } | null {
  const slug = (new URLSearchParams(search).get("tier") || "").toLowerCase();
  const info = TIER_INFO[slug];
  return info ? { slug, ...info } : null;
}

// ── Main page ──────────────────────────────────────────────────────
export function BrandIdentityDiscoveryPage() {
  // Read ?pack= once on mount — defaults to creative (florist wording).
  const search = typeof window !== "undefined" ? window.location.search : "";
  const pack = useMemo(() => getPackFromSearch(search), [search]);
  const packKey = useMemo(() => getPackKeyFromSearch(search), [search]);
  const selectedTier = useMemo(() => getTierFromSearch(search), [search]);

  const [form, setForm] = useState<FS>(BLANK);
  const [files, setFiles] = useState<FileList | null>(null);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);
  const [exampleModal, setExampleModal] = useState<string | null>(null);
  const [businessStageSelect, setBusinessStageSelect] = useState("");
  const [businessStageOther, setBusinessStageOther] = useState("");
  const [businessStageFocused, setBusinessStageFocused] = useState(false);
  const [motifsSelected, setMotifsSelected] = useState<string[]>([]);
  const [motifsOther, setMotifsOther] = useState("");
  const [cultureSelected, setCultureSelected] = useState("");
  const [cultureOther, setCultureOther] = useState("");
  const [visualRefs, setVisualRefs] = useState<File[]>([]);
  const [visualRefsDragOver, setVisualRefsDragOver] = useState(false);
  const [visualRefsError, setVisualRefsError] = useState("");
  const [openLightbox, setOpenLightbox] = useState<string | null>(null);
  const [lang, setLang] = useState<"en" | "ta">("en");
  const [honeypot, setHoneypot] = useState('');
  const [showRestorationBanner, setShowRestorationBanner] = useState(false);
  const [autosaveToastVisible, setAutosaveToastVisible] = useState(false);
  const [autosaveToastOpacity, setAutosaveToastOpacity] = useState(0);
  const [stepToast, setStepToast] = useState<string | null>(null);
  const [stepToastOpacity, setStepToastOpacity] = useState(0);
  const [progressPulseKey, setProgressPulseKey] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);
  const hasSavedOnce = useRef(false);

  const set = useCallback(<K extends keyof FS>(k: K, v: FS[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrs((p) => { const n = { ...p }; delete n[k as string]; return n; });
  }, []);

  const toggleArr = useCallback(<K extends keyof FS>(k: K, item: string) => {
    setForm((p) => {
      const arr = p[k] as string[];
      return { ...p, [k]: arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item] };
    });
  }, []);

  useEffect(() => {
    const prevBg = document.documentElement.style.background;
    document.documentElement.style.background = C.bg;
    document.body.style.background = C.bg;
    document.title = "Brand Identity Discovery — Eswar Creatives";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", "Tell us about your business, your audience, and the direction your brand should take. Eswar Creatives will review your brief within three working days.");
    return () => {
      document.documentElement.style.background = prevBg;
      document.body.style.background = "";
    };
  }, []);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('discovery_draft_v1');
      if (!saved) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = JSON.parse(saved) as any;
      const d = parsed?.data;
      if (!d) return;
      const restored = Object.fromEntries(
        (Object.keys(BLANK) as (keyof FS)[])
          .filter(k => d[k] !== undefined)
          .map(k => [k, d[k]])
      ) as Partial<FS>;
      setForm(prev => ({ ...prev, ...restored }));
      if (typeof d.businessStageSelect === 'string') setBusinessStageSelect(d.businessStageSelect);
      if (typeof d.businessStageOther === 'string') setBusinessStageOther(d.businessStageOther);
      if (Array.isArray(d.motifsSelected)) setMotifsSelected(d.motifsSelected as string[]);
      if (typeof d.motifsOther === 'string') setMotifsOther(d.motifsOther);
      if (typeof d.cultureSelected === 'string') setCultureSelected(d.cultureSelected);
      if (typeof d.cultureOther === 'string') setCultureOther(d.cultureOther);
      setShowRestorationBanner(true);
    } catch {}
  }, []);

  // Autosave — debounced 500ms
  useEffect(() => {
    if (!hasSavedOnce.current) {
      hasSavedOnce.current = true;
      return;
    }
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('discovery_draft_v1', JSON.stringify({
          data: {
            ...form,
            businessStageSelect,
            businessStageOther,
            motifsSelected,
            motifsOther,
            cultureSelected,
            cultureOther,
          },
          saved_at: new Date().toISOString(),
        }));
        setAutosaveToastVisible(true);
        setAutosaveToastOpacity(1);
        const fadeTimer = setTimeout(() => {
          setAutosaveToastOpacity(0);
          setTimeout(() => setAutosaveToastVisible(false), 400);
        }, 2000);
        return () => clearTimeout(fadeTimer);
      } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [form, businessStageSelect, businessStageOther, motifsSelected, motifsOther, cultureSelected, cultureOther]);

  const validateStep = (s: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (s === 0 && !form.businessName.trim()) e.businessName = "Business name is required";
    if (s === 6) {
      if (!form.fullName.trim()) e.fullName = "Full name is required";
      if (!form.email.trim()) e.email = "Email address is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address";
      if (!form.phone.trim()) e.phone = "Phone / WhatsApp number is required";
    }
    return e;
  };

  const handleContinue = () => {
    const v = validateStep(step);
    if (Object.keys(v).length) { setErrs(v); return; }
    setErrs({});
    const completedStepIdx = step; // section just finished (0-indexed)
    setStep((s) => s + 1);
    topRef.current?.scrollIntoView({ behavior: "smooth" });

    // Progress bar pulse
    setProgressPulseKey((k) => k + 1);

    // Step-completion toast: section 1..6 → message; section 7 has no toast.
    const msg = STEP_TOAST_MESSAGES[completedStepIdx];
    if (msg) {
      // Hold 3.5s, then a 0.3s grace pause before fade-out begins.
      const HOLD_MS = 3500;
      const GRACE_MS = 300;
      const FADE_MS = 400;
      setStepToast(msg);
      setStepToastOpacity(0);
      // RAF gap so the entry transition fires from opacity 0 → 1.
      requestAnimationFrame(() => setStepToastOpacity(1));
      setTimeout(() => setStepToastOpacity(0), HOLD_MS + GRACE_MS);
      setTimeout(() => setStepToast(null), HOLD_MS + GRACE_MS + FADE_MS);
    }
  };

  const handleBack = () => {
    setErrs({});
    setStep((s) => s - 1);
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validateStep(6);
    if (Object.keys(v).length) { setErrs(v); return; }
    if (honeypot !== '') return;
    setStatus("submitting");
    try {
      const fd = new FormData();
      const fields: [string, string][] = [
        ...(selectedTier
          ? ([["Selected Package", `${selectedTier.name} (from ${selectedTier.price})`]] as [string, string][])
          : []),
        ["01. Business Name", form.businessName],
        ["01b. Tagline", form.tagline],
        ["02. What You Do", form.whatYouDo],
        ["03. Business Stage", form.businessStage],
        ["04. Operation Area", form.operationArea],
        ["05. Success in 3 Years", form.successIn3Years],
        ["06. Ideal Client", form.idealClient],
        ["07. Price Point", form.pricePoint],
        ["08. Client Channels", form.clientChannels.join(", ")],
        ["09. Client Frustrations", form.clientFrustrations],
        ["10. Client Feedback", form.clientFeedback],
        ["11. Brand Words", form.brandWords],
        ["12. Words to Avoid", form.avoidWords],
        ["13. Brand as Person", form.brandAsPerson],
        ["14. Client Feelings", [
          ...form.clientFeelings,
          form.clientFeelingsOther ? `Something else: ${form.clientFeelingsOther}` : "",
        ].filter(Boolean).join(", ")],
        ["15. Brand as Place", form.brandAsPlace],
        ["16. Brand Promise", form.brandPromise],
        ["17. Competitors", form.competitors],
        ["18. What Makes You Different", form.differentFrom],
        ["19. Why Clients Choose Competitors", form.competitorReasons],
        ["20. Positioning", form.positioning],
        ["21. Never Think/Say", form.neverThink],
        ["22. Typography Direction", form.typographyDir],
        ["logo_type_preference", form.logoTypePreference],
        ["23. Logos Admired", form.logosAdmired],
        ["24. Logos Disliked", form.logosDisliked],
        ["25. Symbols & Motifs", [
          ...motifsSelected.filter(l => l !== "Other — describe"),
          motifsOther ? `Other: ${motifsOther}` : "",
        ].filter(Boolean).join(", ")],
        ["26. Cultural Cues", cultureSelected === "Other — I'll describe" ? cultureOther : cultureSelected],
        ["27. Usage Channels", form.usageChannels.join(", ")],
        ["29. Project Timeline", form.projectTimeline],
        ["30. Budget Range", form.budget],
        ["31. Decision Maker", form.decisionMaker],
        ["32. Preferred Communication", form.preferredComm],
        ["33. Personal / Symbolic", form.personalSymbolic],
        ["34. Anything Else", form.anythingElse],
        ["35a. Full Name", form.fullName],
        ["35b. Email", form.email],
        ["35c. Phone / WhatsApp", form.phone],
      ];
      const submittedAt = new Date().toISOString();
      for (const [k, val] of fields) fd.append(k, val);
      fd.append("_submitted_at", submittedAt);
      fd.append("_subject", `New brief: ${form.businessName || 'Unnamed'}`);
      if (files) {
        for (let i = 0; i < files.length; i++) fd.append("28. Existing Assets", files[i]);
      }
      for (const f of visualRefs) fd.append("visual_references", f);

      const sheetsPayload: Record<string, string | string[]> = {};
      fd.forEach((value, key) => {
        if (typeof value === 'string') {
          if (sheetsPayload[key]) {
            sheetsPayload[key] = ([] as string[]).concat(sheetsPayload[key] as string | string[], value);
          } else {
            sheetsPayload[key] = value;
          }
        }
      });

      const [formspreeRes, sheetsRes] = await Promise.allSettled([
        fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
          method: "POST", body: fd, headers: { Accept: "application/json" },
        }),
        fetch(SHEETS_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sheetsPayload),
        }),
      ]);

      const formspreeOk = formspreeRes.status === 'fulfilled' && formspreeRes.value.ok;
      const sheetsOk = sheetsRes.status === 'fulfilled';

      if (formspreeOk || sheetsOk) {
        localStorage.removeItem('discovery_draft_v1');
        // Confetti fires from inside SuccessScreen's mount effect, so it
        // arrives together with the card.
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  // ── Translations ──────────────────────────────────────────────────
  const t = {
    en: {
      pageEyebrow: "Brand Identity Discovery",
      pageTitle: "Tell us about your brand.",
      pageSubtitle: pack.pageSubtitle,
      pageNote: "We'll review your brief and follow up within three working days.",
      s1Title: "The Business",
      s2Title: pack.s2Title,
      s3Title: "Your Clients",
      s4Title: "Competitors & Positioning",
      s5Title: "Visual Direction",
      s6Title: "Practical Details",
      s7Title: "Final Thoughts",
      continue: "Continue →",
      back: "← Back",
      submit: "Submit Discovery Brief",
      q1Label: "Business name",
      q1Hint: "The name as it appears on your signage, Instagram, and printed materials.",
      q2Label: "Tagline (if you have one)",
      q2Hint: "Even a rough one. Or leave blank — we'll help you find one.",
      q3Label: "What do you do? Tell us about your work.",
      q3Hint: "Describe what you do, who you serve, and what makes your business different.",
      q4Label: "How long have you been in business?",
      q4Hint: "Helps us understand where you are in your journey.",
      q5Label: "Where do you operate?",
      q5Hint: "City, region, or 'pan-India / international' if relevant.",
      q6Label: "What does success look like in 3 years?",
      q6Hint: "Team size, revenue, recognition, the kind of work you want to be doing.",
      q7Label: "If your brand were a place, which comes closest?",
      q7Hint: "",
      q8Label: "What feeling should clients have when they encounter your brand?",
      q8Hint: "",
      q9Label: "In one sentence, what is your brand promise?",
      q9Hint: "",
      q10Label: "If your brand were a person, describe them.",
      q10Hint: "",
      q11Label: "Three words you want to AVOID",
      q11Hint: "",
      q12Label: "Describe your ideal client in detail.",
      q12Hint: pack.q12Hint,
      q13Label: "What's the biggest frustration clients have with similar businesses?",
      q13Hint: "",
      q14Label: "Price point",
      q14Hint: "",
      q15Label: "Where do clients find you?",
      q15Hint: "",
      q16Label: "What do clients say after working with you?",
      q16Hint: "Actual words, reviews, or the essence of what they share.",
      q17Label: "Name 3 competitors or peers you respect",
      q17Hint: "Even better — paste their Instagram handles or websites.",
      q18Label: "What makes you genuinely different?",
      q18Hint: "Not just 'we care more' — what is the actual difference in your work, approach, or result?",
      q19Label: "What do clients sometimes choose competitors for, over you?",
      q19Hint: "Be honest — this helps us position you clearly.",
      q20Label: "What should clients never think or say about you?",
      q20Hint: "What perception would be the worst thing for your brand?",
      q21Label: "Three words that describe your brand personality",
      q21Hint: "",
      q22Label: "Where do you want to be positioned in the market?",
      q22Hint: "",
      q23Label: "Typography direction — which feels most like you?",
      q23Hint: "Choose the direction that feels closest to your brand.",
      q24Label: "What type of logo feels right for your brand?",
      q24Hint: "Most clients find it easier to choose by seeing — pick the style that feels closest.",
      q25Label: "Logos you admire — share 3 to 5 examples",
      q25Hint: "Brand names, Instagram handles, or URLs. What do you love about them?",
      q26Label: "Logos or visual styles you dislike — share 2 to 3",
      q26Hint: "What about them doesn't work for you?",
      q27Label: pack.q27Label,
      q27Hint: "Select any that appeal to you, or describe your own.",
      q28Label: pack.culturalCueLabel,
      q28Hint: pack.culturalCueHint,
      q29Label: "Share visual references — optional",
      q29Hint: "Screenshots, Pinterest saves, Instagram posts, logos you love — anything that shows the direction you have in mind.",
      q30Label: "Where will this identity be used?",
      q30Hint: "Select all that apply.",
      q31Label: "Existing logo or visual assets (optional)",
      q31Hint: "PDF, PNG, JPG, or ZIP — multiple files, up to 25 MB total.",
      q32Label: "Project timeline",
      q32Hint: "When do you need final files? Any upcoming launch or season driving this?",
      q33Label: "Budget range",
      q33Hint: "Honest answer here lets us scope deliverables that match.",
      q34Label: "Who is the final decision-maker for this project?",
      q34Hint: "Just you, or a partner / family member? Knowing this prevents revision delays.",
      q35Label: "Preferred way to communicate",
      q35Hint: "Channel and typical response window. Helps us match your pace.",
      q36Label: "Anything personal or symbolic you'd like carried into the brand?",
      q36Hint: "A family name, a city, a material, a memory, a number — anything that means something to you.",
      q37Label: "Anything else you'd like us to know before we begin?",
      q37Hint: "An honest concern, a past experience, something you loved or hated in a previous branding project.",
      q38Label: "Contact details",
      q38Hint: "So we can come back to you within three working days.",
      successTitle: "You did it! 🎉",
      successText: "Your brand discovery is complete. We'll review your responses and get back to you within 48 hours with a custom brand strategy.",
    },
    ta: {
      pageEyebrow: "Brand Identity Discovery",
      pageTitle: "உங்க brand பத்தி சொல்லுங்க.",
      pageSubtitle: pack.pageSubtitleTamil,
      pageNote: "நீங்க submit பண்ண மூணு working days-ல நாங்க திரும்பி connect பண்றோம்.",
      s1Title: "Business பத்தி",
      s2Title: pack.s2TitleTamil,
      s3Title: "உங்க Clients",
      s4Title: "Competitors & Positioning",
      s5Title: "Visual Direction",
      s6Title: "Practical Details",
      s7Title: "கடைசி கேள்விகள்",
      continue: "தொடரவும் →",
      back: "← திரும்பவும்",
      submit: "Discovery Brief அனுப்புங்க",
      q1Label: "Business பெயர்",
      q1Hint: "உங்க signage, Instagram, printed materials-ல இருக்கற மாதிரி சரியா எழுதுங்க.",
      q2Label: "Tagline (இருந்தா சொல்லுங்க)",
      q2Hint: "Rough-ஆ இருந்தாலும் பரவாயில்ல. இல்லன்னா blank-ஆ விடுங்க — நாங்க help பண்றோம்.",
      q3Label: "நீங்க என்ன பண்றீங்க? உங்க work பத்தி சொல்லுங்க.",
      q3Hint: "நீங்க என்ன செய்றீங்க, யாருக்கு செய்றீங்க, உங்களை special-ஆ என்ன பண்றதுன்னு சொல்லுங்க.",
      q4Label: "Business எத்தன வருஷமா நடக்குது?",
      q4Hint: "உங்க journey-ல இப்போ எந்த stage-ல இருக்கீங்கன்னு புரிஞ்சுக்க உதவும்.",
      q5Label: "நீங்க எங்க operate பண்றீங்க?",
      q5Hint: "City, region, இல்லன்னா 'pan-India / international' — relevant-ஆ இருந்தா சொல்லுங்க.",
      q6Label: "3 வருஷத்துல success எப்படி இருக்கணும்னு நினைக்கீங்க?",
      q6Hint: "Team size, revenue, recognition, எந்த மாதிரி work பண்ணணும்னு இருக்கீங்க.",
      q7Label: "உங்க brand ஒரு இடமா இருந்தா, எது close-ஆ feel ஆகும்?",
      q7Hint: "",
      q8Label: "உங்க brand-ஐ பார்க்கும்போது clients-க்கு என்ன feel ஆகணும்?",
      q8Hint: "",
      q9Label: "ஒரே ஒரு sentence-ல சொல்லுங்க — உங்க brand promise என்ன?",
      q9Hint: "",
      q10Label: "உங்க brand ஒரு person-ஆ இருந்தா, அவங்க எப்படி இருப்பாங்க?",
      q10Hint: "",
      q11Label: "AVOID பண்ணணும்னு நினைக்கற மூணு words",
      q11Hint: "",
      q12Label: "உங்களுக்கு ideal-ஆ இருக்கற client-ஐ describe பண்ணுங்க.",
      q12Hint: pack.q12HintTamil,
      q13Label: "Similar businesses-ல clients-க்கு இருக்கற மிகப்பெரிய frustration என்ன?",
      q13Hint: "",
      q14Label: "Price point",
      q14Hint: "",
      q15Label: "Clients உங்களை எப்படி find பண்றாங்க?",
      q15Hint: "",
      q16Label: "உங்களோட கூட work பண்ணதும் clients என்ன சொல்றாங்க?",
      q16Hint: "Actual words, reviews, இல்லன்னா அவங்க சொல்வதன் essence.",
      q17Label: "நீங்க respect பண்ற 3 competitors இல்லன்னா peers-ஓட பெயர் சொல்லுங்க",
      q17Hint: "இன்னும் நல்லது — அவங்க Instagram handle இல்லன்னா website paste பண்ணுங்க.",
      q18Label: "நீங்க genuinely என்ன different-ஆ இருக்கீங்க?",
      q18Hint: "Just 'we care more' சொல்லாதீங்க — actual difference என்ன?",
      q19Label: "Clients சில நேரம் உங்களை விட competitors-ஐ ஏன் choose பண்றாங்க?",
      q19Hint: "Honest-ஆ சொல்லுங்க — இது உங்களை clearly position பண்ண உதவும்.",
      q20Label: "Clients உங்களைப் பத்தி என்னன்னு நினைக்கவோ சொல்லவோ கூடாது?",
      q20Hint: "உங்க brand-க்கு மிக மோசமான perception என்ன?",
      q21Label: "உங்க brand personality-ஐ describe பண்ற மூணு words",
      q21Hint: "",
      q22Label: "Market-ல நீங்க எந்த position-ல இருக்கணும்?",
      q22Hint: "",
      q23Label: "Typography direction — உங்களுக்கு எது close-ஆ feel ஆகுது?",
      q23Hint: "உங்க brand-க்கு closest-ஆ feel ஆகற direction-ஐ choose பண்ணுங்க.",
      q24Label: "உங்க brand-க்கு எந்த மாதிரி logo right-ஆ feel ஆகுது?",
      q24Hint: "பெரும்பாலான clients visually பார்த்து decide பண்றது easy-ஆ இருக்குன்னு சொல்றாங்க.",
      q25Label: "நீங்க admire பண்ற logos — 3 முதல் 5 examples சொல்லுங்க",
      q25Hint: "Brand names, Instagram handles, இல்லன்னா URLs. அதுல என்ன பிடிக்குதுன்னு சொல்லுங்க.",
      q26Label: "நீங்க dislike பண்ற logos இல்லன்னா visual styles — 2 to 3 சொல்லுங்க",
      q26Hint: "அதுல என்ன work ஆகல்ன்னு சொல்லுங்க.",
      q27Label: pack.q27LabelTamil,
      q27Hint: "உங்களுக்கு appeal ஆகற எதையும் select பண்ணுங்க, இல்லன்னா describe பண்ணுங்க.",
      q28Label: pack.culturalCueLabelTamil,
      q28Hint: pack.culturalCueHintTamil,
      q29Label: "Visual references share பண்ணுங்க — optional",
      q29Hint: "Screenshots, Pinterest saves, Instagram posts, நீங்க love பண்ற logos — direction காட்ட எதுவும் share பண்ணலாம்.",
      q30Label: "இந்த identity எங்கெல்லாம் use ஆகும்?",
      q30Hint: "Applicable-ஆன எல்லாத்தையும் select பண்ணுங்க.",
      q31Label: "Existing logo இல்லன்னா visual assets (optional)",
      q31Hint: "PDF, PNG, JPG, இல்லன்னா ZIP — multiple files, 25 MB வரை.",
      q32Label: "Project timeline",
      q32Hint: "Final files எப்போ வேணும்? Upcoming launch இல்லன்னா season இருக்கா?",
      q33Label: "Budget range",
      q33Hint: "Honest-ஆ சொன்னா deliverables scope பண்ண உதவும்.",
      q34Label: "இந்த project-க்கு final decision-maker யாரு?",
      q34Hint: "நீங்க மட்டுமா, இல்லன்னா partner / family member-உம் இருக்காங்களா? இது தெரிஞ்சா revision delays தவிர்க்கலாம்.",
      q35Label: "நீங்க எப்படி communicate பண்ண விரும்புறீங்க?",
      q35Hint: "Channel மற்றும் typical response window — உங்க pace-க்கு match பண்ண உதவும்.",
      q36Label: "Brand-ல quietly carry பண்ணணும்னு நினைக்கற personal இல்லன்னா symbolic விஷயம் ஏதாவது இருக்கா?",
      q36Hint: pack.q36HintTamil,
      q37Label: "Start பண்றதுக்கு முன்னாடி வேற ஏதாவது சொல்லணும்னு இருக்கா?",
      q37Hint: "Loose thoughts, references, hopes, fears — எல்லாமே welcome.",
      q38Label: "உங்க contact details",
      q38Hint: "மூணு working days-ல நாங்க உங்களை திரும்பி contact பண்ண.",
      successTitle: "Brief கிடைச்சது.",
      successText: "நாங்க உங்க answers-ஐ carefully review பண்ணி மூணு working days-ல initial brand direction மற்றும் transparent quote-ஓட திரும்பி வருவோம்.",
    },
  };

  const qlFont = lang === "ta" ? "'Noto Sans Tamil', sans-serif" : "var(--font-family-primary)";
  const sectionTitles = [
    t[lang].s1Title,
    t[lang].s3Title,
    t[lang].s2Title,
    t[lang].s4Title,
    t[lang].s5Title,
    t[lang].s6Title,
    t[lang].s7Title,
  ];

  if (status === "success") return (
    <FontCtx.Provider value={qlFont}>
      <SuccessScreen title={t[lang].successTitle} text={t[lang].successText} font={qlFont} />
    </FontCtx.Provider>
  );

  const CHANNELS = pack.clientChannels;
  const FEELINGS = pack.clientFeelings;
  const USAGE = ["Instagram & social", "Website", "Signage at venues", "Printed invitations", "Vehicle branding", "Staff uniforms", "Business cards", "Gift packaging", "Brochures & decks"];

  // ── Section content ──────────────────────────────────────────────
  const sectionContent = [
    // Step 0 — The Business
    <>
      <SHead num="01" title={t[lang].s1Title} />

      <QL required>{t[lang].q1Label}</QL>
      <TInput value={form.businessName} onChange={(v) => set("businessName", v)} placeholder={pack.businessNamePlaceholder} hasError={!!errs.businessName} />
      {errs.businessName && <FErr msg={errs.businessName} />}

      <QDivider />
      <QL>{t[lang].q2Label}</QL>
      <TInput value={form.tagline} onChange={(v) => set("tagline", v)} placeholder={pack.taglinePlaceholder} />

      <QDivider />
      <QL>{t[lang].q3Label}</QL>
      <ExTrigger qKey="whatYouDo" onOpen={setExampleModal} />
      <TArea value={form.whatYouDo} onChange={(v) => set("whatYouDo", v)} placeholder="Describe what you do, who you serve, and what makes your business different…" />

      <QDivider />
      <QL>{t[lang].q4Label}</QL>
      <select
        value={businessStageSelect}
        onChange={(e) => {
          const val = e.target.value;
          setBusinessStageSelect(val);
          if (val !== "Other — I'll specify") {
            set("businessStage", val);
            setBusinessStageOther("");
          } else {
            set("businessStage", "");
          }
        }}
        onFocus={() => setBusinessStageFocused(true)}
        onBlur={() => setBusinessStageFocused(false)}
        style={{
          appearance: "none",
          width: "100%",
          background: "#ffffff",
          border: `1px solid ${businessStageFocused ? C.borderFocus : C.borderInput}`,
          boxShadow: businessStageFocused ? "0 0 0 3px rgba(13,148,136,0.12)" : "none",
          borderRadius: 8,
          padding: "12px 40px 12px 14px",
          fontSize: 16,
          color: businessStageSelect ? C.text : "#9ca3af",
          fontFamily: "var(--font-family-primary)",
          outline: "none",
          boxSizing: "border-box",
          cursor: "pointer",
          transition: "border-color 0.18s, box-shadow 0.18s",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%236b7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 14px center",
          backgroundSize: "12px",
        }}
      >
        <option value="" disabled>Select…</option>
        <option>Pre-launch</option>
        <option>Under 2 years</option>
        <option>2–5 years</option>
        <option>5–10 years</option>
        <option>10–15 years</option>
        <option>15–20 years</option>
        <option>20+ years</option>
        <option>Other — I'll specify</option>
      </select>
      <div style={{
        opacity: businessStageSelect === "Other — I'll specify" ? 1 : 0,
        pointerEvents: businessStageSelect === "Other — I'll specify" ? "auto" : "none",
        maxHeight: businessStageSelect === "Other — I'll specify" ? 100 : 0,
        overflow: "hidden",
        marginTop: businessStageSelect === "Other — I'll specify" ? 10 : 0,
        transition: "opacity 0.2s ease, max-height 0.2s ease, margin-top 0.2s ease",
      }}>
        <TInput
          value={businessStageOther}
          onChange={(v) => {
            setBusinessStageOther(v);
            set("businessStage", v);
          }}
          placeholder="e.g. 23 years, since 1998…"
        />
      </div>

      <QDivider />
      <QL>{t[lang].q5Label}</QL>
      {["City / Local", "State / Regional", "Pan-India", "International"].map((o) => (
        <RadioOpt key={o} label={o} checked={form.operationArea === o} onSelect={() => set("operationArea", o)} />
      ))}

      <QDivider />
      <QL>{t[lang].q6Label}</QL>
      <ExTrigger qKey="successIn3Years" onOpen={setExampleModal} />
      <TArea value={form.successIn3Years} onChange={(v) => set("successIn3Years", v)} placeholder="Paint us a picture of where you want to be…" />
    </>,

    // Step 1 — The Audience
    <>
      <SHead num="02" title={t[lang].s3Title} />

      <QL>{t[lang].q12Label}</QL>
      <ExTrigger qKey="idealClient" onOpen={setExampleModal} />
      <TArea value={form.idealClient} onChange={(v) => set("idealClient", v)} placeholder="Age, lifestyle, values, what they care about most when hiring someone like you…" />

      <QDivider />
      <QL>{t[lang].q14Label}</QL>
      {["Budget-conscious", "Mid-range", "Premium", "Luxury", "Mixed"].map((o) => (
        <RadioOpt key={o} label={o} checked={form.pricePoint === o} onSelect={() => set("pricePoint", o)} />
      ))}

      <QDivider />
      <QL>{t[lang].q15Label}</QL>
      {CHANNELS.map((o) => (
        <CbOpt key={o} label={o} checked={form.clientChannels.includes(o)} onToggle={() => toggleArr("clientChannels", o)} />
      ))}

      <QDivider />
      <QL>{t[lang].q13Label}</QL>
      <ExTrigger qKey="clientFrustrations" onOpen={setExampleModal} />
      <TArea value={form.clientFrustrations} onChange={(v) => set("clientFrustrations", v)} placeholder="What do clients complain about with your competitors?…" />

      <QDivider />
      <QL>{t[lang].q16Label}</QL>
      <TArea value={form.clientFeedback} onChange={(v) => set("clientFeedback", v)} placeholder="Actual words, reviews, or the essence of what they share…" />
    </>,

    // Step 2 — The Brand Soul
    <>
      <SHead num="03" title={t[lang].s2Title} />

      <QL>{t[lang].q21Label}</QL>
      <TInput value={form.brandWords} onChange={(v) => set("brandWords", v)} placeholder={pack.brandWordsPlaceholder} />

      <QDivider />
      <QL>{t[lang].q11Label}</QL>
      <TInput value={form.avoidWords} onChange={(v) => set("avoidWords", v)} placeholder="e.g. Cheap, Loud, Generic" />

      <QDivider />
      <QL>{t[lang].q10Label}</QL>
      <ExTrigger qKey="brandAsPerson" onOpen={setExampleModal} />
      <TArea value={form.brandAsPerson} onChange={(v) => set("brandAsPerson", v)} placeholder="Their style, how they speak, what they wear, how they make people feel…" />

      <QDivider />
      <QL>{t[lang].q8Label}</QL>
      {FEELINGS.map((o) => (
        <CbOpt key={o} label={o} checked={form.clientFeelings.includes(o)} onToggle={() => toggleArr("clientFeelings", o)} />
      ))}
      {form.clientFeelings.includes("Something else") && (
        <div style={{ marginTop: 8 }}>
          <TInput value={form.clientFeelingsOther} onChange={(v) => set("clientFeelingsOther", v)} placeholder="Describe the feeling…" />
        </div>
      )}

      <QDivider />
      <QL>{t[lang].q7Label}</QL>
      {pack.brandAsPlaceOptions.map((o) => (
        <RadioOpt key={o} label={o} checked={form.brandAsPlace === o} onSelect={() => set("brandAsPlace", o)} />
      ))}

      <QDivider />
      <QL>{t[lang].q9Label}</QL>
      <ExTrigger qKey="brandPromise" onOpen={setExampleModal} />
      <TArea value={form.brandPromise} onChange={(v) => set("brandPromise", v)} rows={3} placeholder="The core promise you make to every client who works with you…" />
    </>,

    // Step 3 — Competitors & Positioning
    <>
      <SHead num="04" title={t[lang].s4Title} />

      <QL>{t[lang].q17Label}</QL>
      <TArea value={form.competitors} onChange={(v) => set("competitors", v)} rows={3} placeholder="Business names, Instagram handles, or websites — and what you admire about them…" />

      <QDivider />
      <QL>{t[lang].q18Label}</QL>
      <ExTrigger qKey="differentFrom" onOpen={setExampleModal} />
      <TArea value={form.differentFrom} onChange={(v) => set("differentFrom", v)} placeholder="Not just 'we care more' — what is the actual difference in your work, approach, or result?…" />

      <QDivider />
      <QL>{t[lang].q19Label}</QL>
      <ExTrigger qKey="competitorReasons" onOpen={setExampleModal} />
      <TArea value={form.competitorReasons} onChange={(v) => set("competitorReasons", v)} placeholder="Be honest — this helps us position you clearly…" />

      <QDivider />
      <QL>{t[lang].q22Label}</QL>
      {["Most affordable", "Best value", "Premium quality", "Absolute luxury"].map((o) => (
        <RadioOpt key={o} label={o} checked={form.positioning === o} onSelect={() => set("positioning", o)} />
      ))}

      <QDivider />
      <QL>{t[lang].q20Label}</QL>
      <ExTrigger qKey="neverThink" onOpen={setExampleModal} />
      <TArea value={form.neverThink} onChange={(v) => set("neverThink", v)} rows={3} placeholder="What perception would be the worst thing for your brand?…" />
    </>,

    // Step 4 — Visual Direction
    <>
      <SHead num="05" title={t[lang].s5Title} />

      <QL>{t[lang].q23Label}</QL>
      <SelectorTrigger
        placeholder="Choose a typography style →"
        selectedChips={form.typographyDir ? [form.typographyDir] : []}
        onClick={() => setOpenLightbox("typography")}
        isOpen={openLightbox === "typography"}
      />
      <SelectorLightbox
        isOpen={openLightbox === "typography"}
        onClose={() => setOpenLightbox(null)}
        title="Typography direction — which feels most like you?"
        footer={
          <button type="button" disabled={!form.typographyDir} onClick={() => setOpenLightbox(null)}
            style={{
              width: "100%", padding: "12px 24px", borderRadius: 10, border: "none",
              background: form.typographyDir ? "#0d9488" : "#e5e7eb",
              color: form.typographyDir ? "#fff" : "#9ca3af",
              fontSize: 14, fontWeight: 600,
              cursor: form.typographyDir ? "pointer" : "default",
            }}
          >Confirm selection</button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TYPO_OPTIONS.map((opt) => (
            <TypoCard key={opt.label} option={opt}
              selected={form.typographyDir === opt.label}
              onSelect={() => set("typographyDir", opt.label)} />
          ))}
        </div>
      </SelectorLightbox>

      <QDivider />
      <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", marginBottom: 6, fontFamily: qlFont }}>
        {t[lang].q24Label}
      </p>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16, fontFamily: qlFont }}>
        {t[lang].q24Hint}
      </p>
      <SelectorTrigger
        placeholder="Choose a logo style →"
        selectedChips={form.logoTypePreference ? [form.logoTypePreference] : []}
        onClick={() => setOpenLightbox("logoType")}
        isOpen={openLightbox === "logoType"}
      />
      <ExTrigger qKey="logoTypePreference" onOpen={setExampleModal} />
      <SelectorLightbox
        isOpen={openLightbox === "logoType"}
        onClose={() => setOpenLightbox(null)}
        title="What type of logo feels right for your brand?"
        footer={
          <button type="button" disabled={!form.logoTypePreference} onClick={() => setOpenLightbox(null)}
            style={{
              width: "100%", padding: "12px 24px", borderRadius: 10, border: "none",
              background: form.logoTypePreference ? "#0d9488" : "#e5e7eb",
              color: form.logoTypePreference ? "#fff" : "#9ca3af",
              fontSize: 14, fontWeight: 600,
              cursor: form.logoTypePreference ? "pointer" : "default",
            }}
          >Confirm selection</button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LOGO_TYPE_OPTIONS.map((opt) => (
            <div key={opt.value} style={{ gridColumn: opt.fullWidth ? "1 / -1" : undefined }}>
              <LogoTypeCard
                option={opt}
                selected={form.logoTypePreference === opt.value}
                onSelect={() => set("logoTypePreference", form.logoTypePreference === opt.value ? "" : opt.value)}
              />
            </div>
          ))}
        </div>
      </SelectorLightbox>

      <QDivider />
      <QL>{t[lang].q25Label}</QL>
      <ExTrigger qKey="logosAdmired" onOpen={setExampleModal} />
      <TArea value={form.logosAdmired} onChange={(v) => set("logosAdmired", v)} rows={3} placeholder="Brand names, Instagram handles, or URLs. What do you love about them?…" />

      <QDivider />
      <QL>{t[lang].q26Label}</QL>
      <TArea value={form.logosDisliked} onChange={(v) => set("logosDisliked", v)} rows={3} placeholder="What about them doesn't work for you?…" />

      <QDivider />
      <QL>{t[lang].q27Label}</QL>
      <SelectorTrigger
        placeholder="Select motifs (optional) →"
        selectedChips={motifsSelected.filter(l => l !== "Other — describe")}
        onClick={() => setOpenLightbox("motifs")}
        isOpen={openLightbox === "motifs"}
        isMulti
      />
      <SelectorLightbox
        isOpen={openLightbox === "motifs"}
        onClose={() => setOpenLightbox(null)}
        title={pack.motifsLightboxTitle}
        footer={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button type="button" onClick={() => setOpenLightbox(null)}
              style={{
                flex: 1, padding: "12px 24px", borderRadius: 10, border: "none",
                background: "#0d9488", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              {motifsSelected.filter(l => l !== "Other — describe").length > 0
                ? `Done — ${motifsSelected.filter(l => l !== "Other — describe").length} selected`
                : "Done"}
            </button>
            {motifsSelected.length > 0 && (
              <button type="button" onClick={() => setMotifsSelected([])}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#9ca3af", padding: 0, whiteSpace: "nowrap" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
              >Clear all</button>
            )}
          </div>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {pack.motifOptions.map((m) => (
            <MotifChip
              key={m.label}
              symbol={m.icon}
              label={m.label}
              selected={motifsSelected.includes(m.label)}
              onToggle={() => setMotifsSelected(prev =>
                prev.includes(m.label) ? prev.filter(x => x !== m.label) : [...prev, m.label]
              )}
            />
          ))}
          <MotifChip
            symbol={<span style={{ fontSize: 24, color: "#6b7280", fontWeight: 300 }}>+</span>}
            label="Other — describe"
            selected={motifsSelected.includes("Other — describe")}
            onToggle={() => setMotifsSelected(prev =>
              prev.includes("Other — describe") ? prev.filter(x => x !== "Other — describe") : [...prev, "Other — describe"]
            )}
            dashed
          />
        </div>
      </SelectorLightbox>
      <div style={{
        opacity: motifsSelected.includes("Other — describe") ? 1 : 0,
        maxHeight: motifsSelected.includes("Other — describe") ? 200 : 0,
        overflow: "hidden",
        marginTop: motifsSelected.includes("Other — describe") ? 12 : 0,
        pointerEvents: motifsSelected.includes("Other — describe") ? "auto" : "none",
        transition: "opacity 0.2s ease, max-height 0.2s ease, margin-top 0.2s ease",
      }}>
        <TArea value={motifsOther} onChange={(v) => setMotifsOther(v)} placeholder="Describe the symbol or motif you have in mind…" />
      </div>

      <QDivider />
      <QL>{t[lang].q28Label}</QL>
      <SelectorTrigger
        placeholder={pack.culturalCueTriggerPlaceholder}
        selectedChips={cultureSelected ? [cultureSelected] : []}
        onClick={() => setOpenLightbox("culture")}
        isOpen={openLightbox === "culture"}
      />
      <SelectorLightbox
        isOpen={openLightbox === "culture"}
        onClose={() => setOpenLightbox(null)}
        title={pack.culturalCueLightboxTitle}
        footer={
          <button type="button" disabled={!cultureSelected} onClick={() => setOpenLightbox(null)}
            style={{
              width: "100%", padding: "12px 24px", borderRadius: 10, border: "none",
              background: cultureSelected ? "#0d9488" : "#e5e7eb",
              color: cultureSelected ? "#fff" : "#9ca3af",
              fontSize: 14, fontWeight: 600,
              cursor: cultureSelected ? "pointer" : "default",
            }}
          >Confirm selection</button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ alignItems: "stretch" }}>
          {pack.culturalCueRenderStyle === "moodboard"
            ? pack.culturalCueCards.map((card) => (
                <MoodBoardCultureCard
                  key={card.title}
                  title={card.title}
                  desc={card.desc}
                  selected={cultureSelected === card.title}
                  onSelect={() => setCultureSelected(p => p === card.title ? "" : card.title)}
                  imageSrc={card.imageSrc}
                  gradient={card.gradient ?? ""}
                  tintColor={card.tintColor ?? "#ffffff"}
                  chips={card.chips ?? []}
                />
              ))
            : pack.culturalCueCards.map((card) => (
                <CultureCard
                  key={card.title}
                  title={card.title}
                  desc={card.desc}
                  selected={cultureSelected === card.title}
                  onSelect={() => setCultureSelected(p => p === card.title ? "" : card.title)}
                  visual={card.visual}
                />
              ))}
          <CultureCard
            selected={cultureSelected === "Other — I'll describe"}
            onSelect={() => setCultureSelected(p => p === "Other — I'll describe" ? "" : "Other — I'll describe")}
            title="Other — I'll describe"
            desc=""
            dashed
            visual={
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M20 4L24 8L10 22H6V18L20 4Z" stroke="#6b7280" strokeWidth="1.5" strokeLinejoin="round"/>
                <line x1="17" y1="7" x2="21" y2="11" stroke="#6b7280" strokeWidth="1.5"/>
              </svg>
            }
          />
        </div>
      </SelectorLightbox>
      <div style={{
        opacity: cultureSelected === "Other — I'll describe" ? 1 : 0,
        maxHeight: cultureSelected === "Other — I'll describe" ? 200 : 0,
        overflow: "hidden",
        marginTop: cultureSelected === "Other — I'll describe" ? 12 : 0,
        pointerEvents: cultureSelected === "Other — I'll describe" ? "auto" : "none",
        transition: "opacity 0.2s ease, max-height 0.2s ease, margin-top 0.2s ease",
      }}>
        <TArea value={cultureOther} onChange={(v) => setCultureOther(v)} placeholder="Describe the cultural direction you have in mind…" />
      </div>

      {/* Visual references upload */}
      <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", marginTop: 24, marginBottom: 6, fontFamily: qlFont }}>
        {t[lang].q29Label}
      </p>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12, fontFamily: qlFont }}>
        {t[lang].q29Hint}
      </p>
      <label
        onDragOver={(e) => { e.preventDefault(); setVisualRefsDragOver(true); }}
        onDragLeave={() => setVisualRefsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setVisualRefsDragOver(false);
          const dropped = Array.from(e.dataTransfer.files);
          const next = [...visualRefs, ...dropped].slice(0, 5);
          if ([...visualRefs, ...dropped].length > 5) setVisualRefsError("Maximum 5 files allowed");
          else setVisualRefsError("");
          setVisualRefs(next);
        }}
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 8, borderRadius: 12, padding: "32px 24px", cursor: "pointer", textAlign: "center",
          border: `2px dashed ${visualRefsDragOver ? "#0d9488" : "rgba(0,0,0,0.15)"}`,
          background: visualRefsDragOver ? "#f0faf9" : "#f8f7f5",
          transition: "border-color 0.15s ease, background 0.15s ease",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ color: "#9ca3af" }}>
          <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="1.5" />
          <path d="M14 19V9M9 14l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p style={{ fontSize: 14, color: "#4a4a4a", margin: 0 }}>Drag files here or click to browse</p>
        <p style={{ fontSize: 12, color: "#9ca3af", margin: 0, marginTop: 4 }}>JPG, PNG, PDF, GIF · Up to 5 files · 10MB each</p>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.pdf,.gif"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            const next = [...visualRefs, ...picked].slice(0, 5);
            if ([...visualRefs, ...picked].length > 5) setVisualRefsError("Maximum 5 files allowed");
            else setVisualRefsError("");
            setVisualRefs(next);
            e.target.value = "";
          }}
        />
      </label>
      {visualRefsError && (
        <p style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>{visualRefsError}</p>
      )}
      {visualRefs.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {visualRefs.map((f, i) => (
            <div key={i} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "#ffffff", border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: 20, padding: "6px 12px",
            }}>
              <span style={{ fontSize: 12, color: "#1a1a1a", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {f.name}
              </span>
              <span style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>
                {(f.size / 1024 / 1024).toFixed(1)} MB
              </span>
              <button
                type="button"
                onClick={() => setVisualRefs((prev) => prev.filter((_, j) => j !== i))}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#9ca3af", fontSize: 16, lineHeight: 1 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
                aria-label={`Remove ${f.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </>,

    // Step 5 — Practical Details
    <>
      <SHead num="06" title={t[lang].s6Title} />

      <QL>{t[lang].q30Label}</QL>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
        {USAGE.map((o) => (
          <CbOpt key={o} label={o} checked={form.usageChannels.includes(o)} onToggle={() => toggleArr("usageChannels", o)} />
        ))}
      </div>

      <QDivider />
      <QL>{t[lang].q31Label}</QL>
      <Hint>{t[lang].q31Hint}</Hint>
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); setFiles(e.dataTransfer.files); }}
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 8, borderRadius: 10, padding: "28px 20px", cursor: "pointer", textAlign: "center",
          border: `2px dashed ${dragOver ? C.accent : "rgba(0,0,0,0.15)"}`,
          background: dragOver ? C.accentLight : C.surface2,
          transition: "all 0.18s",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ color: C.textMuted }}>
          <path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="17,8 12,3 7,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 13, color: C.textMuted, lineHeight: "20px" }}>
          {files && files.length > 0
            ? `${files.length} file${files.length > 1 ? "s" : ""} selected — click to change`
            : "Click or drag files here to upload"}
        </span>
        {files && files.length > 0 && (
          <div style={{ marginTop: 2 }}>
            {Array.from(files).map((f) => (
              <p key={f.name} style={{ fontSize: 12, color: C.accent, lineHeight: "18px" }}>{f.name}</p>
            ))}
          </div>
        )}
        <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.zip" onChange={(e) => setFiles(e.target.files)} style={{ display: "none" }} />
      </label>

      <QDivider />
      <QL>{t[lang].q32Label}</QL>
      <Hint>{t[lang].q32Hint}</Hint>
      <TInput value={form.projectTimeline} onChange={(v) => set("projectTimeline", v)} placeholder="e.g. Needed by June 2025 for a summer launch" />

      <QDivider />
      <QL>{t[lang].q33Label}</QL>
      <Hint>{t[lang].q33Hint}</Hint>
      {["₹25k–50k", "₹50k–1L", "₹1L–2L", "₹2L–3.5L", "₹3.5L+", "Open to discuss"].map((o) => (
        <RadioOpt key={o} label={o} checked={form.budget === o} onSelect={() => set("budget", o)} />
      ))}

      <QDivider />
      <QL>{t[lang].q34Label}</QL>
      <Hint>{t[lang].q34Hint}</Hint>
      <TInput value={form.decisionMaker} onChange={(v) => set("decisionMaker", v)} placeholder="e.g. Myself, My partner and I, Founder + co-founder" />

      <QDivider />
      <QL>{t[lang].q35Label}</QL>
      <Hint>{t[lang].q35Hint}</Hint>
      <TInput value={form.preferredComm} onChange={(v) => set("preferredComm", v)} placeholder="e.g. WhatsApp, Email, Video calls on weekends" />
    </>,

    // Step 6 — Final Thoughts
    <>
      <SHead num="07" title={t[lang].s7Title} />

      <QL>{t[lang].q36Label}</QL>
      <Hint>{t[lang].q36Hint}</Hint>
      <ExTrigger qKey="personalSymbolic" onOpen={setExampleModal} />
      <TArea value={form.personalSymbolic} onChange={(v) => set("personalSymbolic", v)} placeholder="A family name, a city, a material, a memory, a number — anything that means something to you…" />

      <QDivider />
      <QL>{t[lang].q37Label}</QL>
      <Hint>{t[lang].q37Hint}</Hint>
      <TArea value={form.anythingElse} onChange={(v) => set("anythingElse", v)} placeholder="An honest concern, a past experience, something you loved or hated in a previous branding project…" />

      <div style={{ height: 1, background: C.border, margin: "24px 0" }} />
      <p style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 18, fontFamily: qlFont }}>{t[lang].q38Label}</p>

      <div style={{ marginBottom: 16 }}>
        <QL required>Full name</QL>
        <TInput id="field-name" value={form.fullName} onChange={(v) => set("fullName", v)} placeholder="Your name as you'd like to be addressed" required hasError={!!errs.fullName} />
        {errs.fullName && <FErr msg={errs.fullName} />}
      </div>

      <div style={{ marginBottom: 16 }}>
        <QL required>Email address</QL>
        <TInput id="field-email" type="email" value={form.email} onChange={(v) => set("email", v)} placeholder="you@example.com" required hasError={!!errs.email} />
        {errs.email && <FErr msg={errs.email} />}
      </div>

      <div>
        <QL required>Phone / WhatsApp</QL>
        <TInput id="field-phone" type="tel" value={form.phone} onChange={(v) => set("phone", v)} placeholder="+91 98XXX XXXXX" required hasError={!!errs.phone} />
        {errs.phone && <FErr msg={errs.phone} />}
      </div>
    </>,
  ];

  return (
    <FontCtx.Provider value={qlFont}>
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: qlFont, color: C.text }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
        @keyframes pulseProgress {
          0% { opacity: 0.85; box-shadow: 0 0 0 rgba(13,148,136,0); filter: brightness(1); }
          40% { opacity: 1; box-shadow: 0 0 14px rgba(13,148,136,0.75); filter: brightness(1.25); }
          100% { opacity: 0; box-shadow: 0 0 0 rgba(13,148,136,0); filter: brightness(1); }
        }
        ::placeholder { color: #9ca3af; }
      `}</style>

      {exampleModal && (
        <ExampleModal
          qKey={exampleModal}
          onClose={() => setExampleModal(null)}
          examples={pack.examples}
          logoTypeIntro={pack.logoTypeExampleIntro}
          packKey={packKey}
        />
      )}
      <TopBar step={step} pulseKey={progressPulseKey} />

      {/* Step-completion toast (top-center, slides down + fades) */}
      {stepToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            top: 80,
            left: "50%",
            zIndex: 250,
            background: "#ffffff",
            border: `1.5px solid rgba(13,148,136,0.30)`,
            borderRadius: 100,
            padding: "10px 22px",
            boxShadow: "0 8px 28px rgba(0,0,0,0.10)",
            fontSize: 14,
            fontWeight: 500,
            color: C.text,
            fontFamily: qlFont,
            whiteSpace: "nowrap",
            maxWidth: "calc(100vw - 32px)",
            opacity: stepToastOpacity,
            transform: stepToastOpacity ? "translate(-50%, 0)" : "translate(-50%, -12px)",
            transition: "opacity 0.35s ease, transform 0.35s ease",
            pointerEvents: "none",
          }}
        >
          {stepToast}
        </div>
      )}


      {/* Scroll anchor */}
      <div ref={topRef} style={{ position: "absolute", top: 0 }} />

      {/* Header */}
      <header style={{ borderBottom: `1px solid ${C.border}`, background: C.surface, padding: "0 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "15px 0", display: "flex", alignItems: "center" }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <img src={eswarLogo} alt="Eswar Creatives" style={{ width: 32, height: 32 }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: C.text, lineHeight: "20px" }}>Eswar Creatives</span>
          </Link>
        </div>
      </header>

      {/* Intro */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "44px 24px 32px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
          <div style={{
            display: "inline-block", background: C.accentLight,
            border: `1px solid rgba(13,148,136,0.25)`,
            borderRadius: 20, padding: "4px 14px", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.07em", textTransform: "uppercase", color: C.accent,
          }}>
            {t[lang].pageEyebrow}
          </div>
          {/* Language toggle */}
          <div style={{ display: "inline-flex", background: "#f0eeea", borderRadius: 100, padding: 4 }}>
            {(["en", "ta"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                style={{
                  borderRadius: 100, padding: "6px 16px", fontSize: 13, border: "none",
                  fontWeight: lang === l ? 600 : 400,
                  background: lang === l ? "#ffffff" : "transparent",
                  color: lang === l ? C.accent : "#6b7280",
                  boxShadow: lang === l ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                  cursor: "pointer", transition: "all 0.15s ease",
                  fontFamily: l === "ta" ? "'Noto Sans Tamil', sans-serif" : "var(--font-family-primary)",
                }}
              >
                {l === "en" ? "EN" : "தமிழ்"}
              </button>
            ))}
          </div>
        </div>

        {/* Selected-tier pill — shown when /services/branding sent ?tier= */}
        {selectedTier && (
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexWrap: "wrap", gap: 10,
              background: "#fbf6e8",
              border: "1px solid #d6c79e",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 18,
              fontSize: 13.5,
              lineHeight: "20px",
              color: "#6b5938",
              fontFamily: qlFont,
            }}
          >
            <span>
              You&rsquo;re starting with the{" "}
              <strong style={{ color: "#2a1f14", fontWeight: 600 }}>
                {selectedTier.name}
              </strong>{" "}
              package
              <span style={{ color: "#8b7548" }}> — from {selectedTier.price}</span>
            </span>
            <Link
              to="/services/branding"
              style={{
                color: "#a67932",
                textDecoration: "underline",
                textUnderlineOffset: 2,
                fontWeight: 600,
                fontSize: 12.5,
                whiteSpace: "nowrap",
              }}
            >
              Change plan
            </Link>
          </div>
        )}

        <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: "42px", color: C.text, marginBottom: 12, fontFamily: qlFont }}>
          {t[lang].pageTitle}
        </h1>
        <p style={{ fontSize: 16, lineHeight: "26px", color: C.textSoft, maxWidth: 520, marginBottom: 6, fontFamily: qlFont }}>
          {t[lang].pageSubtitle}
        </p>
        <p style={{ fontSize: 13, lineHeight: "20px", color: C.textMuted, fontFamily: qlFont }}>
          {t[lang].pageNote}
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator step={step} titles={sectionTitles} />

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px 80px" }}>

        {/* Honeypot — invisible to real users */}
        <div style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }} aria-hidden="true">
          <label>Website (leave blank)</label>
          <input type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)} />
        </div>
        <input name="_gotcha" tabIndex={-1} value="" readOnly style={{ display: 'none' }} />
        <input name="_replyto" value={form.email || ''} readOnly style={{ display: 'none' }} />

        {/* Restoration banner */}
        {showRestorationBanner && (
          <div style={{
            background: '#fef3e2', borderLeft: '4px solid #d4a574',
            padding: '14px 18px', borderRadius: '0 8px 8px 0',
            fontSize: 14, color: '#4a423d', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <span>Welcome back — your previous answers have been restored.</span>
            <button
              type="button"
              onClick={() => setShowRestorationBanner(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#4a423d', lineHeight: 1, padding: 0, flexShrink: 0 }}
              aria-label="Dismiss"
            >×</button>
          </div>
        )}

        {/* Animated section card */}
        <div
          key={step}
          style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
            padding: "32px 28px", marginBottom: 20,
            animation: "fadeSlideIn 0.3s ease",
          }}
        >
          {sectionContent[step]}
        </div>

        {/* Error banner on final step */}
        {step === 6 && status === "error" && (
          <div style={{
            background: "#fef2f2", border: `1px solid rgba(220,38,38,0.25)`, borderRadius: 10,
            padding: "14px 18px", marginBottom: 20, fontSize: 14, lineHeight: "20px", color: C.error,
          }}>
            Something didn&apos;t go through. Your answers are saved on this device — please try again or write to{" "}
            <a href="mailto:eswar@eswarcreatives.in" style={{ color: C.error, fontWeight: 600 }}>eswar@eswarcreatives.in</a>.
          </div>
        )}

        {/* Navigation row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: step > 0 ? "space-between" : "flex-end" }}>
          {step > 0 && (
            <button
              type="button"
              onClick={handleBack}
              style={{
                background: "none", border: "none", padding: "8px 4px", cursor: "pointer",
                fontSize: 14, color: C.textMuted, display: "flex", alignItems: "center", gap: 6,
                fontFamily: qlFont,
              }}
              onMouseOver={(e) => { e.currentTarget.style.color = C.textSoft; }}
              onMouseOut={(e) => { e.currentTarget.style.color = C.textMuted; }}
            >
              {t[lang].back}
            </button>
          )}

          {step < 6 ? (
            <button
              type="button"
              onClick={handleContinue}
              style={{
                background: C.accent, color: "#fff", border: "none", borderRadius: 8,
                padding: "14px 32px", fontSize: 15, fontWeight: 600, lineHeight: "20px",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                transition: "background 0.18s", fontFamily: qlFont,
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = C.accentDark; }}
              onMouseOut={(e) => { e.currentTarget.style.background = C.accent; }}
            >
              {lang === "en" ? (
                <>
                  Continue
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12H19M13 6L19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              ) : t[lang].continue}
            </button>
          ) : (
            <button
              type="submit"
              disabled={status === "submitting"}
              style={{
                background: status === "submitting" ? C.accentDark : C.accent,
                color: "#fff", border: "none", borderRadius: 8,
                padding: "14px 32px", fontSize: 15, fontWeight: 600, lineHeight: "20px",
                cursor: status === "submitting" ? "not-allowed" : "pointer",
                opacity: status === "submitting" ? 0.8 : 1,
                pointerEvents: status === "submitting" ? "none" : "auto",
                animation: status === "submitting" ? "pulse 0.8s ease-in-out infinite" : "none",
                display: "flex", alignItems: "center", gap: 10,
                transition: "background 0.18s", fontFamily: qlFont,
              }}
              onMouseOver={(e) => { if (status !== "submitting") e.currentTarget.style.background = C.accentDark; }}
              onMouseOut={(e) => { if (status !== "submitting") e.currentTarget.style.background = C.accent; }}
            >
              {status === "submitting" ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}>
                    <circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                    <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="2" strokeDasharray="50 30" strokeLinecap="round" />
                  </svg>
                  Sending…
                </>
              ) : (
                <>
                  {t[lang].submit}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12H19M13 6L19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: C.textMuted, lineHeight: "16px" }}>
          {step < 6 ? `${6 - step} section${6 - step !== 1 ? "s" : ""} remaining` : "We'll review your brief within three working days."}
        </p>
      </form>
    </div>

      {/* Autosave toast */}
      {autosaveToastVisible && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 300,
          background: '#1a1a1a', color: 'white',
          fontSize: 12, padding: '8px 16px', borderRadius: 20,
          opacity: autosaveToastOpacity,
          transition: 'opacity 0.4s ease',
          pointerEvents: 'none',
        }}>
          ✓ Draft saved
        </div>
      )}
    </FontCtx.Provider>
  );
}
