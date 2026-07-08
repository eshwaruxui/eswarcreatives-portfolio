// Proposal reminder modal for the admin proposals view/detail.
// Opens when admin clicks "Nudge" on a sent (awaiting response) proposal.
// The edge function regenerates public_token on every send (7-day TTL).
// WhatsApp: opens wa.me URL in a new tab (token + URL returned by fn).
// Email: calls send-proposal-nudge edge function which sends via Resend.
// Theme tokens only; no raw hex; no em dashes.
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts } from '../theme'
import { Modal, mono, formatDate } from './ui'
import type { CSSProperties } from 'react'

export type NudgeProposal = {
  id: string
  title: string
  client_id: string | null
  client_name: string | null
  company_name: string | null
  total_amount: number
  currency: string
  status: string
  nudge_count?: number
  last_nudge_sent_at?: string | null
}

type Channel = 'whatsapp' | 'email'

const SITE_BASE = 'https://www.eswarcreatives.in'

function formatMoney(amount: number, currency: string): string {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString()}`
  }
}

function minutesAgo(isoStr: string): number {
  return Math.floor((Date.now() - new Date(isoStr).getTime()) / 60_000)
}

export function ProposalNudgeModal({
  proposal,
  onClose,
  onSuccess,
}: {
  proposal: NudgeProposal
  onClose: () => void
  onSuccess: (msg: string) => void
}) {
  const [channel, setChannel]                     = useState<Channel>('whatsapp')
  const [whatsappNumber, setWhatsappNumber]       = useState<string | null>(null)
  const [clientEmail, setClientEmail]             = useState<string | null>(null)
  const [clientFirstName, setClientFirstName]     = useState<string>('')
  const [contactLoaded, setContactLoaded]         = useState(false)
  const [sending, setSending]                     = useState(false)
  const [error, setError]                         = useState<string | null>(null)
  const [rateLimitWarning, setRateLimitWarning]   = useState(false)
  const [confirmSend, setConfirmSend]             = useState(false)

  // Placeholder token for message preview; edge function generates the real one.
  const previewToken = useRef(crypto.randomUUID()).current
  const proposalUrl  = `${SITE_BASE}/proposal/${previewToken}`

  const totalStr = Number(proposal.total_amount) > 0
    ? formatMoney(Number(proposal.total_amount), proposal.currency)
    : 'Value TBD'

  const displayName = proposal.client_name || proposal.company_name || ''
  const firstName   = clientFirstName || displayName.split(' ')[0] || 'there'

  const whatsappPreview =
    `Hi ${firstName}, your proposal from EswarCreatives for ${proposal.title} is ready to review. ` +
    `Total value: ${totalStr}. View and accept here: ${proposalUrl}`

  const emailSubject  = 'Your proposal from EswarCreatives is ready to review'
  const emailPreview  =
    `Hi ${firstName},\n\n` +
    `Your proposal from EswarCreatives for ${proposal.title} is ready for your review.\n\n` +
    `Total value: ${totalStr}\n\n` +
    `View and accept here: ${proposalUrl}\n\n` +
    `Reply to this email or WhatsApp us if you have any questions.\n\n` +
    `Best regards,\nEswar\nEswar Creatives\nhello@eswarcreatives.in`

  // Fetch whatsapp_number, founder_name, email from the linked client row.
  useEffect(() => {
    if (!proposal.client_id) {
      setContactLoaded(true)
      return
    }
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('clients')
        .select('whatsapp_number, founder_name, profiles(email)')
        .eq('id', proposal.client_id!)
        .maybeSingle()
      if (cancelled || !data) {
        setContactLoaded(true)
        return
      }
      const row = data as {
        whatsapp_number?: string | null
        founder_name?: string | null
        profiles?: { email?: string } | { email?: string }[] | null
      }
      setWhatsappNumber(row.whatsapp_number ?? null)
      if (row.founder_name) setClientFirstName(row.founder_name.split(' ')[0])
      const prof  = row.profiles
      const email = Array.isArray(prof) ? prof[0]?.email : prof?.email
      setClientEmail(email ?? null)
      setContactLoaded(true)
    })()
    return () => { cancelled = true }
  }, [proposal.client_id])

  // Rate limit check: warn if a nudge was sent less than 1 hour ago.
  useEffect(() => {
    if (proposal.last_nudge_sent_at) {
      const mins = minutesAgo(proposal.last_nudge_sent_at)
      if (mins < 60) setRateLimitWarning(true)
    }
  }, [proposal.last_nudge_sent_at])

  async function doSend() {
    setSending(true)
    setError(null)

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('send-proposal-nudge', {
        body: { proposal_id: proposal.id, channel },
      })

      if (fnErr) throw new Error('fn_error')

      if (data?.error === 'already_accepted') {
        setError('This proposal has already been accepted. No reminder sent.')
        setSending(false)
        return
      }
      if (data?.error === 'already_declined') {
        setError('This proposal has already been declined. No reminder sent.')
        setSending(false)
        return
      }
      if (data?.error === 'not_sent') {
        setError('Only sent proposals can be nudged. Send the proposal to the client first.')
        setSending(false)
        return
      }
      if (data?.error === 'no_email') {
        setError('No email address on file for this client. Add it in the client profile to enable email reminders.')
        setSending(false)
        return
      }
      if (data?.error === 'no_whatsapp') {
        setError('No WhatsApp number on file for this client. Add it in the client profile to enable WhatsApp reminders.')
        setSending(false)
        return
      }

      if (!data?.success) throw new Error('fn_error')

      // For WhatsApp: open wa.me with the server-generated message text.
      if (channel === 'whatsapp') {
        const realUrl   = data.public_url ?? proposalUrl
        const waText    = data.whatsapp_text ?? whatsappPreview.replace(proposalUrl, realUrl)
        const number    = (whatsappNumber ?? '').replace(/\D/g, '')
        window.open(
          `https://wa.me/${number}?text=${encodeURIComponent(waText)}`,
          '_blank',
          'noopener,noreferrer'
        )
      }

      const name = proposal.client_name || proposal.company_name || 'client'
      onSuccess(`Reminder sent to ${name} via ${channel === 'whatsapp' ? 'WhatsApp' : 'email'}`)
      onClose()
    } catch {
      setError('Could not send the reminder. Check your connection and try again.')
      setSending(false)
    }
  }

  function handleSend() {
    if (rateLimitWarning && !confirmSend) {
      setConfirmSend(true)
      return
    }
    void doSend()
  }

  const noWhatsapp = contactLoaded && !whatsappNumber && channel === 'whatsapp'
  const noEmail    = contactLoaded && !clientEmail    && channel === 'email'
  const sendDisabled = sending || noWhatsapp || noEmail

  return (
    <Modal title="Send proposal reminder" onClose={onClose}>
      <div style={styles.body}>
        {/* Proposal summary */}
        <div style={styles.summaryGrid}>
          <SummaryRow label="Client" value={displayName || 'Unknown'} />
          <SummaryRow label="Proposal" value={proposal.title} />
          <SummaryRow
            label="Total value"
            value={totalStr}
            highlight={Number(proposal.total_amount) > 0}
          />
          {(proposal.nudge_count ?? 0) > 0 && (
            <SummaryRow
              label="Reminders sent"
              value={String(proposal.nudge_count)}
            />
          )}
        </div>

        {/* Rate limit warning */}
        {rateLimitWarning && proposal.last_nudge_sent_at && (
          <div style={styles.warningBanner}>
            A reminder was sent{' '}
            {minutesAgo(proposal.last_nudge_sent_at)} minute
            {minutesAgo(proposal.last_nudge_sent_at) !== 1 ? 's' : ''} ago.
            {confirmSend
              ? ' Click "Send anyway" to proceed.'
              : ''}
          </div>
        )}

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
          {noWhatsapp && (
            <div style={styles.contactWarning}>
              No WhatsApp number on file for this client. Add a WhatsApp number in the client profile to enable this.
            </div>
          )}
          {noEmail && (
            <div style={styles.contactWarning}>
              No email address on file for this client. Add an email in the client profile to enable this.
            </div>
          )}
        </div>

        {/* Message preview */}
        <div style={styles.field}>
          {channel === 'email' && (
            <div style={styles.emailSubject}>
              <span style={styles.fieldLabel}>Subject</span>
              <span style={styles.subjectVal}>{emailSubject}</span>
            </div>
          )}
          <span style={styles.fieldLabel}>Message preview</span>
          <pre style={styles.preview}>
            {channel === 'whatsapp' ? whatsappPreview : emailPreview}
          </pre>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        {/* CTA row: rate limit confirmation shows two buttons */}
        {rateLimitWarning && confirmSend && !sending ? (
          <div style={styles.ctaRow}>
            <button
              type="button"
              style={{ ...styles.sendBtn, flex: 1 }}
              onClick={() => void doSend()}
            >
              Send anyway
            </button>
            <button
              type="button"
              style={{ ...styles.cancelBtn, flex: 1 }}
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            style={{
              ...styles.sendBtn,
              ...(sendDisabled ? styles.sendBtnBusy : null),
            }}
            onClick={handleSend}
            disabled={sendDisabled}
          >
            {sending ? 'Sending...' : 'Send reminder'}
          </button>
        )}
      </div>
    </Modal>
  )
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div style={styles.summaryRow}>
      <span style={styles.summaryKey}>{label}</span>
      <span
        style={{
          ...styles.summaryVal,
          ...(highlight ? { color: tokens.primary, fontFamily: mono, fontWeight: 700, fontSize: 15 } : null),
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
    alignItems: 'flex-start',
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
    wordBreak: 'break-word',
  },
  warningBanner: {
    background: tokens.goldLight,
    color: tokens.goldDark,
    border: `1px solid ${tokens.gold}`,
    borderRadius: 8,
    padding: '10px 14px',
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 1.5,
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
  contactWarning: {
    background: tokens.goldLight,
    color: tokens.goldDark,
    border: `1px solid ${tokens.gold}`,
    borderRadius: 6,
    padding: '8px 12px',
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 1.5,
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
    lineHeight: 1.5,
  },
  ctaRow: {
    display: 'flex',
    gap: 8,
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
  sendBtnBusy: { opacity: 0.55, cursor: 'not-allowed' },
  cancelBtn: {
    background: 'transparent',
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: 500,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '13px 0',
    cursor: 'pointer',
  },
}

// Inlined to avoid a circular dep with ui.ts; matches the formatDate util signature.
export { formatDate }
