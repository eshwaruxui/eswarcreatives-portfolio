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
import MarkdownIt from 'markdown-it'
import type { CSSProperties, ReactNode } from 'react'
import { t, fonts } from '../../theme'
import { ProgressiveImage } from './ProgressiveImage'
import { Skeleton } from './Skeleton'
import { ExtensionBadge } from './BrandVisualBadge'
import { BrandVisualAudioPlayer } from './BrandVisualAudioPlayer'
import { isAudioFileType } from '../../utils/brandVisual'
import type { BrandVisualFileUrls, BrandVisualItem, BrandVisualItemAttachment } from '../../utils/brandVisual'

export interface ResolvedBrandVisualAttachment {
  attachment: BrandVisualItemAttachment
  fileUrls: BrandVisualFileUrls | null
}

const mono = "'SF Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

// Every <audio> element below carries preload="metadata" (never the
// default "auto"), a fix for a genuine reported bug, not a micro-
// optimization: with the default, Chrome eagerly downloads the whole
// (short) file the instant the signed URL resolves, so the native
// buffered-range indicator renders as a solid fill immediately -- easy to
// mistake for "already played," even though the time readout (0:00 / ...)
// is correct the whole time. "metadata" fetches only duration up front;
// the buffered bar then stays empty until the reader actually presses
// play, matching what the bar visually implies.

// Tone of Voice's prose layout only, fed by the shared RichTextEditor
// (src/portal/components/shared/RichTextEditor.tsx), which reads/writes
// this exact markdown via the same underlying library (tiptap-markdown
// wraps markdown-it internally) -- what the admin sees in the editor and
// what a reader sees here are parsed by the same rules. `html: false` is
// load-bearing, not a default left alone: it makes markdown-it escape any
// literal HTML the admin ever typed/pasted into the source instead of
// executing it, which is what makes rendering the result via
// dangerouslySetInnerHTML safe here -- content is admin-authored (is_admin()
// gated) but still never trusted as raw HTML. Content written before this
// editor existed (plain **bold** + blank-line paragraphs, no headings/
// lists) is valid CommonMark too, so it renders identically, not degraded.
const proseMd = new MarkdownIt({ html: false, linkify: false, breaks: false })

