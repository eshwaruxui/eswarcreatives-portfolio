// Client-facing QR codes at /portal/qr. Read-only: RLS on qr_codes already
// scopes rows to this client, but the query is still explicitly scoped by
// client_id rather than relying on RLS alone as the only guard on the fetch
// (mirrors ClientCampaigns/BrandVisualClientPage's own explicit-scope note).
import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router'
import { Download, QrCode as QrCodeIcon } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { type PortalProfile } from '../PortalGuard'
import { CLIENT_NAV_HEIGHT } from './ClientNav'
import { tokens, t, fonts } from '../theme'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { Skeleton } from '../components/shared/Skeleton'
import { FadeOverflow } from '../components/shared/FadeOverflow'
import { getQrImageUrl, downloadExternalImage, qrStatusTone } from '../utils/qr'

type QrCodeRow = {
  id: string
  label: string
  slug: string
  destination_url: string
  use_case: string | null
  medium: string | null
  is_active: boolean
  qr_scans: { count: number }[]
}

const USE_CASE_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  website: 'Website',
  instagram: 'Instagram',
  google_review: 'Google Review',
  other: 'Other',
}

const MEDIUM_LABELS: Record<string, string> = {
  visiting_card: 'Visiting card',
  bookmark: 'Bookmark',
  banner: 'Banner',
  stationery: 'Stationery',
  digital: 'Digital',
}

// Plain <img>, deliberately not ProgressiveImage. ProgressiveImage's
// shimmer-to-signed-URL pipeline (useImagePriority, thumbnailSrc, priority
// fetch/abort scope) is built for Supabase Storage assets; a QR image is an
// external api.qrserver.com URL with no signing and no priority queue to
// join, so it gets its own minimal Skeleton-until-onLoad instead.
function QrThumbnail({ slug }: { slug: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div style={styles.thumbWrap}>
      {!loaded && <Skeleton width={140} height={140} style={styles.thumbSkeleton} />}
      <img
        src={getQrImageUrl(slug, 300)}
        alt={`QR code for ${slug}`}
        style={{ ...styles.thumbImg, opacity: loaded ? 1 : 0 }}
        onLoad={() => setLoaded(true)}
      />
    </div>
  )
}

export function ClientQr() {
  const profile = useOutletContext<PortalProfile>()
  const { isMobile } = useBreakpoint()
  const [rows, setRows] = useState<QrCodeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: client, error: cErr } = await supabase
          .from('clients')
          .select('id')
          .eq('profile_id', profile.id)
          .maybeSingle()
        if (cErr) throw cErr
        if (!client) throw new Error('no_client')
        if (cancelled) return

        const { data, error: qErr } = await supabase
          .from('qr_codes')
          .select('id, label, slug, destination_url, use_case, medium, is_active, qr_scans(count)')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false })
        if (qErr) throw qErr
        if (cancelled) return
        setRows((data ?? []) as QrCodeRow[])
      } catch {
        if (!cancelled) setError('Could not load your QR codes. Refresh to try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [profile.id])

  function scanCount(row: QrCodeRow): number {
    return row.qr_scans?.[0]?.count ?? 0
  }

  const containerStyle: CSSProperties = {
    maxWidth: 1080,
    margin: '0 auto',
    padding: `${CLIENT_NAV_HEIGHT + 40}px ${isMobile ? 16 : 24}px 80px`,
  }

  return (
    <main style={containerStyle}>
      <h1 style={styles.heading}>QR Codes</h1>

      {loading ? (
        <div style={{ ...styles.grid, ...(isMobile ? styles.gridMobile : null) }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} style={styles.card}>
              <Skeleton width={140} height={140} />
              <Skeleton width="70%" height={16} />
              <Skeleton width="50%" height={13} />
            </div>
          ))}
        </div>
      ) : error ? (
        <p style={styles.errorText}>{error}</p>
      ) : rows.length === 0 ? (
        <div style={styles.emptyState}>
          <QrCodeIcon size={28} color={t.text.tertiary} />
          <p style={styles.emptyText}>No QR codes yet. Your designer will add them here.</p>
        </div>
      ) : (
        <div style={{ ...styles.grid, ...(isMobile ? styles.gridMobile : null) }}>
          {rows.map((row) => {
            const tone = qrStatusTone(row.is_active)
            return (
              <div key={row.id} style={styles.card}>
                <QrThumbnail slug={row.slug} />
                <div style={styles.cardTop}>
                  <span style={styles.label}>{row.label}</span>
                  <span style={{ ...styles.statusPill, background: tone.bg, color: tone.fg }}>
                    {row.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div style={styles.badgeRow}>
                  <span style={styles.badge}>{USE_CASE_LABELS[row.use_case ?? ''] ?? row.use_case}</span>
                  <span style={styles.badge}>{MEDIUM_LABELS[row.medium ?? ''] ?? row.medium}</span>
                  <span style={styles.scans}>{scanCount(row)} {scanCount(row) === 1 ? 'scan' : 'scans'}</span>
                </div>
                <FadeOverflow style={{ maxWidth: '100%' }}>
                  <span style={styles.destination}>{row.destination_url}</span>
                </FadeOverflow>
                <button
                  type="button"
                  style={styles.downloadBtn}
                  onClick={() => void downloadExternalImage(getQrImageUrl(row.slug), `${row.slug}.png`)}
                >
                  <Download size={14} /> Download
                </button>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}

const styles: Record<string, CSSProperties> = {
  heading: {
    fontFamily: fonts.heading,
    fontSize: 24,
    fontWeight: 600,
    color: t.text.primary,
    margin: '0 0 20px',
  },
  errorText: { fontFamily: fonts.body, fontSize: 14, color: t.text.danger },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    padding: '64px 0',
  },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: t.text.secondary, margin: 0 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 16,
  },
  gridMobile: { gridTemplateColumns: '1fr' },
  card: {
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  thumbWrap: { position: 'relative', width: 140, height: 140 },
  thumbSkeleton: { position: 'absolute', top: 0, left: 0 },
  thumbImg: {
    width: 140,
    height: 140,
    display: 'block',
    transition: 'opacity 200ms ease',
  },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%' },
  label: { fontFamily: fonts.body, fontSize: 15, fontWeight: 600, color: t.text.primary },
  statusPill: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 999,
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  badgeRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', width: '100%' },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 6,
    background: t.background.muted,
    color: t.text.tertiary,
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 500,
  },
  scans: { fontFamily: fonts.body, fontSize: 12, color: t.text.muted, marginLeft: 'auto' },
  destination: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.secondary,
    whiteSpace: 'nowrap',
  },
  downloadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    justifyContent: 'center',
    background: t.background.subtle,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 12px',
    cursor: 'pointer',
  },
}
