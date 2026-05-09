/**
 * Reusable section header used across portfolio sections.
 * Enforces consistent typography hierarchy and semantic token usage.
 * Uses the SectionLabel primitive for the overline text.
 */
import { SectionLabel } from "./ui/section-label";

export function SectionHeader({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-8">
      <SectionLabel className="mb-2">{label}</SectionLabel>
      <h2
        className="text-text-primary"
        style={{
          fontSize: "var(--typo-h2-size)",
          fontWeight: "var(--typo-h2-weight)",
          lineHeight: "var(--typo-h2-line-height)",
          letterSpacing: "var(--typo-h2-letter-spacing)",
        }}
      >
        {title}
      </h2>
      {description && (
        <p
          className="text-text-tertiary mt-2"
          style={{
            fontSize: "var(--typo-p-base-size)",
            lineHeight: "var(--typo-p-base-line-height)",
            fontWeight: "var(--typo-p-base-weight)",
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}