function renderProseMarkdown(text: string): string {
  return proseMd.render(text)
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
  attachments = [],
  onExpandImage,
}: {
  item: BrandVisualItem
  fileUrls?: BrandVisualFileUrls | null
  // Migration 0097. Independent of content_type/layout -- Tone of Voice
  // items of any content type can carry multiple attachments (see
  // ItemFormModal's Attachments field), so this renders alongside every
  // branch below, not just the document layouts. Empty by default so
  // every existing caller/test that doesn't pass it is unaffected.
  attachments?: ResolvedBrandVisualAttachment[]
  onExpandImage?: () => void
}) {
  const d = item.detail
  const needsFile = item.storage_path != null
  const loadingFile = needsFile && !fileUrls

  // Appended to whichever branch below actually returns -- see the prop
  // doc above for why this isn't scoped to document/prose the way
  // audioAttachment (single legacy file) still is.
  const attachmentsBlock =
    attachments.length > 0 ? (
      <div style={s.attachmentsBlock}>
        <div style={s.attachmentsLabel}>Attachments</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {attachments.map(({ attachment, fileUrls: attUrls }) =>
            isAudioFileType(attachment.file_type) ? (
              <div key={attachment.id}>
                {attUrls ? (
                  <BrandVisualAudioPlayer src={attUrls.previewUrl} />
                ) : (
                  <Skeleton height={44} borderRadius={8} />
                )}
                <div style={s.attachmentCaption}>{attachment.file_name}</div>
              </div>
            ) : (
              <div key={attachment.id} style={s.attachmentFileRow}>
                {attachment.file_type && <ExtensionBadge ext={attachment.file_type} />}
                <span style={s.attachmentFileName}>{attachment.file_name}</span>
                {attUrls ? (
                  <a href={attUrls.downloadUrl} style={s.downloadBtnSmall}>
                    <Download size={12} /> Download
                  </a>
                ) : (
                  <Skeleton width={90} height={28} borderRadius={7} />
                )}
              </div>
            )
          )}
        </div>
      </div>
    ) : null

  // Computed once, appended to whichever document layout branch below
  // actually returns -- an audio attachment sits alongside the layout's
  // own content, never in place of it. Only for content_type='document':
  // an item that's already content_type='audio' has its own dedicated
  // branch just below, and doesn't need this repeated.
  const audioAttachment =
    item.content_type === 'document' && isAudioFileType(item.file_type) ? (
      <div style={s.metaRow}>
        {loadingFile ? (
          <Skeleton height={44} borderRadius={8} />
        ) : fileUrls ? (
          <BrandVisualAudioPlayer src={fileUrls.previewUrl} />
        ) : (
          <p style={s.muted}>Audio file unavailable.</p>
        )}
      </div>
    ) : null

  if (item.content_type === 'audio') {
    return (
      <div>
        <ContentFrame>
          {loadingFile ? <Skeleton height={64} borderRadius={8} /> : fileUrls ? <BrandVisualAudioPlayer src={fileUrls.previewUrl} /> : <p style={s.muted}>Audio file unavailable.</p>}
        </ContentFrame>
        <div style={s.metaRow}>
          {item.file_type && <ExtensionBadge ext={item.file_type} />}
          {d.note && <p style={s.note}>{d.note}</p>}
        </div>
        {attachmentsBlock}
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
        {attachmentsBlock}
      </div>
    )
  }

  if (item.content_type === 'link' && d.url) {
    return (
      <div>
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
        {attachmentsBlock}
      </div>
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
        {attachmentsBlock}
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
        {attachmentsBlock}
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
        {attachmentsBlock}
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
      <div>
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
        {audioAttachment}
        {d.note && <p style={s.noteBelow}>{d.note}</p>}
        {attachmentsBlock}
      </div>
    )
  }

  if (item.content_type === 'document' && d.layout === 'wordlist' && d.wordList) {
    const { leftLabel, left, rightLabel, right } = d.wordList
    // A real two-column CSS grid, not two independent <ul>s side by side --
    // when the right column's text wraps taller than the left column's on
    // one row, two separate lists have no way to keep every later row
    // aligned with its counterpart (each list stacks purely on its own
    // height). Flattening left/right into one flat, row-major child list
    // of a single grid puts left[i] and right[i] in the same grid row, so
    // the grid's own row-sizing (each row as tall as its tallest cell)
    // keeps every row aligned regardless of how much either side wraps.
    const rowCount = Math.max(left.length, right.length)
    const cells: ReactNode[] = []
    for (let i = 0; i < rowCount; i++) {
      cells.push(
        <div key={`l-${i}`} style={s.wordListCell}>
          {left[i] ?? ''}
        </div>,
        <div key={`r-${i}`} style={s.wordListCell}>
          {right[i] ?? ''}
        </div>
      )
    }
    return (
      <div>
        <div style={s.wordListGrid}>
          <div style={{ ...s.wordListLabel, color: t.text.primaryBrand }}>{leftLabel}</div>
          <div style={{ ...s.wordListLabel, color: t.text.tertiary }}>{rightLabel}</div>
          {cells}
        </div>
        {audioAttachment}
        {d.note && <p style={s.noteBelow}>{d.note}</p>}
        {attachmentsBlock}
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
    return (
      <div>
        <style>{`
          .ec-tov-prose p { margin: 0 0 14px; }
          .ec-tov-prose p:last-child { margin-bottom: 0; }
          .ec-tov-prose strong { font-weight: 600; }
          .ec-tov-prose h3 { font-size: 16px; font-weight: 600; margin: 20px 0 10px; color: ${t.text.primary}; }
          .ec-tov-prose h3:first-child { margin-top: 0; }
          .ec-tov-prose ul, .ec-tov-prose ol { margin: 0 0 14px; padding-left: 22px; }
          .ec-tov-prose li { margin-bottom: 6px; }
          .ec-tov-prose li:last-child { margin-bottom: 0; }
        `}</style>
        <div className="ec-tov-prose" style={s.prose} dangerouslySetInnerHTML={{ __html: renderProseMarkdown(d.content) }} />
        {audioAttachment}
        {d.note && <p style={s.noteBelow}>{d.note}</p>}
        {attachmentsBlock}
      </div>
    )
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
        {attachmentsBlock}
      </div>
    )
  }

  if (item.file_type) {
    // An audio file with no other structured content is the whole item,
    // same as a dedicated content_type='audio' item -- plays inline rather
    // than showing a download-only card the reader can't hear anything from
    // without leaving the page first.
    if (isAudioFileType(item.file_type)) {
      return (
        <div>
          <ContentFrame>
            {loadingFile ? (
              <Skeleton height={64} borderRadius={8} />
            ) : fileUrls ? (
              <BrandVisualAudioPlayer src={fileUrls.previewUrl} />
            ) : (
              <p style={s.muted}>Audio file unavailable.</p>
            )}
          </ContentFrame>
          <div style={s.metaRow}>
            <ExtensionBadge ext={item.file_type} />
            {d.note && <p style={s.note}>{d.note}</p>}
          </div>
          {attachmentsBlock}
        </div>
      )
    }
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
        {attachmentsBlock}
      </div>
    )
  }

  return (
    <div>
      <p style={s.plainText}>{d.content || 'No content yet.'}</p>
      {attachmentsBlock}
    </div>
  )
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
  // video only now -- every audio player moved to the custom
  // BrandVisualAudioPlayer (its own scrubber, not this element) once native
  // <audio controls> turned out not to respect accentColor at all in
  // current Chrome. accentColor is kept here for Firefox, which does honor
  // it on native <video> controls; harmless no-op where it doesn't apply.
  mediaFull: { width: '100%', display: 'block', accentColor: t.text.primaryBrand },
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
  // Row-major flat grid (see the wordlist branch above): label cells form
  // row 0, then each left[i]/right[i] pair forms one grid row, so the
  // grid's own per-row height keeps left and right aligned even when one
  // side wraps taller than the other -- two independent lists stacked
  // side by side could never do that once any row's heights diverge.
  wordListGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 20, rowGap: 8, alignItems: 'start' },
  wordListLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 },
  wordListCell: { fontSize: 14, padding: '8px 10px', borderRadius: 6, background: t.background.subtle, color: t.text.primary, lineHeight: 1.5 },
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
  attachmentsBlock: { marginTop: 20, paddingTop: 20, borderTop: `1px solid ${t.border.subtle}` },
  attachmentsLabel: {
    fontFamily: mono,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: t.text.tertiary,
    marginBottom: 10,
  },
  attachmentCaption: { fontSize: 12.5, color: t.text.tertiary, marginTop: 6 },
  attachmentFileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 8,
    background: t.background.subtle,
    border: `1px solid ${t.border.subtle}`,
  },
  attachmentFileName: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    color: t.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  downloadBtnSmall: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: t.text.primaryBrand,
    color: t.text.onPrimary,
    border: 'none',
    borderRadius: 7,
    padding: '5px 9px',
    fontSize: 11.5,
    fontWeight: 600,
    textDecoration: 'none',
    flexShrink: 0,
  },
}
