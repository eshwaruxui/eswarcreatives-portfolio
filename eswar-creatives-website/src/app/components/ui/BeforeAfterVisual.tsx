const MONO = "'SF Mono', 'Fira Code', ui-monospace, monospace";

const BEFORE_BTNS = [
  {
    platform: "Web",
    style: {
      padding:      "5px 14px",
      borderRadius: "3px",
      background:   "var(--surface-inverse)",
      color:        "var(--text-inverse)",
      fontSize:     "12px",
      fontWeight:   400,
      border:       "none",
      letterSpacing: "normal",
      textTransform: "none" as const,
    },
  },
  {
    platform: "iOS",
    style: {
      padding:      "5px 14px",
      borderRadius: "99px",
      background:   "transparent",
      color:        "var(--text-tertiary)",
      fontSize:     "11px",
      fontWeight:   700,
      border:       "1.5px dashed var(--text-tertiary)",
      letterSpacing: "0.04em",
      textTransform: "none" as const,
    },
  },
  {
    platform: "Android",
    style: {
      padding:      "4px 10px",
      borderRadius: "0px",
      background:   "var(--text-tertiary)",
      color:        "var(--card)",
      fontSize:     "10px",
      fontWeight:   300,
      border:       "none",
      letterSpacing: "0.12em",
      textTransform: "uppercase" as const,
    },
  },
];

export function BeforeAfterVisual() {
  return (
    <div
      style={{
        display:             "grid",
        gridTemplateColumns: "1fr auto 1fr",
        background:          "var(--card)",
        border:              "1px solid var(--border)",
        borderRadius:        "16px",
        overflow:            "hidden",
        maxWidth:            "520px",
      }}
    >
      {/* Before */}
      <div style={{ padding: "20px 24px" }}>
        <p
          style={{
            fontSize:      "10px",
            fontWeight:    600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color:         "var(--text-tertiary)",
            marginBottom:  "14px",
          }}
        >
          Before
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {BEFORE_BTNS.map(({ platform, style }) => (
            <div key={platform} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  fontSize:   "10px",
                  fontFamily: MONO,
                  color:      "var(--text-tertiary)",
                  minWidth:   "48px",
                  flexShrink: 0,
                }}
              >
                {platform}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-family-primary)",
                  cursor:     "default",
                  display:    "inline-block",
                  ...style,
                }}
              >
                Button
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Arrow divider */}
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "0 12px",
          borderLeft:     "1px solid var(--border)",
          borderRight:    "1px solid var(--border)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path
            d="M2 9h14M11 5l4 4-4 4"
            stroke="var(--text-tertiary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* After */}
      <div style={{ padding: "20px 24px" }}>
        <p
          style={{
            fontSize:      "10px",
            fontWeight:    600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color:         "var(--text-brand)",
            marginBottom:  "14px",
          }}
        >
          After
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {["Web", "iOS", "Android"].map((platform) => (
            <div key={platform} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  fontSize:   "10px",
                  fontFamily: MONO,
                  color:      "var(--text-tertiary)",
                  minWidth:   "48px",
                  flexShrink: 0,
                }}
              >
                {platform}
              </span>
              <span
                style={{
                  fontFamily:   "var(--font-family-primary)",
                  padding:      "5px 14px",
                  borderRadius: "8px",
                  background:   "var(--text-brand)",
                  color:        "var(--text-inverse)",
                  fontSize:     "12px",
                  fontWeight:   600,
                  cursor:       "default",
                  display:      "inline-block",
                }}
              >
                Button
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
