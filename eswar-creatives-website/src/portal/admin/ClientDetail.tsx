import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts } from '../theme'
import {
  PageHeader,
  Card,
  StatusBadge,
  ui,
  mono,
  formatMoney,
} from './ui'
import { formatPortalDate } from '../utils/formatDate'
import type { CSSProperties, ReactNode } from 'react'

type Client = {
  id: string
  company_name: string | null
  contact_name: string | null
  country: string | null
  preferred_currency: string
}

type Proposal = {
  id: string
  proposal_number: string | null
  title: string
  total_amount: number
  currency: string
  status: string
  valid_until: string | null
}

type Invoice = {
  id: string
  invoice_number: string
  label: string | null
  amount: number
  currency: string
  status: string
  due_date: string | null
}

type Project = {
  id: string
  title: string
  status: string
  current_phase: string | null
}

export function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const [client, setClient] = useState<Client | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      try {
        const [clientRes, proposalsRes, invoicesRes, projectsRes] = await Promise.all([
          supabase
            .from('clients')
            .select('id, company_name, contact_name, country, preferred_currency')
            .eq('id', id)
            .single(),
          supabase
            .from('proposals')
            .select('id, proposal_number, title, total_amount, currency, status, valid_until')
            .eq('client_id', id)
            .order('created_at', { ascending: false }),
          supabase
            .from('invoices')
            .select('id, invoice_number, label, amount, currency, status, due_date')
            .eq('client_id', id)
            .order('created_at', { ascending: false }),
          supabase
            .from('projects')
            .select('id, title, status, current_phase')
            .eq('client_id', id)
            .order('created_at', { ascending: false }),
        ])
        if (clientRes.error) throw clientRes.error
        if (proposalsRes.error) throw proposalsRes.error
        if (invoicesRes.error) throw invoicesRes.error
        if (projectsRes.error) throw projectsRes.error
        if (cancelled) return
        setClient(clientRes.data as Client)
        setProposals((proposalsRes.data ?? []) as Proposal[])
        setInvoices((invoicesRes.data ?? []) as Invoice[])
        setProjects((projectsRes.data ?? []) as Project[])
      } catch {
        // H9: plain-language error, never a raw Supabase string.
        if (!cancelled) setError('Could not load this client. Refresh to try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <>
        <PageHeader title="Client" />
        <Card>
          <p style={ui.muted}>Loading...</p>
        </Card>
      </>
    )
  }

  if (error || !client) {
    return (
      <>
        <PageHeader title="Client" />
        <Card>
          <p style={styles.errorText}>{error ?? 'Client not found.'}</p>
          <Link to="/portal/admin/clients" style={ui.muted}>
            Back to clients
          </Link>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={client.company_name || '(unnamed client)'}
        subtitle={
          [client.contact_name, client.country, client.preferred_currency]
            .filter(Boolean)
            .join('  ·  ') || undefined
        }
      />

      <Section title="Proposals">
        {proposals.length === 0 ? (
          <Empty text="No proposals for this client." />
        ) : (
          proposals.map((p) => (
            <Link key={p.id} to={`/portal/admin/proposals/${p.id}`} style={styles.itemRow}>
              <span style={styles.itemNumber}>{p.proposal_number || '—'}</span>
              <span style={styles.itemTitle}>{p.title}</span>
              <span style={styles.itemAmount}>{formatMoney(Number(p.total_amount), p.currency)}</span>
              <StatusBadge status={p.status} />
              <span style={styles.itemMeta}>Valid {formatPortalDate(p.valid_until)}</span>
            </Link>
          ))
        )}
      </Section>

      <Section title="Invoices">
        {invoices.length === 0 ? (
          <Empty text="No invoices for this client." />
        ) : (
          invoices.map((inv) => (
            <Link key={inv.id} to="/portal/admin/invoices" style={styles.itemRow}>
              <span style={styles.itemNumber}>{inv.invoice_number}</span>
              <span style={styles.itemTitle}>{inv.label || '—'}</span>
              <span style={styles.itemAmount}>{formatMoney(Number(inv.amount), inv.currency)}</span>
              <StatusBadge status={inv.status} />
              <span style={styles.itemMeta}>Due {formatPortalDate(inv.due_date)}</span>
            </Link>
          ))
        )}
      </Section>

      <Section title="Projects">
        {projects.length === 0 ? (
          <Empty text="No projects for this client." />
        ) : (
          projects.map((pr) => (
            <div key={pr.id} style={styles.itemRow}>
              <span style={styles.itemTitle}>{pr.title}</span>
              {pr.current_phase && <span style={styles.itemMeta}>{pr.current_phase}</span>}
              <StatusBadge status={pr.status} />
            </div>
          ))
        )}
      </Section>
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card style={{ marginBottom: 16 }}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      <div>{children}</div>
    </Card>
  )
}

function Empty({ text }: { text: string }) {
  return <p style={{ ...ui.muted, margin: 0 }}>{text}</p>
}

const styles: Record<string, CSSProperties> = {
  errorText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: tokens.ruby,
    marginTop: 0,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: 600,
    color: t.text.primary,
    margin: '0 0 12px',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 4px',
    borderTop: `1px solid ${tokens.border}`,
    textDecoration: 'none',
    color: 'inherit',
  },
  itemNumber: {
    fontFamily: mono,
    fontSize: 12,
    color: t.text.tertiary,
    whiteSpace: 'nowrap',
  },
  itemTitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemAmount: {
    fontFamily: mono,
    fontSize: 13,
    color: t.text.primary,
    whiteSpace: 'nowrap',
  },
  itemMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.tertiary,
    whiteSpace: 'nowrap',
  },
}
