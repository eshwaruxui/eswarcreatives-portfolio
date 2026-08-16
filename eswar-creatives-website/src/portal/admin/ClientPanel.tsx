// Admin "Manage client" right-side panel. Opened from the clients list. Four
// sections: editable client info (inline edit per field), then read-only
// proposals, invoices and projects. Invoice rows open the invoice drawer and
// project rows open the project drawer, both nested above this panel.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Check, X, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts } from '../theme'
import { StatusBadge, mono, formatMoney } from './ui'
import { formatPortalDate } from '../utils/formatDate'
import { showToast } from './toast'
import { SidePanel } from './SidePanel'
import { InvoicePreview } from './InvoicePreview'
import type { PreviewInvoice } from './InvoicePreview'
import { ProjectPanel } from './ProjectPanel'
import { TabBar, TabFadeIn } from '../components/TabBar'
import { BrandVisualTab } from './BrandVisualTab'
import type { CSSProperties, ReactNode } from 'react'

type ClientTab = 'info' | 'proposals' | 'invoices' | 'projects' | 'brand'

const TABS: { id: ClientTab; label: string }[] = [
  { id: 'info', label: 'Info' },
  { id: 'proposals', label: 'Proposals' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'projects', label: 'Projects' },
  { id: 'brand', label: 'Brand Visual Guide' },
]

// Same country set the Add client modal offers, so editing stays consistent.
const COUNTRIES = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'SG', name: 'Singapore' },
]

type Client = {
  id: string
  company_name: string | null
  contact_name: string | null
  founder_name: string | null
  whatsapp_number: string | null
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
}

type Project = {
  id: string
  title: string
  status: string
  current_phase: string | null
}

// Column on clients (or null for the read-only email row).
type EditableColumn =
  | 'company_name'
  | 'contact_name'
  | 'founder_name'
  | 'whatsapp_number'
  | 'country'
  | 'preferred_currency'

