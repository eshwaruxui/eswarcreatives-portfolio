import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";

export function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{
        fontFamily: "var(--font-family-primary)",
      }}
    >
      <span
        className="text-text-disabled mb-2"
        style={{
          fontSize: "var(--typo-display-size)",
          lineHeight: "var(--typo-display-line-height)",
          fontWeight: "var(--typo-display-weight)",
          letterSpacing: "var(--typo-display-letter-spacing)",
        }}
      >
        404
      </span>
      <h1
        className="text-text-primary mb-2"
        style={{
          fontSize: "var(--typo-h4-size)",
          lineHeight: "var(--typo-h4-line-height)",
          fontWeight: "var(--typo-h4-weight)",
          letterSpacing: "var(--typo-h4-letter-spacing)",
        }}
      >
        Page not found
      </h1>
      <p
        className="text-text-tertiary mb-8 text-center max-w-sm"
        style={{
          fontSize: "var(--typo-p-base-size)",
          lineHeight: "var(--typo-p-base-line-height)",
          fontWeight: "var(--typo-p-base-weight)",
        }}
      >
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-interactive-primary text-text-primary rounded-xl hover:bg-interactive-primary-hover active:bg-interactive-primary-active transition-all duration-200"
        style={{
          fontSize: "var(--typo-caption-m-size)",
          lineHeight: "var(--typo-caption-m-line-height)",
          fontWeight: "var(--typo-caption-m-weight)",
        }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Portfolio
      </Link>
    </div>
  );
}