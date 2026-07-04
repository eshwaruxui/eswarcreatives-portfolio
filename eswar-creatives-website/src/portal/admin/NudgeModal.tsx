// Compact payment-reminder modal for the admin invoices list.
// Opens when admin clicks "Nudge" on a pending/overdue/partially-paid invoice.
// Regenerates the public_token on every send so each link is fresh (7-day TTL).
// WhatsApp: opens wa.me URL in a new tab. Email: calls send-invoice-nudge fn.
// Theme tokens only; no raw hex; no em dashes.
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts } from '../theme'
import { Modal, mono, formatDate } from './ui'
import type { CSSProperties } from 'react'

// Statuses where a nudge makes sense (invoice still has an outstanding balance).
export const NUDGEABLE = new Set(['pending', 'sent', 'overdue', 'partially_paid'])

export type NudgeInvoice = {
  id: string
  invoice_number: string
  client_id: string | null
  client_name: string | null
  company_name: string | null
  label: string | null
  amount: number
  currency: string
  status: string
  due_date: string | null
  nudge_count?: number
  _amountPaid?: number
}

type Channel = 'whatsapp' | 'email'

// Public site base for invoice links.
const SITE_BASE = 'https://www.eswarcreatives.in'

function formatMoney(amount: number, currency: string): string {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString()}`
  }
}

function computeBalance(inv: NudgeInvoice): number {
  if (inv.status === 'paid') return 0
  const total = Number(inv.amount)
  if (inv.status === 'partially_paid' && inv._amountPaid !== undefined) {
    return Math.max(0, total - inv._amountPaid)
  }
  return total
}

function buildMessage(
  channel: Channel,
  clientName: string,
  balance: string,
  label: string | null,
  dueDate: string | null,
  invoiceUrl: string,
  invoiceNumber: string
): { preview: string; subject?: string } {
  const name = clientName || 'there'
  const project = label || 'your project'
  const dateStr = dueDate ? formatDate(dueDate) : 'the due date'

  if (channel === 'whatsapp') {
    return {
      preview: `Hi ${name}, your balance of ${balance} for ${project} is due on ${dateStr}. View invoice: ${invoiceUrl}`,
    }
  }

  const body = [
    `Hi ${name},`,
    '',
    `This is a reminder that your balance of ${balance} for ${project} is due on ${dateStr}.`,
    '',
    `View your invoice here: ${invoiceUrl}`,
    '',
    'Please reach out if you have any questions.',
    '',
    'Best regards,',
    'Eswar',
    'Eswar Creatives',
    'hello@eswarcreatives.in',
  ].join('\n')

  return {
    preview: body,
    subject: `Payment reminder — ${invoiceNumber}`,
  }
}

export function NudgeModal({
  invoice,
  sentById,
  onClose,
  onSuccess,
}: {
  invoice: NudgeInvoice
  sentById: string
  onClose: () => void
  onSuccess: (msg: string) => void
}) {
  const [channel, setChannel] = useState<Channel>('whatsapp')
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null)
  const [clientEmail, setClientEmail] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Stable token generated once when the modal mounts. We reuse it for the
  // preview so the URL shown = the URL that will be sent.
  const [pendingToken] = useState(() => crypto.randomUUID())

  const balance = computeBalance(invoice)
  const displayNumber = invoice.invoice_number.replace(/^EC-I-/, 'EC-')
  const invoiceUrl = `${SITE_BASE}/invoice/${pendingToken}`

  const { preview, subject } = buildMessage(
    channel,
    invoice.client_name || invoice.company_name || '',
    formatMoney(balance, invoice.currency),
    invoice.label,
    invoice.due_date,
    invoiceUrl,
    displayNumber
  )

  // Fetch whatsapp_number + email from the linked client row.
  useEffect(() => {
    if (!invoice.client_id) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('clients')
        .select('whatsapp_number, profiles(email)')
        .eq('id', invoice.client_id!)
        .maybeSingle()
      if (cancelled || !data) return
      setWhatsappNumber((data as { whatsapp_number?: string | null }).whatsapp_number ?? null)
      const prof = (data as { profiles?: { email?: string } | { email?: string }[] | null }).profiles
      const email = Array.isArray(prof) ? prof[0]?.email : prof?.email
      setClientEmail(email ?? null)
    })()
    return () => { cancelled = true }
  }, [invoice.client_id])

  async function handleSend() {
    setSending(true)
    setError(null)

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const now = new Date().toISOString()

    try {
      // 1. Update the invoice with the new token + nudge tracking fields.
      const { error: invErr } = await supabase
        .from('invoices')
        .update({
          public_token: pendingToken,
          public_token_expires_at: expiresAt,
          last_nudge_sent_at: now,
          nudge_count: (invoice.nudge_count ?? 0) + 1,
        })
        .eq('id', invoice.id)
      if (invErr) throw invErr

      // 2. Log the nudge.
      const { error: logErr } = await supabase.from('nudge_log').insert({
        invoice_id: invoice.id,
        channel,
        message_preview: preview.slice(0, 500),
        sent_by: sentById,
      })
      if (logErr) throw logErr

      // 3. Deliver via the chosen channel.
      if (channel === 'whatsapp') {
        const number = (whatsappNumber ?? '').replace(/\D/g, '')
        if (!number) throw new Error('no_whatsapp')
        window.open(
          `https://wa.me/${number}?text=${encodeURIComponent(preview)}`,
          '_blank',
          'noopener,noreferrer'
        )
      } else {
        // Email via send-invoice-nudge edge function.
        const toEmail = clientEmail
        if (!toEmail) throw new Error('no_email')
        const { error: fnErr } = await supabase.functions.invoke('send-invoice-nudge', {
          body: {
            to_email: toEmail,
            to_name: invoice.client_name || invoice.company_name || '',
            invoice_number: displayNumber,
            subject: subject ?? `Payment reminder — ${displayNumber}`,
            message_body: preview,
          },
        })
        if (fnErr) throw fnErr
      }

      const name = invoice.client_name || invoice.company_name || 'client'
      onSuccess(
        `Reminder sent to ${name} via ${channel === 'whatsapp' ? 'WhatsApp' : 'email'}`
      )
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'no_whatsapp') {
        setError('No WhatsApp number on file for this client. Add it in the client profile.')
      } else if (msg === 'no_email') {
        setError('No email address on file for this client.')
      } else {
        setError('Could not send the reminder. Check your connection and try again.')
      }
      setSending(false)
    }
  }

  const clientLabel = invoice.client_name || invoice.company_name || 'Client'

  return (
    <Modal title="Send payment reminder" onClose={onClose}>
      <div style={styles.body}>
        {/* Invoice summary */}
        <div style={styles.summaryGrid}>
          <SummaryRow label="Client" value={clientLabel} />
          <SummaryRow label="Invoice" value={displayNumber} mono />
          <SummaryRow
            label="Balance due"
            value={formatMoney(balance, invoice.currency)}
            mono
            highlight
          />
          {invoice.due_date && (
            <SummaryRow label="Due date" value={formatDate(invoice.due_date)} />
          )}
        </div>

        {/* Channel select */}
        <div style={styles.field}>
          <span style={styles.fieldLabel}>Send via</span>
          <div style={styles.channelRow}>
            {(['whatsapp', 'email'] as Channel[]).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setChannel(ch)}
                style={{
                  ...styles.channelBtn,
                  ...(channel === ch ? styles.channelBtnActive : null),
                }}
              >
                {ch === 'whatsapp' ? 'WhatsApp' : 'Email'}
              </button>
            ))}
          </div>
        </div>

        {/* Message preview */}
        <div style={styles.field}>
          {channel === 'email' && subject && (
            <div style={styles.emailSubject}>
              <span style={styles.fieldLabel}>Subject</span>
              <span style={styles.subjectVal}>{subject}</span>
            </div>
          )}
          <span style={styles.fieldLabel}>Message preview</span>
          <pre style={styles.preview}>{preview}</pre>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        <button
          type="button"
          style={{ ...styles.sendBtn, ...(sending ? styles.sendBtnBusy : null) }}
          onClick={handleSend}
          disabled={sending}
        >
          {sending ? 'Sending...' : 'Send reminder'}
        </button>
      </div>
    </Modal>
  )
}

