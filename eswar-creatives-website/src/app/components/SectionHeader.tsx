/**
 * Reusable section header used across portfolio sections.
 * Enforces consistent typography hierarchy and semantic token usage.
 * Uses the SectionLabel primitive for the overline text.
 *
 * Design System v1: Fraunces italic title (34px), 12px bold overline,
 * 15px secondary description.
 */
import { SectionLabel } from "./ui/section-label";

const fraunces = { fontVariationSettings: '"SOFT" 0, "WONK" 1' } as const;

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
    <div className="mb-8 flex flex-col gap-1">
      <SectionLabel>{label}</SectionLabel>
      <h2
        className="font-heading font-semibold italic text-text-primary"
        style={{
          fontSize: "var(--ds-text-3xl)",
          lineHeight: "44px",
          letterSpacing: "0",
          ...fraunces,
        }}
      >
        {title}
      </h2>
      {description && (
        <p
          className="text-text-secondary mt-1"
          style={{ fontSize: "var(--ds-text-md)", lineHeight: "20px", letterSpacing: "-0.23px" }}
        >
          {description}
        </p>
      )}
    </div>
  );
}
