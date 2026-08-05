// Public Outputs file share view — accessible without authentication.
// Reached via /output/:token; the token is a uuid generated server-side and
// stored on the project_output_files row. Metadata comes from
// get_output_file_by_token (SECURITY DEFINER, anon-callable, mirrors
// get_invoice_by_token), the downloadable URL from the get-output-file-url
// edge function (Postgres can't mint a Storage signed URL directly).
// Theme tokens only; no raw hex; no em dashes.
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { File, FileText, Image as ImageIcon, Video } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { tokens, t, fonts } from './theme'
import { formatBytes } from './utils/formatBytes'
import { fileKind } from './utils/fileKind'
import eswarLogo from '../imports/eswar-logo.svg'
import type { CSSProperties } from 'react'

type FileMeta = {
  id: string
  file_name: string
  file_size: number | null
  file_type: string | null
  uploaded_at: string
}

export function PublicOutputFilePage() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState<FileMeta | null>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (!token) {
      setExpired(true)
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase.rpc('get_output_file_by_token', { p_token: token })
      if (cancelled) return
      if (error || !data) {
        setExpired(true)
        setLoading(false)
        return
      }
      setMeta(data as FileMeta)

      const { data: urlData, error: urlErr } = await supabase.functions.invoke('get-output-file-url', {
        body: { token },
      })
      if (cancelled) return
      if (urlErr || !urlData?.signed_url || !urlData?.download_url) {
        setExpired(true)
      } else {
        setSignedUrl(urlData.signed_url as string)
        setDownloadUrl(urlData.download_url as string)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [token])

  useEffect(() => {
    if (!meta) return
    document.title = `${meta.file_name} — Eswar Creatives`
    return () => { document.title = 'Eswar Creatives' }
  }, [meta])

  const kind = fileKind(meta?.file_type ?? null)

  return (
    <div style={styles.page}>
      <header style={styles.topBar}>
        <div style={styles.topInner}>
          <img src={eswarLogo} alt="EswarCreatives" width={28} height={28} style={{ display: 'block' }} />
          <span style={styles.topName}>EswarCreatives</span>
        </div>
      </header>

      <main style={styles.main}>
        {loading && <p style={styles.muted}>Loading...</p>}

        {!loading && (expired || !meta || !signedUrl || !downloadUrl) && (
          <div style={styles.errorCard}>
            <div style={styles.errorTitle}>This link has expired</div>
            <p style={styles.errorBody}>Please contact Eswar Creatives for an updated link.</p>
            <a href="mailto:hello@eswarcreatives.in" style={styles.emailLink}>hello@eswarcreatives.in</a>
          </div>
        )}

        {!loading && meta && signedUrl && downloadUrl && (
          <div style={styles.docCard}>
            <div style={styles.previewArea}>
              {kind === 'image' && (
                <img src={signedUrl} alt={meta.file_name} style={styles.previewImg} />
              )}
              {kind === 'pdf' && (
                <iframe src={signedUrl} title={meta.file_name} style={styles.previewFrame} />
              )}
              {kind === 'video' && (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={signedUrl} controls style={styles.previewVideo} />
              )}
              {kind === 'other' && (
                <div style={styles.previewIconWrap}>
                  {kind === 'other' && <File size={48} color={t.text.muted} />}
                </div>
              )}
            </div>

            <div style={styles.metaRow}>
              <span style={styles.metaIcon}>
                {kind === 'pdf' ? <FileText size={16} color={tokens.ruby} />
                  : kind === 'image' ? <ImageIcon size={16} color={tokens.accent} />
                  : kind === 'video' ? <Video size={16} color={t.text.muted} />
                  : <File size={16} color={t.text.muted} />}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={styles.fileName}>{meta.file_name}</div>
                {meta.file_size != null && <div style={styles.fileSize}>{formatBytes(meta.file_size)}</div>}
              </div>
            </div>

            {/* downloadUrl (Content-Disposition: attachment) not signedUrl --
                the plain preview URL is what renders inline above; reusing
                it here would just reopen the file inline. The `download`
                attribute is kept as a filename hint, but does nothing on
                its own for this cross-origin URL -- the server header from
                the download option is what actually forces the save. */}
            <a href={downloadUrl} download={meta.file_name} style={styles.downloadBtn}>
              Download
            </a>
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        eswarcreatives.in &middot; hello@eswarcreatives.in
      </footer>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: tokens.bg, display: 'flex', flexDirection: 'column' },
  topBar: { background: tokens.surface, borderBottom: `1px solid ${t.border.overlayStrong}`, height: 56, flexShrink: 0 },
  topInner: { maxWidth: 640, margin: '0 auto', height: '100%', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 10 },
  topName: { fontFamily: fonts.heading, fontStyle: 'italic', fontSize: 16, fontWeight: 700, color: t.text.primary },
  main: { flex: 1, maxWidth: 640, width: '100%', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 20, boxSizing: 'border-box' },
  muted: { fontFamily: fonts.body, fontSize: 14, color: t.text.muted, margin: 0 },
  errorCard: { background: tokens.surface, border: `1px solid ${t.border.default}`, borderRadius: 12, padding: 32, textAlign: 'center' },
  errorTitle: { fontFamily: fonts.heading, fontSize: 20, fontWeight: 700, color: t.text.primary, marginBottom: 12 },
  errorBody: { fontFamily: fonts.body, fontSize: 15, color: t.text.secondary, margin: '0 0 16px', lineHeight: 1.6 },
  emailLink: { fontFamily: fonts.body, fontSize: 14, color: t.text.primaryBrand, textDecoration: 'none', fontWeight: 500 },
  docCard: { background: tokens.surface, border: `1px solid ${t.border.default}`, borderRadius: 12, overflow: 'hidden' },
  previewArea: { display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.background.subtle, minHeight: 240, maxHeight: 480, overflow: 'hidden' },
  previewImg: { maxWidth: '100%', maxHeight: 480, display: 'block', objectFit: 'contain' },
  previewFrame: { width: '100%', height: 480, border: 'none' },
  previewVideo: { maxWidth: '100%', maxHeight: 480 },
  previewIconWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, width: '100%' },
  metaRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '18px 20px 4px' },
  metaIcon: { flexShrink: 0 },
  fileName: { fontFamily: fonts.body, fontSize: 15, fontWeight: 600, color: t.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileSize: { fontFamily: fonts.body, fontSize: 12, color: t.text.muted, marginTop: 2 },
  downloadBtn: {
    display: 'block', textAlign: 'center', margin: '16px 20px 20px',
    background: tokens.primary, color: t.text.onPrimary, fontFamily: fonts.body,
    fontSize: 15, fontWeight: 600, borderRadius: 8, padding: '12px 24px',
    textDecoration: 'none',
  },
  footer: { textAlign: 'center', fontFamily: fonts.body, fontSize: 12, color: t.text.muted, padding: '20px 24px', borderTop: `1px solid ${t.border.subtle}` },
}
