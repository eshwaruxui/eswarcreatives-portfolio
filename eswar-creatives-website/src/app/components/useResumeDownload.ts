import { useState, useCallback } from "react";

export const RESUME_URL = "/Eswar-AI-Native-UX-Lead-2026.pdf";
export const RESUME_FILENAME = "Eswar-AI-Native-UX-Lead-2026.pdf";

export function useResumeDownload() {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      if (isDownloading) return;
      setIsDownloading(true);
      const link = document.createElement("a");
      link.href = "/Eswar-AI-Native-UX-Lead-2026.pdf";
      link.download = RESUME_FILENAME;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsDownloading(false);
    },
    [isDownloading]
  );

  return { isDownloading, handleDownload, fileSize: null };
}
