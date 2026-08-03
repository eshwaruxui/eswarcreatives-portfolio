// Persistent invoice preview. On desktop it is a drawer sliding in from the
// right while the invoice list stays visible and scrollable on the left; below
// 768px it becomes a bottom sheet. The document body is the shared
// InvoiceDocument, so admin and client show the exact same invoice template.
import { useEffect, useState, useRef } from 'react'
import { Download, X, Copy, ExternalLink, Paperclip } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { sanitizeFilename } from '../../lib/sanitizeFilename'
import { tokens, t, fonts } from '../theme'
import { InvoiceDocument, type InvoiceLine, type InvoicePaymentRow } from '../components/shared/InvoiceDocument'
import { mono } from './ui'
import { formatPortalDate } from '../utils/formatDate'
import { useBreakpoint } from '../hooks/useBreakpoint'
import type { CSSProperties } from 'react'

const MAX_PROOF_BYTES = 5 * 1024 * 1024 // 5 MB, matches ConfirmPaymentModal.
const PROOF_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

type NudgeLogRow = {
  id: string
  sent_at: string
  channel: string
  message_preview: string | null
}

export type PreviewInvoice = {
  id: string
  invoice_number: string
  client_name: string | null
  company_name: string | null
  label: string | null
  billing_title: string | null
  amount: number
  currency: string
  status: string
  due_date: string | null
  notes: string | null
  created_at: string
  client_id: string | null
}