export function ClientPanel({
  clientId,
  onClose,
  onChanged,
  onDeleted,
  canDelete = false,
}: {
  clientId: string
  onClose: () => void
  // Called after an edit so the underlying list can refresh names.
  onChanged?: () => void
  // Called after a successful delete so the list can drop the row + close.
  onDeleted?: () => void
  // Gates the Danger zone: only owner/admin may hard-delete a client.
  canDelete?: boolean
}) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<ClientTab>('info')
  const [client, setClient] = useState<Client | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [invoices, setInvoices] = useState<PreviewInvoice[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Nested drawers launched from the lists.
  const [openInvoice, setOpenInvoice] = useState<PreviewInvoice | null>(null)
  const [openProjectId, setOpenProjectId] = useState<string | null>(null)

  // Delete-client confirmation flow.
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [clientRes, proposalsRes, invoicesRes, projectsRes] = await Promise.all([
          supabase
            .from('clients')
            .select(
              'id, company_name, contact_name, founder_name, whatsapp_number, country, preferred_currency, profiles(email)'
            )
            .eq('id', clientId)
            .single(),
          supabase
            .from('proposals')
            .select('id, proposal_number, title, total_amount, currency, status')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false }),
          supabase
            .from('invoices')
            .select(
              'id, invoice_number, client_name, company_name, label, amount, currency, status, due_date, notes, created_at, client_id'
            )
            .eq('client_id', clientId)
            .order('created_at', { ascending: false }),
          supabase
            .from('projects')
            .select('id, title, status, current_phase')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false }),
        ])
        if (clientRes.error) throw clientRes.error
        if (proposalsRes.error) throw proposalsRes.error
        if (invoicesRes.error) throw invoicesRes.error
        if (projectsRes.error) throw projectsRes.error
        if (cancelled) return
        const c = clientRes.data as Client & { profiles?: { email?: string } | { email?: string }[] | null }
        const prof = c.profiles
        setEmail((Array.isArray(prof) ? prof[0]?.email : prof?.email) ?? null)
        setClient(c as Client)
        setProposals((proposalsRes.data ?? []) as Proposal[])
        setInvoices((invoicesRes.data ?? []) as PreviewInvoice[])
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
  }, [clientId])

  // Persist a single client field. Returns true on success so the inline editor
  // can show its "Saved" confirmation. Empty optional values are stored as null.
  async function saveField(column: EditableColumn, raw: string): Promise<boolean> {
    const trimmed = raw.trim()
    const value = column === 'preferred_currency' ? trimmed || 'INR' : trimmed || null
    const { error: err } = await supabase
      .from('clients')
      .update({ [column]: value })
      .eq('id', clientId)
    if (err) return false
    setClient((prev) => (prev ? { ...prev, [column]: value } : prev))
    onChanged?.()
    return true
  }

  // Hard-delete the client via the service-role edge function (atomic cascade).
  // The auth login is never removed automatically; we surface a reminder with
  // the returned email so an admin can delete it in the Supabase dashboard.
  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      const { data, error: err } = await supabase.functions.invoke('admin-delete-client', {
        body: { client_id: clientId },
      })
      if (err) throw err
      const email = (data as { authUserEmail?: string | null } | null)?.authUserEmail
      setConfirmOpen(false)
      // H1: confirm success and the one manual step that remains.
      showToast(
        email
          ? `Client deleted. Remove the login (${email}) manually in Supabase → Authentication.`
          : 'Client deleted. Remove the login manually in Supabase → Authentication.',
        'success'
      )
      onChanged?.()
      onDeleted?.()
    } catch {
      // H9: plain-language error, never a raw Supabase string.
      setDeleteError('Could not delete this client. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const title = client?.company_name || client?.contact_name || 'Client'

  return (
    <>
      {/* 680, not 560: the Brand Visual Guide tab's sidebar+list layout needs more
          room than the other tabs' single-column lists did. */}
      <SidePanel title={title} subtitle="Manage client" onClose={onClose} width={680}>
        {loading ? (
          <p style={styles.muted}>Loading...</p>
        ) : error || !client ? (
          <p style={styles.errorText}>{error ?? 'Client not found.'}</p>
        ) : (
          <>
            <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />
            <TabFadeIn key={activeTab}>
              {activeTab === 'info' && (
                <>
                  <h3 style={styles.sectionTitle}>Client info</h3>
                  <div style={styles.fields}>
                    <InlineField label="Company name" value={client.company_name} onSave={(v) => saveField('company_name', v)} />
                    <InlineField label="Contact person" value={client.contact_name} onSave={(v) => saveField('contact_name', v)} />
                    <InlineField label="Founder name" value={client.founder_name} onSave={(v) => saveField('founder_name', v)} />
                    <InlineField
                      label="WhatsApp number"
                      value={client.whatsapp_number}
                      onSave={(v) => saveField('whatsapp_number', v)}
                    />
                    {/* Read-only: email is the login identity (profiles), not a client column. */}
                    <InlineField label="Communication email" value={email} readOnly />
                    <InlineField
                      label="Country"
                      value={client.country}
                      options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
                      onSave={(v) => saveField('country', v)}
                    />
                    <InlineField
                      label="Currency"
                      value={client.preferred_currency}
                      options={[
                        { value: 'INR', label: 'INR' },
                        { value: 'USD', label: 'USD' },
                      ]}
                      onSave={(v) => saveField('preferred_currency', v)}
                    />
                  </div>

                  {canDelete && (
                    <>
                      <SectionHeading>Danger zone</SectionHeading>
                      <p style={styles.dangerNote}>
                        Permanently deletes this client and all of their projects, orders,
                        invoices and proposals. The login is not removed automatically — you'll
                        get a reminder to delete it in Supabase. This cannot be undone.
                      </p>
                      <button type="button" style={styles.deleteBtn} onClick={() => setConfirmOpen(true)}>
                        <Trash2 size={15} />
                        Delete client
                      </button>
                    </>
                  )}
                </>
              )}

              {activeTab === 'proposals' &&
                (proposals.length === 0 ? (
                  <Empty text="No proposals for this client." />
                ) : (
                  proposals.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      style={styles.itemRow}
                      onClick={() => navigate(`/portal/admin/proposals/${p.id}`)}
                    >
                      <span style={styles.itemNumber}>{p.proposal_number || '—'}</span>
                      <span style={styles.itemTitle}>{p.title}</span>
                      <span style={styles.itemAmount}>{formatMoney(Number(p.total_amount), p.currency)}</span>
                      <StatusBadge status={p.status} />
                    </button>
                  ))
                ))}

              {activeTab === 'invoices' &&
                (invoices.length === 0 ? (
                  <Empty text="No invoices for this client." />
                ) : (
                  invoices.map((inv) => (
                    <button key={inv.id} type="button" style={styles.itemRow} onClick={() => setOpenInvoice(inv)}>
                      <span style={styles.itemNumber}>{inv.invoice_number}</span>
                      <span style={styles.itemTitle}>{inv.label || '—'}</span>
                      <span style={styles.itemAmount}>{formatMoney(Number(inv.amount), inv.currency)}</span>
                      <StatusBadge status={inv.status} />
                      <span style={styles.itemMeta}>Due {formatPortalDate(inv.due_date)}</span>
                    </button>
                  ))
                ))}

              {activeTab === 'projects' &&
                (projects.length === 0 ? (
                  <Empty text="No projects for this client." />
                ) : (
                  projects.map((pr) => (
                    <button key={pr.id} type="button" style={styles.itemRow} onClick={() => setOpenProjectId(pr.id)}>
                      <span style={styles.itemTitle}>{pr.title}</span>
                      {pr.current_phase && <span style={styles.phaseBadge}>{pr.current_phase}</span>}
                      <StatusBadge status={pr.status} />
                    </button>
                  ))
                ))}

              {activeTab === 'brand' && <BrandVisualTab clientId={clientId} clientLabel={title} />}
            </TabFadeIn>
          </>
        )}
      </SidePanel>

      {/* Delete confirmation — modal above the panel and any nested drawers. */}
      {confirmOpen && (
        <div
          style={styles.confirmBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-client-title"
        >
          <div style={styles.confirmCard}>
            <div style={styles.confirmIcon}>
              <AlertTriangle size={22} />
            </div>
            <h2 id="delete-client-title" style={styles.confirmTitle}>
              Delete {title}?
            </h2>
            <p style={styles.confirmBody}>
              This permanently deletes the client and <strong>all</strong> of their
              projects, orders, invoices and proposals. This action cannot be undone.
            </p>
            <p style={styles.confirmBody}>
              The client's login is <strong>not</strong> removed automatically — you'll
              need to delete it manually in Supabase → Authentication.
            </p>
            {deleteError && <div style={styles.confirmError}>{deleteError}</div>}
            <div style={styles.confirmActions}>
              <button
                type="button"
                style={styles.confirmCancel}
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{ ...styles.confirmDelete, opacity: deleting ? 0.6 : 1 }}
                onClick={() => void handleDelete()}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete client'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nested drawers stack above the client panel (baseZIndex bumped). */}
      {openInvoice && (
        <InvoicePreview invoice={openInvoice} onClose={() => setOpenInvoice(null)} />
      )}
      {openProjectId && (
        <ProjectPanel projectId={openProjectId} onClose={() => setOpenProjectId(null)} />
      )}
    </>
  )
}

// ── Inline-editable field ────────────────────────────────────────────────
function InlineField({
  label,
  value,
  options,
  readOnly,
  onSave,
}: {
  label: string
  value: string | null
  options?: { value: string; label: string }[]
  readOnly?: boolean
  onSave?: (value: string) => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(false)

  function startEdit() {
    if (readOnly || !onSave) return
    setDraft(value ?? '')
    setErr(false)
    setEditing(true)
  }

  async function commit() {
    if (!onSave) return
    setSaving(true)
    setErr(false)
    const ok = await onSave(draft)
    setSaving(false)
    if (!ok) {
      // H9: never surface a raw error string; a generic inline note suffices.
      setErr(true)
      return
    }
    setEditing(false)
    // H1: confirm the outcome of the action with a toast.
    showToast(`${label} saved`, 'success', 2000)
  }

  // Display value, falling back to the matching option label for selects.
  const display =
    value == null || value === ''
      ? '—'
      : options?.find((o) => o.value === value)?.label ?? value

  if (!editing) {
    return (
      <div style={styles.field}>
        <span style={styles.fieldLabel}>{label}</span>
        <div style={styles.fieldValueRow}>
          <span style={{ ...styles.fieldValue, color: display === '—' ? t.text.muted : t.text.primary }}>
            {display}
          </span>
          {!readOnly && onSave && (
            <button type="button" style={styles.editBtn} onClick={startEdit} aria-label={`Edit ${label}`}>
              <Pencil size={13} />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      <div style={styles.editRow}>
        {options ? (
          <select value={draft} onChange={(e) => setDraft(e.target.value)} style={styles.input} disabled={saving}>
            {/* Keep an unmatched stored value selectable rather than silently dropping it. */}
            {!options.some((o) => o.value === draft) && draft !== '' && <option value={draft}>{draft}</option>}
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={styles.input}
            disabled={saving}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') void commit()
              if (e.key === 'Escape') setEditing(false)
            }}
          />
        )}
        <button type="button" style={styles.saveBtn} onClick={() => void commit()} disabled={saving} aria-label="Save">
          <Check size={15} />
        </button>
        <button
          type="button"
          style={styles.cancelBtn}
          onClick={() => setEditing(false)}
          disabled={saving}
          aria-label="Cancel"
        >
          <X size={15} />
        </button>
      </div>
      {err && <span style={styles.errInline}>Could not save. Try again.</span>}
    </div>
  )
}

function SectionHeading({ children }: { children: ReactNode }) {
  return <h3 style={{ ...styles.sectionTitle, marginTop: 28 }}>{children}</h3>
}

function Empty({ text }: { text: string }) {
  return <p style={{ ...styles.muted, margin: 0 }}>{text}</p>
}

const styles: Record<string, CSSProperties> = {
  muted: { fontFamily: fonts.body, fontSize: 14, color: t.text.secondary },
  errorText: { fontFamily: fonts.body, fontSize: 14, color: tokens.ruby, margin: 0 },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    fontWeight: 600,
    color: t.text.primary,
    margin: '0 0 12px',
  },
  fields: { display: 'flex', flexDirection: 'column', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  fieldLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: t.text.tertiary,
  },
  fieldValueRow: { display: 'flex', alignItems: 'center', gap: 8, minHeight: 24 },
  fieldValue: { fontFamily: fonts.body, fontSize: 14 },
  editBtn: {
    background: 'transparent',
    border: 'none',
    color: t.text.muted,
    cursor: 'pointer',
    padding: 2,
    display: 'inline-flex',
    opacity: 0.7,
  },
  editRow: { display: 'flex', alignItems: 'center', gap: 6 },
  input: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '7px 10px',
    flex: 1,
    minWidth: 0,
    boxSizing: 'border-box',
  },
  saveBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    borderRadius: 8,
    background: tokens.primary,
    color: tokens.surface,
    border: 'none',
    cursor: 'pointer',
    flexShrink: 0,
  },
  cancelBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    borderRadius: 8,
    background: tokens.surface,
    color: t.text.secondary,
    border: `1px solid ${tokens.border}`,
    cursor: 'pointer',
    flexShrink: 0,
  },
  errInline: { fontFamily: fonts.body, fontSize: 12, color: tokens.ruby, marginTop: 2 },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '12px 4px',
    borderTop: `1px solid ${tokens.border}`,
    background: 'transparent',
    border: 'none',
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: tokens.border,
    cursor: 'pointer',
    textAlign: 'left',
  },
  itemNumber: { fontFamily: mono, fontSize: 12, color: t.text.tertiary, whiteSpace: 'nowrap' },
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
  itemAmount: { fontFamily: mono, fontSize: 13, color: t.text.primary, whiteSpace: 'nowrap' },
  itemMeta: { fontFamily: fonts.body, fontSize: 12, color: t.text.tertiary, whiteSpace: 'nowrap' },
  phaseBadge: { fontFamily: mono, fontSize: 12, color: t.text.tertiary, whiteSpace: 'nowrap' },
  dangerNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 1.5,
    color: t.text.secondary,
    margin: '0 0 12px',
  },
  deleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    background: tokens.rubyLight,
    color: tokens.ruby,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '9px 16px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  confirmBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 400,
    background: 'rgba(10, 26, 27, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 440,
    background: tokens.surface,
    borderRadius: 14,
    padding: 28,
    boxShadow: '0 24px 60px rgba(2, 76, 79, 0.24)',
  },
  confirmIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 12,
    background: tokens.rubyLight,
    color: tokens.ruby,
    marginBottom: 14,
  },
  confirmTitle: {
    fontFamily: fonts.heading,
    fontSize: 19,
    fontWeight: 600,
    color: t.text.primary,
    margin: '0 0 10px',
  },
  confirmBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 1.6,
    color: t.text.secondary,
    margin: '0 0 12px',
  },
  confirmError: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.ruby,
    background: tokens.rubyLight,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '8px 12px',
    margin: '0 0 12px',
  },
  confirmActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  confirmCancel: {
    background: tokens.surface,
    color: t.text.primary,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '9px 18px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  confirmDelete: {
    background: tokens.ruby,
    color: t.text.inverse, // H4: semantic token - no raw hex (text on danger fill)
    border: 'none',
    borderRadius: 8,
    padding: '9px 18px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
