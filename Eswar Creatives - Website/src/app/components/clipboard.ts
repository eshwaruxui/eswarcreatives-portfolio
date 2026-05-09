import { toast } from "sonner";

/**
 * Modern clipboard copy with fallback for older browsers.
 * Shows a toast confirmation on every copy.
 *
 * @param text  — the string to copy
 * @param label — optional human-readable label shown in the toast
 *                (e.g. "border/deep-alpha"). Defaults to generic message.
 */
export async function copyToClipboard(
  text: string,
  label?: string,
): Promise<void> {
  let success = false;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      success = true;
    } catch {
      // Clipboard API failed (e.g. permissions), fall through to legacy
    }
  }

  if (!success) {
    // Legacy fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      success = true;
    } catch {
      // silently fail
    }
    document.body.removeChild(ta);
  }

  if (success) {
    toast.success(label ? `Copied ${label}` : "Copied to clipboard", {
      duration: 1800,
    });
  }
}
