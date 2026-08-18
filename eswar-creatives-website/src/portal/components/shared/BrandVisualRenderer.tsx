// Content-type renderer for a single Brand Visual Guide item. One component,
// every audience: the admin edit-adjacent preview, the client detail drawer
// and the public detail view all render through this, fed the item plus its
// already-resolved file URLs as props (see utils/brandVisual.ts for how the
// two audiences resolve those differently). Resolution order mirrors
// brand-visual-guide-prd-v2 Section 4, minus the prototype's hardcoded
// Crown-Pillar/kolam demo art — a "mark" or "pattern" in the real app is
// just an uploaded image file like any other, rendered through
// ProgressiveImage rather than redrawn from scratch.
import { Download, ExternalLink, ImageOff } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { t, fonts } from '../../theme'
import { ProgressiveImage } from './ProgressiveImage'
import { Skeleton } from './Skeleton'
import { ExtensionBadge } from './BrandVisualBadge'
import type { BrandVisualFileUrls, BrandVisualItem } from '../../utils/brandVisual'

const mono = "'SF Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

// Tone of Voice's prose layout only. Deliberately minimal -- **bold** plus
// blank-line paragraph breaks, nothing else -- ported from the reference
// prototype's own renderInline(). Kept local rather than folded into the
// generic plain-text fallback at the bottom of this file, so existing
// Guidelines/Assets/Templates document items (which have no `layout`
// field and were never authored with this syntax in mind) render exactly
// as before.
function renderProseInline(text: string): ReactNode {
  const paragraphs = text.split('\n\n')
  return paragraphs.map((para, i) => {
    const parts = para.split(/(\*\*[^*]+\*\*)/g).map((chunk, j) =>
      chunk.startsWith('**') && chunk.endsWith('**') ? (
        <strong key={j} style={{ fontWeight: 600 }}>
          {chunk.slice(2, -2)}
        </strong>
      ) : (
        <span key={j}>{chunk}</span>
      )
    )
    return (
      <p key={i} style={{ margin: i === paragraphs.length - 1 ? 0 : '0 0 14px' }}>
        {parts}
      </p>
    )
  })
}

// Neutral bounded content area — the generic stand-in for whatever a real
// brand's own frame treatment ends up being. Never carries a client's own
// colours; those live in the data (swatch hex values, specimen font
// families), never hardcoded here.
function ContentFrame({ children }: { children: ReactNode }) {
  return <div style={s.frame}>{children}</div>
}

