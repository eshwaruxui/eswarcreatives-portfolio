import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { FileText, Receipt } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts } from '../theme'
import {
  PageHeader,
  Card,
  StatusBadge,
  ui,
  mono,
  formatMoney,
  relativeTime,
} from './ui'
import type { CSSProperties } from 'react'

type ProposalRow = {
  id: string
  proposal_number: string | null
  title: string
  client_name: string | null
  company_name: string | null
  total_amount: number
  currency: string
  status: string
  created_at: string
}

type InvoiceRow = {
  id: string
  invoice_number: string
  client_name: string | null
  company_name: string | null
  label: string | null
  amount: number
  currency: string
  status: string
  created_at: string
}

// One row in the combined recent-activity feed.
type Activity = {
  kind: 'proposal' | 'invoice'
  id: string
  who: string
  what: string
  amount: number
  currency: string
  status: string
  created_at: string
}

const UNPAID = new Set(['pending', 'sent', 'overdue', 'draft'])
const ACTIVE_PROPOSAL = new Set(['sent', 'viewed'])

function displayName(r: { client_name: string | null; company_name: string | null }) {
  return r.client_name || r.company_name || 'Unknown client'
}

export function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [outstanding, setOutstanding] = useState<Record<string, number>>({})
  const [activeProposals, setActiveProposals] = useState(0)
  const [activeCampaigns, setActiveCampaigns] = useState(0)
  const [totalClients, setTotalClients] = useState(0)
  const [activity, setActivity] = useState<Activity[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [proposalsRes, invoicesRes, campaignsRes, clientsRes] = await Promise.all([
          supabase
            .from('proposals')
            .select(
              'id, proposal_number, title, client_name, company_name, total_amount, currency, status, created_at'
            )
            .order('created_at', { ascending: false }),
          supabase
            .from('invoices')
            .select(
              'id, invoice_number, client_name, company_name, label, amount, currency, status, created_at'
            )
            .order('created_at', { ascending: false }),
          supabase
            .from('public_campaigns')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active'),
          supabase.from('clients').select('id', { count: 'exact', head: true }),
        ])
        if (proposalsRes.error) throw proposalsRes.error
        if (invoicesRes.error) throw invoicesRes.error
        if (campaignsRes.error) throw campaignsRes.error
        if (clientsRes.error) throw clientsRes.error
        if (cancelled) return

        const proposals = (proposalsRes.data ?? []) as ProposalRow[]
        const invoices = (invoicesRes.data ?? []) as InvoiceRow[]

        // Outstanding invoice totals, grouped by currency (never summed across).
        const owed: Record<string, number> = {}
        for (const inv of invoices) {
          if (UNPAID.has(inv.status)) {
            owed[inv.currency] = (owed[inv.currency] ?? 0) + Number(inv.amount)
          }
        }
        setOutstanding(owed)
        setActiveProposals(
          proposals.filter((p) => ACTIVE_PROPOSAL.has(p.status)).length
        )
        setActiveCampaigns(campaignsRes.count ?? 0)
        setTotalClients(clientsRes.count ?? 0)

        // Combined recent activity, newest first, top 5.
        const feed: Activity[] = [
          ...proposals.map<Activity>((p) => ({
            kind: 'proposal',
            id: p.id,
            who: displayName(p),
            what: p.proposal_number ? `${p.proposal_number} · ${p.title}` : p.title,
            amount: Number(p.total_amount),
            currency: p.currency,
            status: p.status,
            created_at: p.created_at,
          })),
          ...invoices.map<Activity>((inv) => ({
            kind: 'invoice',
            id: inv.id,
            who: displayName(inv),
            what: inv.label
              ? `${inv.invoice_number} · ${inv.label}`
              : inv.invoice_number,
            amount: Number(inv.amount),
            currency: inv.currency,
            status: inv.status,
            created_at: inv.created_at,
          })),
        ]
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(0, 5)
        setActivity(feed)
      } catch {
        // H9: Help users recover from errors — plain-language message, never a raw Supabase string.
        if (!cancelled) setError('Could not load the dashboard. Refresh to try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const outstandingEntries = Object.entries(outstanding)
  const outstandingValue =
    outstandingEntries.length === 0
      ? formatMoney(0, 'INR')
      : outstandingEntries.map(([cur, amt]) => formatMoney(amt, cur)).join('  ·  ')

  return (
    <>
      <PageHeader title="Dashboard" />

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.statRow}>
        <Stat label="Outstanding invoices" value={outstandingValue} mono />
        <Stat label="Active proposals" value={loading ? '—' : String(activeProposals)} />
        <Stat label="Active campaigns" value={loading ? '—' : String(activeCampaigns)} />
        <Stat label="Total clients" value={loading ? '—' : String(totalClients)} />
      </div>

      <Card style={{ marginTop: 20 }}>
        <h2 style={styles.sectionTitle}>Recent activity</h2>
        {loading ? (
          <p style={ui.muted}>Loading...</p>
        ) : activity.length === 0 ? (
          <p style={ui.muted}>No proposals or invoices yet.</p>
        ) : (
          <div style={styles.feed}>
            {activity.map((a) => (
              <Link
                key={`${a.kind}-${a.id}`}
                to={
                  a.kind === 'proposal'
                    ? `/portal/admin/proposals/${a.id}`
                    : '/portal/admin/invoices'
                }
                style={styles.feedRow}
              >
                <span style={styles.feedIcon}>
                  {a.kind === 'proposal' ? <FileText size={16} /> : <Receipt size={16} />}
                </span>
                <span style={styles.feedWho}>{a.who}</span>
                <span style={styles.feedWhat}>{a.what}</span>
                {a.amount > 0 && (
                  <span style={styles.feedAmount}>{formatMoney(a.amount, a.currency)}</span>
                )}
                <StatusBadge status={a.status} />
                <span style={styles.feedTime}>{relativeTime(a.created_at)}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}

function Stat({ label, value, mono: isMono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={styles.statCard}>
      <span style={styles.statLabel}>{label}</span>
      <span style={{ ...styles.statValue, fontFamily: isMono ? mono : fonts.heading }}>
        {value}
      </span>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  error: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '10px 14px',
    marginBottom: 16,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  statRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
  },
  statCard: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minWidth: 0,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.tertiary,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 600,
    color: t.text.primary,
    wordBreak: 'break-word',
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: 600,
    color: t.text.primary,
    margin: '0 0 16px',
  },
  feed: {
    display: 'flex',
    flexDirection: 'column',
  },
  feedRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 4px',
    borderTop: `1px solid ${tokens.border}`,
    textDecoration: 'none',
    color: 'inherit',
  },
  feedIcon: {
    color: tokens.accent,
    display: 'flex',
  },
  feedWho: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    color: t.text.primary,
    whiteSpace: 'nowrap',
  },
  feedWhat: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.tertiary,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  feedAmount: {
    fontFamily: mono,
    fontSize: 13,
    color: t.text.primary,
    whiteSpace: 'nowrap',
  },
  feedTime: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.muted,
    whiteSpace: 'nowrap',
    minWidth: 60,
    textAlign: 'right',
  },
}