function SummaryRow({
  label,
  value,
  mono: isMono,
  highlight,
}: {
  label: string
  value: string
  mono?: boolean
  highlight?: boolean
}) {
  return (
    <div style={styles.summaryRow}>
      <span style={styles.summaryKey}>{label}</span>
      <span
        style={{
          ...styles.summaryVal,
          ...(isMono ? { fontFamily: mono } : null),
          ...(highlight ? { color: tokens.primary, fontWeight: 700, fontSize: 15 } : null),
        }}
      >
        {value}
      </span>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  body: {
    padding: '0 20px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  summaryGrid: {
    background: tokens.bg,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 8,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  summaryKey: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.tertiary,
    flexShrink: 0,
  },
  summaryVal: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    textAlign: 'right',
  },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    color: t.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  channelRow: { display: 'flex', gap: 8 },
  channelBtn: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 500,
    color: t.text.secondary,
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '8px 16px',
    cursor: 'pointer',
  },
  channelBtnActive: {
    background: tokens.tealLight,
    color: tokens.primary,
    borderColor: tokens.accent,
    fontWeight: 600,
  },
  emailSubject: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    marginBottom: 8,
  },
  subjectVal: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.secondary,
  },
  preview: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.secondary,
    background: tokens.bg,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 8,
    padding: '12px 14px',
    margin: 0,
    whiteSpace: 'pre-wrap',
    lineHeight: 1.55,
    maxHeight: 180,
    overflowY: 'auto',
  },
  errorBanner: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '10px 14px',
    fontFamily: fonts.body,
    fontSize: 13,
  },
  sendBtn: {
    width: '100%',
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    padding: '13px 0',
    cursor: 'pointer',
    transition: 'opacity 120ms ease',
  },
  sendBtnBusy: { opacity: 0.65, cursor: 'default' },
}