export function InvoicePreview({
  invoice,
  numberLabel,
  onClose,
}: {
  invoice: PreviewInvoice
  // Display-formatted invoice number. Falls back to the raw value.
  numberLabel?: string
  onClose: () => void
}) {
  // useBreakpoint is the sole breakpoint authority (see hooks/useBreakpoint.ts);
  // this used to be a local window.matchMedia hook, replaced to match the rule.
  const { isMobile: narrow } = useBreakpoint()
  const [shown, setShown] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [city, setCity] = useState<string | null>(null)
  const [lines, setLines] = useState<InvoiceLine[]>([])
  const [payments, setPayments] = useState<InvoicePaymentRow[]>([])
  const [nudgeLogs, setNudgeLogs] = useState<NudgeLogRow[]>([])
  const [publicToken, setPublicToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Payment proof view/attach (paperclip view via signed URL; attach uploads
  // to payment_proofs and writes proof_url back onto the invoice_payments row).
  const [proofBusyId, setProofBusyId] = useState<string | null>(null)
  const [proofToast, setProofToast] = useState<string | null>(null)
  const proofFileInputRef = useRef<HTMLInputElement | null>(null)
  const pendingProofPaymentIdRef = useRef<string | null>(null)

  // Trigger the slide-in transition once mounted.
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(t)
  }, [])

  // Itemised breakdown, if this invoice has one (0062 invoice_line_items).
  useEffect(() => {
    let cancelled = false
    setLines([])
    ;(async () => {
      const { data } = await supabase
        .from('invoice_line_items')
        .select('label, amount, sort_order')
        .eq('invoice_id', invoice.id)
        .order('sort_order', { ascending: true })
      if (cancelled || !data) return
      setLines(data.map((r) => ({ label: r.label as string, amount: Number(r.amount) })))
    })()
    return () => {
      cancelled = true
    }
  }, [invoice.id])

  // Partial payment history (0065 invoice_payments).
  useEffect(() => {
    let cancelled = false
    setPayments([])
    ;(async () => {
      const { data } = await supabase
        .from('invoice_payments')
        .select('id, paid_on, method, amount, reference_note, proof_url')
        .eq('invoice_id', invoice.id)
        .order('paid_on', { ascending: true })
      if (cancelled || !data) return
      setPayments(
        data.map((r) => ({
          id: r.id as string,
          paid_on: r.paid_on as string,
          method: r.method as string | null,
          amount: Number(r.amount),
          reference_note: r.reference_note as string | null,
          proof_url: r.proof_url as string | null,
        }))
      )
    })()
    return () => {
      cancelled = true
    }
  }, [invoice.id])

  // Nudge history (0069 nudge_log). Falls back to empty if table does not exist
  // yet (migration pending), so the drawer works before the migration is applied.
  useEffect(() => {
    let cancelled = false
    setNudgeLogs([])
    ;(async () => {
      const { data } = await supabase
        .from('nudge_log')
        .select('id, sent_at, channel, message_preview')
        .eq('invoice_id', invoice.id)
        .order('sent_at', { ascending: false })
      if (cancelled || !data) return
      setNudgeLogs(data as NudgeLogRow[])
    })()
    return () => {
      cancelled = true
    }
  }, [invoice.id])

  // Public token for building the payment link sent to the client.
  useEffect(() => {
    let cancelled = false
    setPublicToken(null)
    ;(async () => {
      const { data } = await supabase
        .from('invoices')
        .select('public_token')
        .eq('id', invoice.id)
        .maybeSingle()
      if (cancelled || !data) return
      setPublicToken((data as { public_token: string }).public_token ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [invoice.id])

  // Email + city are not on the invoice row; fetch them from the linked client.
  useEffect(() => {
    let cancelled = false
    setEmail(null)
    setCity(null)
    if (!invoice.client_id) return
    ;(async () => {
      const { data } = await supabase
        .from('clients')
        .select('country, profiles(email)')
        .eq('id', invoice.client_id)
        .maybeSingle()
      if (cancelled || !data) return
      const prof = data.profiles as { email?: string } | { email?: string }[] | null
      const e = Array.isArray(prof) ? prof[0]?.email : prof?.email
      setEmail(e ?? null)
      setCity((data as { country?: string }).country ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [invoice.client_id])

  // Auto-dismiss the proof action toast.
  useEffect(() => {
    if (!proofToast) return
    const id = setTimeout(() => setProofToast(null), 3500)
    return () => clearTimeout(id)
  }, [proofToast])

  async function handleViewProof(payment: InvoicePaymentRow) {
    if (!payment.id || !payment.proof_url) return
    setProofBusyId(payment.id)
    try {
      const { data, error } = await supabase.storage
        .from('payment_proofs')
        .createSignedUrl(payment.proof_url, 3600)
      if (error || !data?.signedUrl) {
        setProofToast('Could not open the proof file. Try again.')
        return
      }
      window.open(data.signedUrl, '_blank', 'noopener')
    } finally {
      setProofBusyId(null)
    }
  }

  function triggerAttachProof(payment: InvoicePaymentRow) {
    if (!payment.id) return
    pendingProofPaymentIdRef.current = payment.id
    proofFileInputRef.current?.click()
  }

  async function onProofFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const paymentId = pendingProofPaymentIdRef.current
    if (proofFileInputRef.current) proofFileInputRef.current.value = ''
    if (!file || !paymentId) return

    if (!PROOF_ACCEPTED_TYPES.includes(file.type)) {
      setProofToast('Only JPEG, PNG, WebP, or PDF files are accepted.')
      return
    }
    if (file.size > MAX_PROOF_BYTES) {
      setProofToast('File exceeds the 5 MB limit.')
      return
    }

    setProofBusyId(paymentId)
    try {
      const ext = file.name.split('.').pop() ?? 'bin'
      const path = `${invoice.id}/${Date.now()}-${sanitizeFilename(file.name)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('payment_proofs')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (upErr) {
        setProofToast('Could not attach the proof. Try again.')
        return
      }
      const { error: updErr } = await supabase
        .from('invoice_payments')
        .update({ proof_url: path })
        .eq('id', paymentId)
      if (updErr) {
        setProofToast('Proof uploaded but could not be saved. Refresh to verify.')
        return
      }
      setPayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, proof_url: path } : p)))
      setProofToast('Proof attached.')
    } finally {
      setProofBusyId(null)
    }
  }

  function renderPaymentProof(payment: InvoicePaymentRow) {
    const busy = proofBusyId === payment.id
    if (payment.proof_url) {
      return (
        <button
          type="button"
          style={proofStyles.iconBtn}
          onClick={() => void handleViewProof(payment)}
          disabled={busy}
          aria-label="View payment proof"
          title="View payment proof"
        >
          <Paperclip size={13} />
        </button>
      )
    }
    return (
      <button
        type="button"
        style={proofStyles.attachBtn}
        onClick={() => triggerAttachProof(payment)}
        disabled={busy}
      >
        {busy ? 'Uploading...' : '+ Attach proof'}
      </button>
    )
  }

  const number = numberLabel ?? invoice.invoice_number
  const company = invoice.company_name || invoice.client_name || 'Client'

  const panelStyle: CSSProperties = narrow
    ? {
        ...styles.panelBase,
        ...styles.sheet,
        transform: shown ? 'translateY(0)' : 'translateY(100%)',
      }
    : {
        ...styles.panelBase,
        ...styles.drawer,
        transform: shown ? 'translateX(0)' : 'translateX(100%)',
      }

  return (
    <>
      {/* Backdrop only on the mobile bottom sheet; the desktop drawer leaves the
          list interactive. */}
      {narrow && <div style={styles.backdrop} onClick={onClose} />}
      <aside style={panelStyle} role="dialog" aria-label={`Invoice ${number}`}>
        <button type="button" style={styles.close} onClick={onClose} aria-label="Close preview">
          <X size={18} />
        </button>

        <InvoiceDocument
          invoice={{
            number,
            status: invoice.status,
            label: invoice.label,
            billingTitle: invoice.billing_title,
            amount: Number(invoice.amount),
            currency: invoice.currency,
            issuedDate: invoice.created_at,
            dueDate: invoice.due_date,
            notes: invoice.notes,
          }}
          billedTo={{
            company,
            contactName: invoice.client_name,
            email,
            city,
          }}
          lines={lines}
          payments={payments.length > 0 ? payments : undefined}
          renderPaymentProof={renderPaymentProof}
        />

        <input
          ref={proofFileInputRef}
          type="file"
          accept={PROOF_ACCEPTED_TYPES.join(',')}
          style={{ display: 'none' }}
          onChange={(e) => void onProofFileChange(e)}
        />

        {proofToast && <div style={proofStyles.toast}>{proofToast}</div>}

        <div style={downloadWrap}>
          <button type="button" style={downloadBtn} onClick={handleDownloadPDF}>
            <Download size={15} />
            Download PDF
          </button>
        </div>

        {/* Payment link: copy the public invoice URL or open it to test.
            Both buttons first rotate the token (30-day TTL) so the link is
            always fresh and never expired when handed to the client. */}
        {publicToken && (
          <div style={linkStyles.section}>
            <div style={linkStyles.heading}>Payment link</div>
            <div style={linkStyles.urlRow}>
              <span style={linkStyles.url}>
                https://www.eswarcreatives.in/invoice/{publicToken}
              </span>
            </div>
            <div style={linkStyles.actions}>
              <button
                type="button"
                style={linkStyles.btn}
                disabled={regenerating}
                onClick={async () => {
                  setRegenerating(true)
                  try {
                    const { data: newToken } = await supabase.rpc('regenerate_invoice_token', {
                      p_invoice_id: invoice.id,
                    })
                    if (!newToken) return
                    setPublicToken(newToken as string)
                    await navigator.clipboard.writeText(
                      `https://www.eswarcreatives.in/invoice/${newToken}`
                    )
                    setCopied(true)
                    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
                    copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
                  } finally {
                    setRegenerating(false)
                  }
                }}
              >
                <Copy size={13} />
                {copied ? 'Copied!' : regenerating ? '...' : 'Copy link'}
              </button>
              <button
                type="button"
                style={linkStyles.testLink}
                disabled={regenerating}
                onClick={async () => {
                  setRegenerating(true)
                  try {
                    const { data: newToken } = await supabase.rpc('regenerate_invoice_token', {
                      p_invoice_id: invoice.id,
                    })
                    if (!newToken) return
                    setPublicToken(newToken as string)
                    window.open(
                      `https://www.eswarcreatives.in/invoice/${newToken}`,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  } finally {
                    setRegenerating(false)
                  }
                }}
              >
                <ExternalLink size={13} />
                Test payment flow
              </button>
            </div>
          </div>
        )}

        {/* Nudge history: shows reminders sent for this invoice (0069). */}
        {nudgeLogs.length > 0 && (
          <div style={nudgeStyles.section}>
            <div style={nudgeStyles.heading}>Reminders sent</div>
            {nudgeLogs.map((log) => (
              <div key={log.id} style={nudgeStyles.row}>
                <div style={nudgeStyles.rowTop}>
                  <span style={nudgeStyles.channel}>
                    {log.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                  </span>
                  <span style={nudgeStyles.date}>{formatPortalDate(log.sent_at)}</span>
                </div>
                {log.message_preview && (
                  <p style={nudgeStyles.preview}>{log.message_preview}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </aside>
    </>
  )
}

// Clones the invoice element to the body root so it escapes the
// position:fixed drawer ancestor that causes per-page repetition in print.
function handleDownloadPDF() {
  const el = document.querySelector<HTMLElement>('.ec-invoice-document')
  if (!el) { window.print(); return }
  document.getElementById('ec-print-root')?.remove()
  const printRoot = document.createElement('div')
  printRoot.id = 'ec-print-root'
  printRoot.appendChild(el.cloneNode(true))
  document.body.appendChild(printRoot)
  document.body.setAttribute('data-ec-printing', 'true')
  const cleanup = () => {
    document.body.removeAttribute('data-ec-printing')
    document.getElementById('ec-print-root')?.remove()
  }
  window.addEventListener('afterprint', cleanup, { once: true })
  window.print()
}

const downloadWrap: CSSProperties = {
  margin: '0 32px 24px',
}

const downloadBtn: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  width: '100%',
  minHeight: 44,
  padding: '10px 18px',
  background: 'transparent',
  border: `1px solid ${tokens.border}`,
  borderRadius: 8,
  color: t.text.secondary,
  fontFamily: fonts.body,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

const linkStyles: Record<string, CSSProperties> = {
  section: {
    margin: '0 32px 0',
    borderTop: `1px solid ${t.border.subtle}`,
    paddingTop: 20,
    paddingBottom: 20,
  },
  heading: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: t.text.tertiary,
    marginBottom: 10,
  },
  urlRow: {
    background: tokens.bg,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 6,
    padding: '8px 12px',
    marginBottom: 10,
    overflow: 'hidden',
  },
  url: {
    fontFamily: "'SF Mono', 'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 11,
    color: t.text.secondary,
    wordBreak: 'break-all',
    display: 'block',
  },
  actions: {
    display: 'flex',
    gap: 8,
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 12px',
    background: 'transparent',
    border: `1px solid ${tokens.border}`,
    borderRadius: 6,
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  testLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 12px',
    background: 'transparent',
    border: `1px solid ${tokens.border}`,
    borderRadius: 6,
    color: t.text.primaryBrand,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'none',
  },
}

const proofStyles: Record<string, CSSProperties> = {
  iconBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    background: 'transparent',
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 6,
    color: t.text.secondary,
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
  },
  attachBtn: {
    background: 'transparent',
    border: 'none',
    color: t.text.primaryBrand,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  toast: {
    position: 'fixed' as const,
    bottom: 24,
    right: 24,
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 8,
    padding: '10px 16px',
    zIndex: 500,
    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
    pointerEvents: 'none' as const,
  },
}

const nudgeStyles: Record<string, CSSProperties> = {
  section: {
    margin: '0 32px 32px',
    borderTop: `1px solid ${t.border.subtle}`,
    paddingTop: 20,
  },
  heading: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: t.text.tertiary,
    marginBottom: 12,
  },
  row: {
    padding: '10px 0',
    borderBottom: `1px solid ${t.border.subtle}`,
  },
  rowTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  channel: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    color: t.text.primary,
  },
  date: {
    fontFamily: mono,
    fontSize: 12,
    color: t.text.muted,
  },
  preview: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.tertiary,
    margin: 0,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  },
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10, 26, 27, 0.4)',
    zIndex: 200,
  },
  panelBase: {
    position: 'fixed',
    background: tokens.surface,
    zIndex: 201,
    boxShadow: '0 12px 48px rgba(2, 76, 79, 0.18)',
    transition: 'transform 0.28s ease',
    overflowY: 'auto',
  },
  drawer: {
    top: 0,
    right: 0,
    height: '100vh',
    width: 480,
    maxWidth: '92vw',
    borderLeft: `1px solid ${tokens.border}`,
  },
  sheet: {
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '88vh',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  close: {
    position: 'absolute',
    top: 14,
    right: 14,
    background: tokens.bg,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    color: t.text.muted,
    cursor: 'pointer',
    padding: 6,
    display: 'flex',
    zIndex: 1,
  },
}
