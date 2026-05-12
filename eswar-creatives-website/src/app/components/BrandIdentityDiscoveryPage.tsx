import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router";
import eswarLogo from "../../imports/eswar-logo.svg";

// ── Formspree ──────────────────────────────────────────────────────
const FORMSPREE_ID = "maqvagwj";

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

// ── Example answers for complex questions ─────────────────────────
const EXAMPLES: Record<string, string> = {
  whatYouDo:
    "We design and style floral installations for South Indian weddings — from the wedding mandap and car decoration to the reception stage and centrepieces. Most of our clients are Tamil and Telugu families in Chennai planning weddings of 200–800 guests.",
  successIn3Years:
    "We are the first name Chennai wedding families think of when they want florals that feel both traditional and elevated. We have a team of 8, a studio in Nungambakkam, and we're featured regularly in WedMeGood and The Wedding Brigade.",
  idealClient:
    "A bride in her late 20s or early 30s, Chennai-based, planning a wedding in the next 6–12 months. She's researching vendors on Instagram and WedMeGood. Her mother is involved in decisions. Budget is mid-to-premium. She wants something that feels personal, not generic.",
  clientFrustrations:
    "Most florists show generic catalogue packages. Clients feel like they can't customise anything, and nobody explains why a design costs what it costs. They feel like they're buying blind.",
  brandAsPerson:
    "She's a well-travelled South Indian woman in her 40s — confident, quietly elegant, never loud. She wears a good silk saree as easily as she wears linen. She has strong opinions but shares them gently. She knows quality when she sees it.",
  brandPromise:
    "We make the spaces where your family's most important moments happen feel as beautiful as those moments deserve.",
  differentFrom:
    "We're the only florist in Chennai who does a full site visit before quoting — we design for your specific venue lighting, not a generic room. And we've never repeated a stage design.",
  logosAdmired:
    "1. Sabyasachi — the way the logo feels rooted and handcrafted without being fussy.\n2. The Leela Hotels — restrained, confident, instantly South Indian without being literal.\n3. Tanishq — the script feels warm and trustworthy.",
  personalSymbolic:
    "My grandmother always wore a single jasmine strand, never a full gajra. I'd love if there was something in the brand that quietly referenced that — maybe a single stem rather than a full bloom.",
};

// ── Example modal ──────────────────────────────────────────────────
function ExampleModal({ qKey, onClose }: { qKey: string; onClose: () => void }) {
  const text = EXAMPLES[qKey] ?? "";
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
            Here's how another client answered this
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
          <p style={{
            fontSize: 15, lineHeight: "26px", color: C.textSoft,
            whiteSpace: "pre-line",
          }}>
            "{text}"
          </p>
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
function TopBar({ step }: { step: number }) {
  const pct = Math.round(((step + 1) / 7) * 100);
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 100, background: "#e5e7eb" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: C.accent, transition: "width 0.4s ease" }} />
    </div>
  );
}

