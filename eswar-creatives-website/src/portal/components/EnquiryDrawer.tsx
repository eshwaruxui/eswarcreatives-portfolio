// Enquiry drawer: full enquiry detail, conversation thread, convert to lead.
// SidePanel on desktop, full-screen bottom sheet on mobile (handled by SidePanel).
import { useEffect, useRef, useState } from 'react'
import { Loader2, Mail, ExternalLink } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../theme'
import { SidePanel } from '../admin/SidePanel'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { showToast } from '../admin/toast'

export type EnquiryStatus = 'new' | 'responded' | 'converted'

type EnquiryDetail = {
  id: string
  first_name: string
  company_name: string
  company_url: string
  buyer_email: string
  platforms: string[]
  team_size: string
  funding_stage: string
  problem: string
  start_timeline: string
  status: EnquiryStatus
  responded_at: string | null
  converted_lead_id: string | null
  created_at: string
}

type ReplyRow = {
  id: string
  enquiry_id: string
  body: string
  sent_by: string | null
  created_at: string
}

const SEND_FAILED_MESSAGE = 'Failed to send. Try again or email eswar@eswarcreatives.in'

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={styles.fieldRow}>
      <p style={styles.fieldLabel}>{label}</p>
      <div style={styles.fieldValue}>{value}</div>
    </div>
  )
}

