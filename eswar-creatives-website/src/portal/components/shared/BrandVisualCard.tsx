// Grid card for the client and public Brand Visual Guide views. Presentational
// only — takes an item plus an already-resolved thumbnail URL (if any) as
// props, never fetches anything itself, so it works identically whether the
// caller resolved that URL via a direct signed URL (admin/client) or the
// public edge function.
import { FileText, Image as ImageIcon, ImageOff, Link2, Music, Video } from 'lucide-react'
import type { CSSProperties } from 'react'
import { t, fonts, motionTokens } from '../../theme'
import { ProgressiveImage } from './ProgressiveImage'
import { ExtensionBadge } from './BrandVisualBadge'
import type { BrandVisualItem } from '../../utils/brandVisual'

const TYPE_META: Record<BrandVisualItem['content_type'], { label: string; Icon: typeof FileText }> = {
  document: { label: 'Document', Icon: FileText },
  image: { label: 'Image', Icon: ImageIcon },
  video: { label: 'Video', Icon: Video },
  audio: { label: 'Audio', Icon: Music },
  link: { label: 'Link', Icon: Link2 },
}

export function BrandVisualCard({
  item,
  thumbnailUrl,
  onOpen,
}: {
  item: BrandVisualItem
  thumbnailUrl?: string | null
  onOpen: (item: BrandVisualItem) => void
}) {
  const meta = TYPE_META[item.content_type]
  const isImage = item.content_type === 'image'
  const hasSwatches = item.detail.swatches && item.detail.swatches.length > 0

  return (
    <button type="button" onClick={() => onOpen(item)} className="pf-focus" style={s.card}>
      <div style={{ ...s.preview, ...(isImage && !thumbnailUrl ? s.previewNoImage : null) }}>
        {hasSwatches ? (
          <div style={s.swatchRow}>
            {item.detail.swatches!.slice(0, 6).map((sw, i) => (
              <div key={`${sw.hex}-${i}`} style={{ ...s.swatchChip, background: sw.hex }} />
            ))}
          </div>
        ) : isImage && thumbnailUrl ? (
          // Real asset: fills the frame, cropped to it -- reads unambiguously
          // as an actual thumbnail, not a placeholder.
          <ProgressiveImage src={thumbnailUrl} alt={item.title} fit="cover" radius={0} style={{ height: '100%', width: '100%' }} />
        ) : isImage ? (
          // Image-type item with no file yet. Visibly different from a real
          // thumbnail (dashed border, faint icon, explicit label) so admin
          // can tell at a glance which items still need an asset uploaded.
          <div style={s.noPreviewInner}>
            <ImageOff size={20} color={t.text.tertiary} />
            <span style={s.noPreviewLabel}>No preview</span>
          </div>
        ) : (
          <meta.Icon size={26} color={t.text.tertiary} />
        )}
        {item.file_type && (
          <span style={s.badgeCorner}>
            <ExtensionBadge ext={item.file_type} />
          </span>
        )}
      </div>
      <div style={s.typeRow}>
        <meta.Icon size={13} color={t.text.tertiary} />
        <span style={s.typeLabel}>{meta.label}</span>
      </div>
      <h3 style={s.title}>{item.title}</h3>
      {item.summary && <p style={s.summary}>{item.summary}</p>}
    </button>
  )
}

const s: Record<string, CSSProperties> = {
  card: {
    textAlign: 'left',
    background: t.background.surface,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 14,
    padding: 14,
    cursor: 'pointer',
    transition: `border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
    display: 'block',
    width: '100%',
  },
  preview: {
    width: '100%',
    height: 96,
    borderRadius: 10,
    border: `1px solid ${t.border.subtle}`,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: t.background.subtle,
    position: 'relative',
  },
  previewNoImage: { border: `1px dashed ${t.border.default}`, background: t.background.muted },
  noPreviewInner: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  noPreviewLabel: { fontSize: 11, color: t.text.tertiary, fontFamily: fonts.body },
  swatchRow: { display: 'flex', gap: 4, width: '100%', height: '100%', padding: 10, boxSizing: 'border-box' },
  swatchChip: { flex: 1, height: '100%', borderRadius: 4 },
  badgeCorner: { position: 'absolute', bottom: 6, right: 6 },
  typeRow: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 },
  typeLabel: {
    fontFamily: "'SF Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    fontSize: 11,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: t.text.tertiary,
  },
  title: { fontFamily: fonts.heading, fontSize: 16, fontWeight: 600, margin: '6px 0 4px', color: t.text.primary },
  summary: { fontSize: 13, color: t.text.secondary, lineHeight: 1.5, margin: 0 },
}