// ── Step indicator ─────────────────────────────────────────────────
function StepIndicator({ step }: { step: number }) {
  const s = SECTIONS[step];
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px 28px" }}>
      {/* Desktop */}
      <div className="hidden sm:block">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: C.text }}>
            Section {step + 1} of 7 — {s.title}
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
          Step {step + 1} / 7 — {s.title}
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
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 28 }}>
      <span style={{
        fontFamily: "var(--font-family-primary)", fontSize: 48, fontWeight: 500,
        lineHeight: 1, color: C.accent, letterSpacing: "-0.04em", userSelect: "none",
      }}>{num}</span>
      <h2 style={{
        fontFamily: "var(--font-family-primary)", fontSize: 20, fontWeight: 600,
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
  return (
    <label style={{
      display: "block", fontFamily: "var(--font-family-primary)", fontSize: 14,
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
        borderRadius: 8, padding: "12px 14px", resize: "vertical",
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
  return (
    <p style={{ fontSize: 13, color: C.textMuted, lineHeight: "18px", marginBottom: 8 }}>
      {children}
    </p>
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
  typographyDir: string; logosAdmired: string; logosDisliked: string;
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
  typographyDir: "", logosAdmired: "", logosDisliked: "",
  motifsElements: "", culturalCues: "",
  usageChannels: [], projectTimeline: "",
  budget: "", decisionMaker: "", preferredComm: "",
  personalSymbolic: "", anythingElse: "",
  fullName: "", email: "", phone: "",
};

// ── Success screen ─────────────────────────────────────────────────
function SuccessScreen() {
  return (
    <div style={{
      minHeight: "100vh", background: C.bg, fontFamily: "var(--font-family-primary)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px",
    }}>
      <div style={{
        background: C.surface, borderRadius: 20, padding: "52px 40px",
        maxWidth: 520, width: "100%", textAlign: "center",
        boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: `${C.success}14`, border: `2px solid ${C.success}40`,
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px",
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17L4 12" stroke={C.success} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: C.text, marginBottom: 14 }}>
          Brief received.
        </h1>
        <p style={{ fontSize: 15, lineHeight: "26px", color: C.textSoft, marginBottom: 36 }}>
          We'll review your answers carefully and come back within three working days with our initial brand direction and a transparent quote.
        </p>
        <a
          href="https://eswarcreatives.in"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: C.accent, color: "#fff", borderRadius: 8,
            padding: "12px 28px", fontSize: 14, fontWeight: 600, textDecoration: "none",
          }}
        >
          Back to eswarcreatives.in
        </a>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────
export function BrandIdentityDiscoveryPage() {
  const [form, setForm] = useState<FS>(BLANK);
  const [files, setFiles] = useState<FileList | null>(null);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);
  const [exampleModal, setExampleModal] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

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
    if (metaDesc) metaDesc.setAttribute("content", "Tell us about your business, your vision, and the soul of the work you do. Eswar Creatives will review your brief within three working days.");
    return () => {
      document.documentElement.style.background = prevBg;
      document.body.style.background = "";
    };
  }, []);

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
    setStep((s) => s + 1);
    topRef.current?.scrollIntoView({ behavior: "smooth" });
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
    setStatus("submitting");
    try {
      const fd = new FormData();
      const fields: [string, string][] = [
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
        ["23. Logos Admired", form.logosAdmired],
        ["24. Logos Disliked", form.logosDisliked],
        ["25. Symbols & Motifs", form.motifsElements],
        ["26. Cultural Cues", form.culturalCues],
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
      for (const [k, v] of fields) fd.append(k, v);
      if (files) {
        for (let i = 0; i < files.length; i++) fd.append("28. Existing Assets", files[i]);
      }
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST", body: fd, headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") return <SuccessScreen />;

  const CHANNELS = ["Instagram", "Word of mouth", "Google search", "Referrals from vendors", "Wedding expos", "Other"];
  const FEELINGS = ["Calm and cared for", "Excited and inspired", "Confident and assured", "Moved and emotional", "Seen and understood", "Something else"];
  const USAGE = ["Instagram & social", "Website", "Signage at venues", "Printed invitations", "Vehicle branding", "Staff uniforms", "Business cards", "Gift packaging", "Brochures & decks"];

  // ── Section content ──────────────────────────────────────────────
  const sectionContent = [
    // Step 0 — The Business
    <>
      <SHead num="01" title="The Business" />

      <QL required>Business name</QL>
      <TInput value={form.businessName} onChange={(v) => set("businessName", v)} placeholder="e.g. Blooms by Meera" hasError={!!errs.businessName} />
      {errs.businessName && <FErr msg={errs.businessName} />}

      <QDivider />
      <QL>Tagline (if you have one)</QL>
      <TInput value={form.tagline} onChange={(v) => set("tagline", v)} placeholder="e.g. Floral art for life's most beautiful moments" />

      <QDivider />
      <QL>What do you do? Tell us about your work.</QL>
      <ExTrigger qKey="whatYouDo" onOpen={setExampleModal} />
      <TArea value={form.whatYouDo} onChange={(v) => set("whatYouDo", v)} placeholder="Describe what you do, who you serve, and what makes your work special…" />

      <QDivider />
      <QL>How long have you been in business?</QL>
      {["Pre-launch", "Under 2 years", "2–5 years", "5+ years"].map((o) => (
        <RadioOpt key={o} label={o} checked={form.businessStage === o} onSelect={() => set("businessStage", o)} />
      ))}

      <QDivider />
      <QL>Where do you operate?</QL>
      {["Local Chennai", "Tamil Nadu-wide", "Pan-India", "International"].map((o) => (
        <RadioOpt key={o} label={o} checked={form.operationArea === o} onSelect={() => set("operationArea", o)} />
      ))}

      <QDivider />
      <QL>What does success look like in 3 years?</QL>
      <ExTrigger qKey="successIn3Years" onOpen={setExampleModal} />
      <TArea value={form.successIn3Years} onChange={(v) => set("successIn3Years", v)} placeholder="Paint us a picture of where you want to be…" />
    </>,

    // Step 1 — The Audience
    <>
      <SHead num="02" title="The Audience" />

      <QL>Describe your ideal client in detail.</QL>
      <ExTrigger qKey="idealClient" onOpen={setExampleModal} />
      <TArea value={form.idealClient} onChange={(v) => set("idealClient", v)} placeholder="Age, lifestyle, values, what they care about most when hiring someone like you…" />

      <QDivider />
      <QL>Price point</QL>
      {["Budget-conscious", "Mid-range", "Premium", "Luxury", "Mixed"].map((o) => (
        <RadioOpt key={o} label={o} checked={form.pricePoint === o} onSelect={() => set("pricePoint", o)} />
      ))}

      <QDivider />
      <QL>Where do clients find you?</QL>
      {CHANNELS.map((o) => (
        <CbOpt key={o} label={o} checked={form.clientChannels.includes(o)} onToggle={() => toggleArr("clientChannels", o)} />
      ))}

      <QDivider />
      <QL>What's the biggest frustration clients have with similar businesses?</QL>
      <ExTrigger qKey="clientFrustrations" onOpen={setExampleModal} />
      <TArea value={form.clientFrustrations} onChange={(v) => set("clientFrustrations", v)} placeholder="What do clients complain about with your competitors?…" />

      <QDivider />
      <QL>What do clients say after working with you?</QL>
      <TArea value={form.clientFeedback} onChange={(v) => set("clientFeedback", v)} placeholder="Actual words, reviews, or the essence of what they share…" />
    </>,

    // Step 2 — The Brand Soul
    <>
      <SHead num="03" title="The Brand Soul" />

      <QL>Three words that describe your brand personality</QL>
      <TInput value={form.brandWords} onChange={(v) => set("brandWords", v)} placeholder="e.g. Warm, Refined, Celebratory" />

      <QDivider />
      <QL>Three words you want to AVOID</QL>
      <TInput value={form.avoidWords} onChange={(v) => set("avoidWords", v)} placeholder="e.g. Cheap, Loud, Generic" />

      <QDivider />
      <QL>If your brand were a person, describe them.</QL>
      <ExTrigger qKey="brandAsPerson" onOpen={setExampleModal} />
      <TArea value={form.brandAsPerson} onChange={(v) => set("brandAsPerson", v)} placeholder="Their style, how they speak, what they wear, how they make people feel…" />

      <QDivider />
      <QL>What feeling should clients have when they encounter your brand?</QL>
      {FEELINGS.map((o) => (
        <CbOpt key={o} label={o} checked={form.clientFeelings.includes(o)} onToggle={() => toggleArr("clientFeelings", o)} />
      ))}
      {form.clientFeelings.includes("Something else") && (
        <div style={{ marginTop: 8 }}>
          <TInput value={form.clientFeelingsOther} onChange={(v) => set("clientFeelingsOther", v)} placeholder="Describe the feeling…" />
        </div>
      )}

      <QDivider />
      <QL>If your brand were a place, which comes closest?</QL>
      {["A curated boutique hotel", "A lush private garden", "A sun-filled studio", "A grand heritage hall", "A quiet Tamil home", "Other"].map((o) => (
        <RadioOpt key={o} label={o} checked={form.brandAsPlace === o} onSelect={() => set("brandAsPlace", o)} />
      ))}

      <QDivider />
      <QL>In one sentence, what is your brand promise?</QL>
      <ExTrigger qKey="brandPromise" onOpen={setExampleModal} />
      <TArea value={form.brandPromise} onChange={(v) => set("brandPromise", v)} rows={3} placeholder="The core promise you make to every client who works with you…" />
    </>,

    // Step 3 — Competitors & Positioning
    <>
      <SHead num="04" title="Competitors & Positioning" />

      <QL>Name 3 competitors or peers you respect</QL>
      <TArea value={form.competitors} onChange={(v) => set("competitors", v)} rows={3} placeholder="Business names, Instagram handles, or websites — and what you admire about them…" />

      <QDivider />
      <QL>What makes you genuinely different?</QL>
      <ExTrigger qKey="differentFrom" onOpen={setExampleModal} />
      <TArea value={form.differentFrom} onChange={(v) => set("differentFrom", v)} placeholder="Not just 'we care more' — what is the actual difference in your work, approach, or result?…" />

      <QDivider />
      <QL>What do clients sometimes choose competitors for, over you?</QL>
      <TArea value={form.competitorReasons} onChange={(v) => set("competitorReasons", v)} placeholder="Be honest — this helps us position you clearly…" />

      <QDivider />
      <QL>Where do you want to be positioned in the market?</QL>
      {["Most affordable", "Best value", "Premium quality", "Absolute luxury"].map((o) => (
        <RadioOpt key={o} label={o} checked={form.positioning === o} onSelect={() => set("positioning", o)} />
      ))}

      <QDivider />
      <QL>What should clients never think or say about you?</QL>
      <TArea value={form.neverThink} onChange={(v) => set("neverThink", v)} rows={3} placeholder="What perception would be the worst thing for your brand?…" />
    </>,

    // Step 4 — Visual Direction
    <>
      <SHead num="05" title="Visual Direction" />

      <QL>Typography direction — which feels most like you?</QL>
      {["Classic serif", "Modern serif", "Hand-lettered script", "Clean sans-serif", "Mixed — trust your judgment"].map((o) => (
        <RadioOpt key={o} label={o} checked={form.typographyDir === o} onSelect={() => set("typographyDir", o)} />
      ))}

      <QDivider />
      <QL>Logos you admire — share 3 to 5 examples</QL>
      <ExTrigger qKey="logosAdmired" onOpen={setExampleModal} />
      <TArea value={form.logosAdmired} onChange={(v) => set("logosAdmired", v)} rows={3} placeholder="Brand names, Instagram handles, or URLs. What do you love about them?…" />

      <QDivider />
      <QL>Logos or visual styles you dislike — share 2 to 3</QL>
      <TArea value={form.logosDisliked} onChange={(v) => set("logosDisliked", v)} rows={3} placeholder="What about them doesn't work for you?…" />

      <QDivider />
      <QL>Any symbols, motifs, or floral elements you'd like explored?</QL>
      <TArea value={form.motifsElements} onChange={(v) => set("motifsElements", v)} rows={3} placeholder="e.g. jasmine, lotus, kolam patterns, temple pillars — or 'keep it abstract'…" />

      <QDivider />
      <QL>Cultural & regional cues to consider</QL>
      <TArea value={form.culturalCues} onChange={(v) => set("culturalCues", v)} rows={3} placeholder="Tamil Nadu heritage, specific regional identity, or 'keep it pan-India'…" />
    </>,

    // Step 5 — Practical Details
    <>
      <SHead num="06" title="Practical Details" />

      <QL>Where will this identity be used?</QL>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
        {USAGE.map((o) => (
          <CbOpt key={o} label={o} checked={form.usageChannels.includes(o)} onToggle={() => toggleArr("usageChannels", o)} />
        ))}
      </div>

      <QDivider />
      <QL>Existing logo or visual assets (optional)</QL>
      <Hint>PDF, PNG, JPG, or ZIP — multiple files, up to 25 MB total.</Hint>
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
      <QL>Project timeline</QL>
      <TInput value={form.projectTimeline} onChange={(v) => set("projectTimeline", v)} placeholder="e.g. Needed by June 2025 for a summer launch" />

      <QDivider />
      <QL>Budget range</QL>
      {["₹25k–50k", "₹50k–1L", "₹1L–2L", "₹2L–3.5L", "₹3.5L+", "Open to discuss"].map((o) => (
        <RadioOpt key={o} label={o} checked={form.budget === o} onSelect={() => set("budget", o)} />
      ))}

      <QDivider />
      <QL>Who is the final decision-maker for this project?</QL>
      <TInput value={form.decisionMaker} onChange={(v) => set("decisionMaker", v)} placeholder="e.g. Myself, My partner and I, Founder + co-founder" />

      <QDivider />
      <QL>Preferred way to communicate</QL>
      <TInput value={form.preferredComm} onChange={(v) => set("preferredComm", v)} placeholder="e.g. WhatsApp, Email, Video calls on weekends" />
    </>,

    // Step 6 — Final Thoughts
    <>
      <SHead num="07" title="Final Thoughts" />

      <QL>Anything personal or symbolic you'd like carried into the brand?</QL>
      <ExTrigger qKey="personalSymbolic" onOpen={setExampleModal} />
      <TArea value={form.personalSymbolic} onChange={(v) => set("personalSymbolic", v)} placeholder="A family name, a city, a material, a memory, a number — anything that means something to you…" />

      <QDivider />
      <QL>Anything else you'd like us to know before we begin?</QL>
      <TArea value={form.anythingElse} onChange={(v) => set("anythingElse", v)} placeholder="An honest concern, a past experience, something you loved or hated in a previous branding project…" />

      <div style={{ height: 1, background: C.border, margin: "24px 0" }} />
      <p style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 18 }}>Contact details</p>

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
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "var(--font-family-primary)", color: C.text }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        ::placeholder { color: #9ca3af; }
      `}</style>

      {exampleModal && <ExampleModal qKey={exampleModal} onClose={() => setExampleModal(null)} />}
      <TopBar step={step} />

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
        <div style={{
          display: "inline-block", background: C.accentLight,
          border: `1px solid rgba(13,148,136,0.25)`,
          borderRadius: 20, padding: "4px 14px", fontSize: 11, fontWeight: 700,
          letterSpacing: "0.07em", textTransform: "uppercase", color: C.accent, marginBottom: 18,
        }}>
          Brand Identity Discovery
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: "42px", color: C.text, marginBottom: 12 }}>
          Tell us about your brand.
        </h1>
        <p style={{ fontSize: 16, lineHeight: "26px", color: C.textSoft, maxWidth: 520, marginBottom: 6 }}>
          This brief helps us understand the soul of your business before we begin.
          Take your time — there are no wrong answers.
        </p>
        <p style={{ fontSize: 13, lineHeight: "20px", color: C.textMuted }}>
          We'll review your brief and follow up within three working days.
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator step={step} />

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px 80px" }}>

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
            Something went wrong. Please try again or email{" "}
            <a href="mailto:eswarcreatives@gmail.com" style={{ color: C.error, fontWeight: 600 }}>eswarcreatives@gmail.com</a>.
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
              }}
              onMouseOver={(e) => { e.currentTarget.style.color = C.textSoft; }}
              onMouseOut={(e) => { e.currentTarget.style.color = C.textMuted; }}
            >
              ← Back
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
                transition: "background 0.18s",
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = C.accentDark; }}
              onMouseOut={(e) => { e.currentTarget.style.background = C.accent; }}
            >
              Continue
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12H19M13 6L19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
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
                display: "flex", alignItems: "center", gap: 10,
                transition: "background 0.18s",
              }}
              onMouseOver={(e) => { if (status !== "submitting") e.currentTarget.style.background = C.accentDark; }}
              onMouseOut={(e) => { if (status !== "submitting") e.currentTarget.style.background = C.accent; }}
            >
              {status === "submitting" ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.9s linear infinite" }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Sending your brief…
                </>
              ) : (
                <>
                  Submit Discovery Brief
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
  );
}