export function EnquiryDrawer({
  enquiryId,
  onClose,
  onChanged,
}: {
  enquiryId: string
  onClose: () => void
  // Called after a convert or a status-changing reply, so the list view can
  // refresh its rows and the "new" badge count.
  onChanged: () => void
}) {
  const { isMobile } = useBreakpoint()
  const navigate = useNavigate()
  const [enquiry, setEnquiry] = useState<EnquiryDetail | null>(null)
  const [replies, setReplies] = useState<ReplyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)

  async function load() {
    setLoading(true)
    const [{ data: e }, { data: r }] = await Promise.all([
      supabase.from('enquiry_submissions').select('*').eq('id', enquiryId).single(),
      supabase
        .from('enquiry_replies')
        .select('id, enquiry_id, body, sent_by, created_at')
        .eq('enquiry_id', enquiryId)
        .order('created_at', { ascending: true }),
    ])
    setEnquiry(e ?? null)
    setReplies(r ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [enquiryId])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
  }, [replies.length])

  async function handleConvert() {
    if (!enquiry || converting) return
    setConverting(true)
    try {
      const { data: lead, error: leadErr } = await supabase
        .from('leads')
        .insert({
          first_name: enquiry.first_name,
          company: enquiry.company_name,
          website: enquiry.company_url,
          email: enquiry.buyer_email,
          notes: enquiry.problem,
          segment: 'saas_product',
          vertical: 'design_systems',
          source: 'enquiry_form',
          status: 'replied',
        })
        .select('id')
        .single()
      if (leadErr || !lead) throw leadErr ?? new Error('no lead returned')

      const { error: updateErr } = await supabase
        .from('enquiry_submissions')
        .update({ converted_lead_id: lead.id, status: 'converted' })
        .eq('id', enquiry.id)
      if (updateErr) throw updateErr

      setEnquiry((prev) => (prev ? { ...prev, converted_lead_id: lead.id, status: 'converted' } : prev))
      showToast('Converted to lead', 'success')
      onChanged()
    } catch (err) {
      console.error('EnquiryDrawer: convert failed', err)
      showToast('Could not convert to lead. Try again.', 'error')
    } finally {
      setConverting(false)
    }
  }

  async function handleSend() {
    const body = draft.trim()
    if (!body || sending || !enquiry) return

    setSending(true)
    setSendError(null)
    const optimisticId = `optimistic-${Date.now()}`
    const optimisticReply: ReplyRow = {
      id: optimisticId,
      enquiry_id: enquiry.id,
      body,
      sent_by: null,
      created_at: new Date().toISOString(),
    }
    setReplies((prev) => [...prev, optimisticReply])
    setDraft('')

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('not authenticated')

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-enquiry-reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enquiry_id: enquiry.id, body }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) throw new Error(data?.error ?? 'send failed')

      setReplies((prev) => prev.map((r) => (r.id === optimisticId ? (data.reply as ReplyRow) : r)))
      if (enquiry.status === 'new') {
        setEnquiry((prev) => (prev ? { ...prev, status: 'responded', responded_at: new Date().toISOString() } : prev))
        onChanged()
      }
    } catch (err) {
      console.error('EnquiryDrawer: send reply failed', err)
      setReplies((prev) => prev.filter((r) => r.id !== optimisticId))
      setDraft(body)
      setSendError(SEND_FAILED_MESSAGE)
    } finally {
      setSending(false)
    }
  }

  const headerExtra = enquiry ? (
    enquiry.converted_lead_id ? (
      <button
        type="button"
        style={styles.viewLeadBtn}
        onClick={() => navigate(`/portal/admin/outreach?tab=leads&leadId=${enquiry.converted_lead_id}`)}
      >
        View lead
      </button>
    ) : (
      <button type="button" style={styles.convertBtn} onClick={handleConvert} disabled={converting}>
        {converting ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : null}
        Convert to lead
      </button>
    )
  ) : null

  return (
    <SidePanel
      title={enquiry?.company_name ?? 'Enquiry'}
      subtitle={enquiry?.funding_stage}
      onClose={onClose}
      width={860}
      headerExtra={headerExtra}
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      {loading || !enquiry ? (
        <div style={styles.loading}>
          <Loader2 size={20} color={t.text.muted} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div style={{ ...styles.grid, ...(isMobile ? styles.gridMobile : null) }}>
          <div style={styles.detailCol}>
            <FieldRow label="First name" value={enquiry.first_name} />
            <FieldRow
              label="Work email"
              value={
                <a href={`mailto:${enquiry.buyer_email}`} style={styles.link}>
                  <Mail size={13} /> {enquiry.buyer_email}
                </a>
              }
            />
            <FieldRow label="Company" value={enquiry.company_name} />
            <FieldRow
              label="Company URL"
              value={
                <a
                  href={enquiry.company_url.startsWith('http') ? enquiry.company_url : `https://${enquiry.company_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.link}
                >
                  {enquiry.company_url} <ExternalLink size={12} />
                </a>
              }
            />
            <FieldRow label="Platforms" value={enquiry.platforms.join(', ')} />
            <FieldRow label="Team size" value={enquiry.team_size} />
            <FieldRow label="Funding stage" value={enquiry.funding_stage} />
            <FieldRow label="Timeline" value={enquiry.start_timeline} />
            <FieldRow label="Problem" value={enquiry.problem} />
            <FieldRow label="Submitted" value={formatDateTime(enquiry.created_at)} />
          </div>

          <div style={styles.threadCol}>
            <div ref={threadRef} style={styles.thread}>
              <div style={styles.bubbleRow}>
                <div style={styles.bubbleEnquiry}>
                  <p style={styles.bubbleBody}>{enquiry.problem}</p>
                  <p style={styles.bubbleTime}>{formatDateTime(enquiry.created_at)}</p>
                </div>
              </div>
              {replies.length === 0 ? (
                <p style={styles.noReplies}>No replies sent yet.</p>
              ) : (
                replies.map((reply) => (
                  <div key={reply.id} style={{ ...styles.bubbleRow, justifyContent: 'flex-end' }}>
                    <div style={styles.bubbleReply}>
                      <p style={{ ...styles.bubbleBody, color: t.text.inverse }}>{reply.body}</p>
                      <p style={{ ...styles.bubbleTime, color: 'rgba(255,255,255,0.7)' }}>
                        {formatDateTime(reply.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={styles.composer}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type your reply..."
                rows={3}
                disabled={sending}
                style={styles.composerTextarea}
              />
              <button type="button" style={styles.sendBtn} onClick={handleSend} disabled={sending || draft.trim() === ''}>
                {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {sending ? 'Sending...' : 'Send reply'}
              </button>
              {sendError && <p style={styles.sendError}>{sendError}</p>}
            </div>
          </div>
        </div>
      )}
    </SidePanel>
  )
}

const styles: Record<string, CSSProperties> = {
  loading: { display: 'flex', justifyContent: 'center', padding: '48px 0' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, height: '100%' },
  gridMobile: { gridTemplateColumns: '1fr', gap: 24 },
  detailCol: { display: 'flex', flexDirection: 'column', gap: 16 },
  fieldRow: { display: 'flex', flexDirection: 'column', gap: 3 },
  fieldLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: t.text.muted,
    margin: 0,
  },
  fieldValue: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
    lineHeight: 1.5,
  },
  link: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    color: tokens.primary,
    fontFamily: fonts.body,
    fontSize: 14,
    textDecoration: 'none',
  },
  threadCol: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thread: {
    flex: 1,
    overflowY: 'auto',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    background: t.background.subtle,
    minHeight: 240,
  },
  bubbleRow: { display: 'flex' },
  bubbleEnquiry: {
    maxWidth: '85%',
    background: t.background.muted,
    borderRadius: '12px 12px 12px 2px',
    padding: '10px 14px',
  },
  bubbleReply: {
    maxWidth: '85%',
    background: tokens.primary,
    borderRadius: '12px 12px 2px 12px',
    padding: '10px 14px',
  },
  bubbleBody: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 1.5,
    color: t.text.primary,
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  bubbleTime: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: t.text.muted,
    margin: '6px 0 0',
  },
  noReplies: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.muted,
    textAlign: 'center',
    padding: '8px 0',
  },
  composer: {
    borderTop: `1px solid ${t.border.subtle}`,
    padding: 12,
    background: tokens.surface,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  composerTextarea: {
    width: '100%',
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '9px 12px',
    outline: 'none',
    resize: 'vertical',
    minHeight: 64,
    maxHeight: 176,
    boxSizing: 'border-box',
    lineHeight: 1.5,
  },
  sendBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    background: tokens.primary,
    color: t.text.onPrimary,
    border: 'none',
    borderRadius: 8,
    padding: '10px 16px',
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: `opacity ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  sendError: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.danger,
    margin: 0,
  },
  convertBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'transparent',
    color: tokens.primary,
    border: `1px solid ${tokens.primary}`,
    borderRadius: 8,
    padding: '6px 12px',
    fontFamily: fonts.body,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
  viewLeadBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: tokens.tealLight,
    color: tokens.primary,
    border: 'none',
    borderRadius: 8,
    padding: '6px 12px',
    fontFamily: fonts.body,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
