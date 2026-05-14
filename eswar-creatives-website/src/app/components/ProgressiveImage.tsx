import { useState, useRef, useEffect, useCallback } from 'react';

interface ProgressiveImageProps {
  previewSrc: string;
  fullSrc: string;
  alt: string;
  caption?: string;
  className?: string;
}

export function ProgressiveImage({ previewSrc, fullSrc, alt, caption, className }: ProgressiveImageProps) {
  const [status, setStatus] = useState<'skeleton' | 'preview' | 'full'>('skeleton');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [fullLoaded, setFullLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getConnectionQuality = useCallback(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (!conn) return 'good';
    if (conn.saveData) return 'poor';
    if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') return 'poor';
    if (conn.effectiveType === '3g') return 'medium';
    return 'good';
  }, []);

  const loadFull = useCallback(() => {
    const img = new Image();
    img.onload = () => {
      setFullLoaded(true);
      setStatus('full');
    };
    img.src = fullSrc;
  }, [fullSrc]);

  const loadPreview = useCallback(() => {
    const img = new Image();
    img.onload = () => {
      setStatus('preview');
      if (getConnectionQuality() === 'good') {
        loadFull();
      }
    };
    img.src = previewSrc;
  }, [previewSrc, getConnectionQuality, loadFull]);

  // Intersection observer — load when in viewport
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadPreview();
          observerRef.current?.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    if (containerRef.current) observerRef.current.observe(containerRef.current);
    return () => observerRef.current?.disconnect();
  }, [loadPreview]);

  const handleClick = () => {
    if (!fullLoaded) loadFull();
    setLightboxOpen(true);
  };

  // Close lightbox on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    if (lightboxOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [lightboxOpen]);

  // Prevent body scroll when lightbox open
  useEffect(() => {
    document.body.style.overflow = lightboxOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [lightboxOpen]);

  return (
    <>
      {/* Image container */}
      <div
        ref={containerRef}
        className={className}
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 10,
          cursor: status === 'skeleton' ? 'default' : 'zoom-in',
          background: '#f0eeea',
        }}
      >
        {/* Skeleton shimmer */}
        {status === 'skeleton' && (
          <div
            className="shimmer-bg"
            style={{ width: '100%', paddingBottom: '62.5%', borderRadius: 10 }}
          />
        )}

        {/* Image */}
        {status !== 'skeleton' && (
          <img
            ref={imgRef}
            src={status === 'full' && fullLoaded ? fullSrc : previewSrc}
            alt={alt}
            onClick={handleClick}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: 10,
              transition: 'filter 0.3s ease',
              filter: status === 'preview' && !fullLoaded ? 'blur(0px)' : 'none',
            }}
          />
        )}

        {/* Click-to-expand hint */}
        {status !== 'skeleton' && (
          <div
            onClick={handleClick}
            style={{
              position: 'absolute',
              bottom: 10,
              right: 10,
              background: 'rgba(0,0,0,0.55)',
              color: '#fff',
              fontSize: 11,
              padding: '4px 10px',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              cursor: 'zoom-in',
              backdropFilter: 'blur(4px)',
              opacity: 0.85,
            }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
            {fullLoaded ? 'Full res' : 'View full'}
          </div>
        )}

        {/* Caption */}
        {caption && status !== 'skeleton' && (
          <div style={{ padding: '10px 14px', fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>
            {caption}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          onClick={() => setLightboxOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            cursor: 'zoom-out',
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#fff',
              width: 40,
              height: 40,
              borderRadius: '50%',
              fontSize: 20,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>

          {/* Spinner while full res loads */}
          {!fullLoaded && (
            <div
              style={{
                position: 'absolute',
                color: '#fff',
                fontSize: 13,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ animation: 'spin 0.8s linear infinite' }}
              >
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              Loading full resolution…
            </div>
          )}

          {/* Full res image */}
          <img
            src={fullLoaded ? fullSrc : previewSrc}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '95vw',
              maxHeight: '92vh',
              objectFit: 'contain',
              borderRadius: 6,
              cursor: 'default',
              transition: 'opacity 0.3s ease',
            }}
          />

          {caption && (
            <div
              style={{
                position: 'absolute',
                bottom: 20,
                color: 'rgba(255,255,255,0.6)',
                fontSize: 12,
                fontStyle: 'italic',
                textAlign: 'center',
                maxWidth: 600,
              }}
            >
              {caption}
            </div>
          )}
        </div>
      )}

    </>
  );
}
