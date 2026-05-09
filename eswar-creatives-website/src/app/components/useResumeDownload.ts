import { useState, useCallback, useEffect } from "react";

export const RESUME_URL =
  "https://drive.usercontent.google.com/download?id=1OMobkf2eFvePs0GLRLimimO2u5tmLsf0&export=download&authuser=0&confirm=t";
export const RESUME_FILENAME = "Eswar_Maheswaran_CV_Snr_UX_Lead.pdf";

function formatFileSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

/**
 * Shared hook for resume download with CORS fallback.
 * Used by HeroSection and FooterSection to avoid duplication.
 */
export function useResumeDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [fileSize, setFileSize] = useState<string | null>(null);

  // Fetch actual file size via HEAD request on mount
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(RESUME_URL, {
          method: "HEAD",
          mode: "cors",
          signal: controller.signal,
        });
        const cl = res.headers.get("content-length");
        if (cl && !cancelled) {
          setFileSize(formatFileSize(parseInt(cl, 10)));
        }
      } catch {
        // CORS may block HEAD — silently fall back to static estimate
        // (Avoid downloading the entire file just to measure size)
        if (!cancelled) setFileSize("1.8 MB");
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const handleDownload = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      if (isDownloading) return;
      setIsDownloading(true);
      try {
        const response = await fetch(RESUME_URL, { mode: "cors" });
        if (!response.ok) throw new Error("Download failed");
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = RESUME_FILENAME;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch {
        // CORS blocked — use hidden iframe to trigger download without navigating away
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = RESUME_URL;
        document.body.appendChild(iframe);
        setTimeout(() => document.body.removeChild(iframe), 10000);
      } finally {
        setIsDownloading(false);
      }
    },
    [isDownloading]
  );

  return { isDownloading, handleDownload, fileSize };
}