export function BrandVisualRenderer({
  item,
  fileUrls,
  onExpandImage,
}: {
  item: BrandVisualItem
  fileUrls?: BrandVisualFileUrls | null
  onExpandImage?: () => void
}) {
  const d = item.detail
  const needsFile = item.storage_path != null
  const loadingFile = needsFile && !fileUrls

  if (item.content_type === 'audio') {
    return (
      <div>
        <ContentFrame>
          {loadingFile ? <Skeleton height={64} borderRadius={8} /> : fileUrls ? <audio controls style={s.mediaFull} src={fileUrls.previewUrl} /> : <p style={s.muted}>Audio file unavailable.</p>}
        </ContentFrame>
        <div style={s.metaRow}>
          {item.file_type && <ExtensionBadge ext={item.file_type} />}
          {d.note && <p style={s.note}>{d.note}</p>}
        </div>
      </div>
    )
  }

  if (item.content_type === 'video') {
    return (
      <div>
        <ContentFrame>
          {loadingFile ? (
            <Skeleton height={220} borderRadius={8} />
          ) : fileUrls ? (
            <video controls style={{ ...s.mediaFull, maxHeight: 320 }} src={fileUrls.previewUrl} />
          ) : (
            <p style={s.muted}>Video file unavailable.</p>
          )}
        </ContentFrame>
        <div style={s.metaRow}>
          {item.file_type && <ExtensionBadge ext={item.file_type} />}
          {d.note && <p style={s.note}>{d.note}</p>}
        </div>
      </div>
    )
  }

  if (item.content_type === 'link' && d.url) {
    return (
      <a href={d.url} target="_blank" rel="noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
        <ContentFrame>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={s.linkLabel}>{d.label || d.url}</div>
              <div style={s.linkDomain}>{domainOf(d.url)}</div>
            </div>
            <ExternalLink size={18} color={t.text.tertiary} style={{ flexShrink: 0 }} />
          </div>
        </ContentFrame>
      </a>
    )
  }

  if (d.swatches && d.swatches.length > 0) {
    return (
      <div>
        <ContentFrame>
          <div style={s.swatchGrid}>
            {d.swatches.map((sw, i) => (
              <div key={`${sw.hex}-${i}`}>
                <div style={{ ...s.swatchTile, background: sw.hex }} />
                <div style={s.swatchName}>{sw.name}</div>
                <div style={s.swatchHex}>{sw.hex}</div>
                {sw.role && <div style={s.swatchRole}>{sw.role}</div>}
              </div>
            ))}
          </div>
        </ContentFrame>
        {/* The sentence below the grid comes from the item's own Summary
            field, not detail.note -- Summary is already authored for every
            item (it's also what the card blurb uses), so colour items don't
            need a second, separate free-text field just for this. */}
        {item.summary && <p style={s.noteBelow}>{item.summary}</p>}
      </div>
    )
  }

  if (d.specimens && d.specimens.length > 0) {
    return (
      <div>
        {/* No ContentFrame here, deliberately -- a type specimen sheet reads
            as a continuous page, not a boxed card. Each specimen is large
            rendered type as the visual anchor, with a small Inter caption
            directly beneath it -- the rule is seen, not just stated. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {d.specimens.map((sp, i) => (
            <div key={i}>
              <div
                style={{
                  fontFamily: sp.fontFamily,
                  fontWeight: sp.weight ?? 600,
                  fontStyle: sp.italic ? 'italic' : 'normal',
                  letterSpacing: sp.tracking,
                  fontSize: sp.size ?? (i === 0 ? 48 : 24),
                  lineHeight: 1.1,
                  color: t.text.primary,
                }}
              >
                {sp.sample}
              </div>
              {(sp.role || sp.note) && (
                <div style={s.specimenCaption}>
                  {sp.role}
                  {sp.role && sp.note ? '. ' : ''}
                  {sp.note}
                </div>
              )}
            </div>
          ))}
        </div>

        {d.scaleStrip && (
          <div style={{ marginTop: 40 }}>
            <div style={s.scaleStripRow}>
              {d.scaleStrip.sizes.map((size, i) => (
                <div key={i} style={s.scaleStripCell}>
                  <div
                    style={{
                      fontFamily: d.scaleStrip!.fontFamily,
                      fontWeight: d.scaleStrip!.weight ?? 600,
                      fontSize: size,
                      lineHeight: 1,
                      color: t.text.primary,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {d.scaleStrip!.word}
                  </div>
                  <div style={s.scaleStripSizeLabel}>{size}px</div>
                </div>
              ))}
            </div>
            {d.scaleStrip.note && <div style={s.specimenCaption}>{d.scaleStrip.note}</div>}
          </div>
        )}

        {/* The written rules stay, as supporting reference below the sheet
            -- not removed, just no longer the first thing shown. */}
        {d.content && <p style={s.supportingText}>{d.content}</p>}
      </div>
    )
  }

  if (d.sections && d.sections.length > 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {d.sections.map((sec, i) => (
          <div key={i} style={{ paddingBottom: 14, borderBottom: i < d.sections!.length - 1 ? `1px solid ${t.border.subtle}` : 'none' }}>
            <div style={s.sectionLabel}>{sec.label}</div>
            <div style={s.sectionValue}>{sec.value}</div>
          </div>
        ))}
        {d.sectionsNote && <p style={s.noteItalic}>{d.sectionsNote}</p>}
      </div>
    )
  }

  // Tone of Voice's three document layouts. All three read `item.category`
  // rather than `content_type` alone for the prose default (see comment
  // below) so this can never change how an existing non-Tone-of-Voice
  // document item renders -- those never have `detail.layout` set and
  // predate this syntax entirely.
  if (item.content_type === 'document' && d.layout === 'beforeAfter' && d.beforeAfterRows && d.beforeAfterRows.length > 0) {
    return (
      <table style={s.beforeAfterTable}>
        <thead>
          <tr>
            <th style={s.beforeAfterTh}>Off-brand</th>
            <th style={s.beforeAfterTh}>On-brand</th>
          </tr>
        </thead>
        <tbody>
          {d.beforeAfterRows.map((row, i) => (
            <tr key={i}>
              <td style={s.beforeAfterTdOff}>{row.off}</td>
              <td style={s.beforeAfterTdOn}>{row.on}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (item.content_type === 'document' && d.layout === 'wordlist' && d.wordList) {
    const { leftLabel, left, rightLabel, right } = d.wordList
    return (
      <div style={s.wordListGrid}>
        <div>
          <div style={{ ...s.wordListLabel, color: t.text.primaryBrand }}>{leftLabel}</div>
          <ul style={s.wordListUl}>
            {left.map((w, i) => (
              <li key={i} style={s.wordListLi}>
                {w}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div style={{ ...s.wordListLabel, color: t.text.tertiary }}>{rightLabel}</div>
          <ul style={s.wordListUl}>
            {right.map((w, i) => (
              <li key={i} style={s.wordListLi}>
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  // Explicit 'prose' covers every authored Tone of Voice item. The
  // no-layout fallback is scoped to item.category === 'tone_of_voice' only
  // -- never inferred from a missing layout alone -- so it can only ever
  // apply to a Tone of Voice row inserted with layout unset (e.g. directly
  // via SQL), not to any pre-existing Guidelines/Assets/Templates item.
  if (
    item.content_type === 'document' &&
    (d.layout === 'prose' || (!d.layout && item.category === 'tone_of_voice')) &&
    d.content
  ) {
    return <div style={s.prose}>{renderProseInline(d.content)}</div>
  }

  if (item.content_type === 'image') {
    const isPattern = d.imageTreatment === 'pattern'
    const noPreviewBlock = (
      <div style={s.noPreview}>
        <ImageOff size={22} color={t.text.tertiary} />
        <span>No preview available. Needs an asset uploaded.</span>
      </div>
    )
    return (
      <div>
        {isPattern ? (
          // Pattern/texture swatch: no mat border, corners matching the
          // portal's own radius, image fills the frame completely -- a
          // padded frame around a seamless tile would misrepresent how it
          // repeats, which is the whole point of showing it.
          <div style={s.patternBox}>
            {loadingFile ? (
              <Skeleton height={220} borderRadius={12} />
            ) : fileUrls ? (
              <div
                role="button"
                tabIndex={0}
                onClick={onExpandImage}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onExpandImage?.()}
                style={{ cursor: onExpandImage ? 'zoom-in' : 'default', height: '100%' }}
              >
                <ProgressiveImage src={fileUrls.previewUrl} alt={item.title} fit="cover" radius={12} style={{ height: 220, width: '100%' }} />
              </div>
            ) : (
              noPreviewBlock
            )}
          </div>
        ) : (
          <ContentFrame>
            {loadingFile ? (
              <Skeleton height={220} borderRadius={8} />
            ) : fileUrls ? (
              <div
                role="button"
                tabIndex={0}
                onClick={onExpandImage}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onExpandImage?.()}
                style={{ cursor: onExpandImage ? 'zoom-in' : 'default' }}
              >
                <ProgressiveImage src={fileUrls.previewUrl} alt={item.title} shimmerHeight={220} fit="contain" />
              </div>
            ) : (
              noPreviewBlock
            )}
          </ContentFrame>
        )}
        {d.note && <p style={s.noteBelow}>{d.note}</p>}
        {/* Written guideline text stays as supporting reference, same
            treatment as the specimens/swatches cases above. Doubles as
            extended usage notes for image-type items (tile size, spacing,
            where the pattern should and shouldn't appear). */}
        {d.content && <p style={s.supportingText}>{d.content}</p>}
      </div>
    )
  }

  if (item.file_type) {
    return (
      <div>
        <ContentFrame>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ExtensionBadge ext={item.file_type} size="lg" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={s.fileTitle}>{item.title}</div>
              <div style={s.fileTypeLine}>{item.file_type} file</div>
            </div>
            {loadingFile ? (
              <Skeleton width={110} height={34} borderRadius={9} />
            ) : fileUrls ? (
              <a href={fileUrls.downloadUrl} style={s.downloadBtn}>
                <Download size={13} /> Download
              </a>
            ) : (
              <span style={s.muted}>Unavailable</span>
            )}
          </div>
        </ContentFrame>
        {d.note && <p style={s.noteBelow}>{d.note}</p>}
      </div>
    )
  }

  return <p style={s.plainText}>{d.content || 'No content yet.'}</p>
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

const s: Record<string, CSSProperties> = {
  frame: { background: t.background.subtle, border: `1px solid ${t.border.subtle}`, borderRadius: 12, padding: 20 },
  mediaFull: { width: '100%', display: 'block' },
  metaRow: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 },
  note: { fontSize: 13.5, color: t.text.secondary, margin: 0, lineHeight: 1.6 },
  noteBelow: { marginTop: 14, fontSize: 13.5, color: t.text.secondary, lineHeight: 1.6 },
  noteItalic: { fontSize: 13, fontStyle: 'italic', color: t.text.secondary },
  muted: { fontSize: 13, color: t.text.tertiary, margin: 0 },
  noPreview: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: '100%',
    padding: '32px 16px',
    fontSize: 13,
    color: t.text.tertiary,
    fontFamily: fonts.body,
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  patternBox: {
    height: 220,
    borderRadius: 12,
    border: `1px solid ${t.border.subtle}`,
    overflow: 'hidden',
    background: t.background.subtle,
  },
  linkLabel: { fontSize: 14, color: t.text.primaryBrand, fontFamily: fonts.body },
  linkDomain: { fontFamily: mono, fontSize: 12, color: t.text.tertiary, marginTop: 4 },
  swatchGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(92px,1fr))', gap: 12 },
  swatchTile: { height: 56, borderRadius: 8, border: `1px solid ${t.border.subtle}` },
  swatchName: { marginTop: 6, fontSize: 12, letterSpacing: '0.04em', color: t.text.primary, textTransform: 'uppercase' },
  swatchHex: { fontFamily: mono, fontSize: 11, color: t.text.tertiary },
  swatchRole: { fontSize: 11, color: t.text.tertiary, marginTop: 2 },
  specimenCaption: { fontFamily: fonts.body, fontSize: 12.5, color: t.text.tertiary, marginTop: 8, lineHeight: 1.5 },
  scaleStripRow: { display: 'flex', alignItems: 'flex-end', gap: 28, flexWrap: 'wrap' },
  scaleStripCell: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 },
  scaleStripSizeLabel: { fontFamily: mono, fontSize: 11, color: t.text.tertiary },
  supportingText: {
    marginTop: 40,
    paddingTop: 24,
    borderTop: `1px solid ${t.border.subtle}`,
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: t.text.secondary,
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
  },
  sectionLabel: { fontFamily: mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.text.tertiary, marginBottom: 4 },
  sectionValue: { fontSize: 14, color: t.text.primary, lineHeight: 1.6 },
  prose: { fontSize: 14.5, lineHeight: 1.68, color: t.text.primary },
  beforeAfterTable: { width: '100%', borderCollapse: 'collapse', fontSize: 13.5 },
  beforeAfterTh: {
    textAlign: 'left',
    fontFamily: mono,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: t.text.tertiary,
    padding: '0 12px 10px',
    fontWeight: 600,
  },
  beforeAfterTdOff: { padding: 12, verticalAlign: 'top', borderTop: `1px solid ${t.border.subtle}`, lineHeight: 1.5, color: t.text.secondary, width: '50%' },
  beforeAfterTdOn: { padding: 12, verticalAlign: 'top', borderTop: `1px solid ${t.border.subtle}`, lineHeight: 1.5, color: t.text.primary, fontWeight: 500, width: '50%' },
  wordListGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  wordListLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, marginBottom: 10 },
  wordListUl: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 },
  wordListLi: { fontSize: 14, padding: '8px 10px', borderRadius: 6, background: t.background.subtle, color: t.text.primary },
  fileTitle: { fontSize: 14, color: t.text.primary, fontWeight: 600 },
  fileTypeLine: { fontFamily: mono, fontSize: 11, color: t.text.tertiary, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' },
  downloadBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: t.text.primaryBrand,
    color: t.text.onPrimary,
    border: 'none',
    borderRadius: 9,
    padding: '8px 12px',
    fontSize: 12.5,
    fontWeight: 600,
    textDecoration: 'none',
    flexShrink: 0,
  },
  plainText: { fontSize: 14, color: t.text.primary, lineHeight: 1.7, whiteSpace: 'pre-wrap' },
}
