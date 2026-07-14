import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../theme'
import { PageHeader, Card, StatusBadge, ui } from './ui'
import { usePortal } from '../PortalContext'
import { ClientFilterBanner } from './ClientFilterBanner'
import type { CSSProperties } from 'react'

type Project = {
  id: string
  title: string
  status: string
  current_phase: string | null
  phase_number: number | null
  client_id: string | null
  clients: { company_name: string | null; contact_name: string | null } | null
}

function clientLabel(p: Project) {
  return p.clients?.company_name || p.clients?.contact_name || '—'
}

// Canonical phase pointer (1..4) and the text label stored on current_phase.
const PHASE_OPTIONS = [
  { n: 1, name: 'Discovery' },
  { n: 2, name: 'Design' },
  { n: 3, name: 'Review' },
  { n: 4, name: 'Delivery' },
] as const

// The project_status enum has no 'paused'/'completed' members; map the friendly
// labels onto valid enum values so the UPDATE never violates the check.
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'Paused' },
  { value: 'delivered', label: 'Completed' },
] as const

export function ProjectsList() {
  const { selectedClientId } = usePortal()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openProject, setOpenProject] = useState<Project | null>(null)

  // Newly saved project id, briefly highlighted gold then cleared (same pattern
  // as the proposals list).
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current)
    }
  }, [])

  async function load() {
    setLoading(true)
    try {
      let query = supabase
        .from('projects')
        .select(
          'id, title, status, current_phase, phase_number, client_id, clients(company_name, contact_name)'
        )
        .order('created_at', { ascending: false })
      if (selectedClientId) query = query.eq('client_id', selectedClientId)
      const { data, error: err } = await query
      if (err) throw err
      setProjects((data ?? []) as unknown as Project[])
    } catch {
      setError('Could not load projects. Refresh to try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId])

  function handleSaved(id: string) {
    setOpenProject(null)
    void load()
    setHighlightId(id)
    if (highlightTimer.current) clearTimeout(highlightTimer.current)
    highlightTimer.current = setTimeout(() => setHighlightId(null), 2500)
  }

  return (
    <>
      <PageHeader title="Projects" />
      <ClientFilterBanner />
      {error && <div style={styles.error}>{error}</div>}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ ...ui.muted, padding: 20 }}>Loading...</p>
        ) : projects.length === 0 ? (
          <p style={{ ...ui.muted, padding: 20 }}>No projects yet.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Project</th>
                <th style={styles.th}>Client</th>
                <th style={styles.th}>Stage</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setOpenProject(p)}
                  style={{
                    ...styles.row,
                    ...(openProject?.id === p.id ? styles.rowActive : null),
                    ...(highlightId === p.id ? styles.rowHighlight : null),
                  }}
                >
                  <td style={{ ...styles.td, fontWeight: 600, color: t.text.primary }}>{p.title}</td>
                  <td style={styles.td}>{clientLabel(p)}</td>
                  <td style={styles.td}>{p.current_phase || '—'}</td>
                  <td style={styles.td}>
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {openProject && (
        <ProjectPanel
          project={openProject}
          onClose={() => setOpenProject(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}

function ProjectPanel({
  project,
  onClose,
  onSaved,
}: {
  project: Project
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const [shown, setShown] = useState(false)
  const initialPhase =
    project.phase_number && project.phase_number >= 1 && project.phase_number <= 4
      ? project.phase_number
      : (PHASE_OPTIONS.find((p) => p.name === project.current_phase)?.n ?? 1)
  const [phaseNumber, setPhaseNumber] = useState<number>(initialPhase)
  const [status, setStatus] = useState<string>(project.status)
  const [saving, setSaving] = useState(false)
  const [panelError, setPanelError] = useState<string | null>(null)

  // Trigger the slide-in once mounted (matches the InvoicePreview drawer).
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(t)
  }, [])

  // Show the live status value too if it is not one of the canonical three.
  const statusOptions = STATUS_OPTIONS.some((o) => o.value === project.status)
    ? STATUS_OPTIONS
    : [{ value: project.status, label: project.status }, ...STATUS_OPTIONS]

  async function handleSave() {
    setSaving(true)
    setPanelError(null)
    try {
      const phase = PHASE_OPTIONS.find((p) => p.n === phaseNumber)
      const { error: err } = await supabase
        .from('projects')
        .update({
          current_phase: phase?.name ?? null,
          phase_number: phaseNumber,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id)
      if (err) throw err
      onSaved(project.id)
    } catch {
      // H9: plain-language error, never a raw Supabase string.
      setPanelError('Could not save this project. Check the details and try again.')
      setSaving(false)
    }
  }

  return (
    <>
      <div style={styles.backdrop} onClick={onClose} />
      <aside
        style={{ ...styles.panel, transform: shown ? 'translateX(0)' : 'translateX(100%)' }}
        role="dialog"
        aria-label={`Project ${project.title}`}
      >
        <button type="button" style={styles.close} onClick={onClose} aria-label="Close panel">
          <X size={18} />
        </button>

        <div style={styles.panelBody}>
          <span style={styles.panelEyebrow}>Project</span>
          <h2 style={styles.panelTitle}>{project.title}</h2>
          <p style={styles.panelClient}>{clientLabel(project)}</p>

          {panelError && <div style={styles.error}>{panelError}</div>}

          <label style={styles.field}>
            <span style={styles.fieldLabel}>Current stage</span>
            <select
              value={phaseNumber}
              onChange={(e) => setPhaseNumber(Number(e.target.value))}
              style={styles.input}
            >
              {PHASE_OPTIONS.map((p) => (
                <option key={p.n} value={p.n}>
                  {p.n} {p.name}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.field}>
            <span style={styles.fieldLabel}>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.input}>
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <div style={styles.panelActions}>
            <button type="button" style={styles.secondaryBtn} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="button" style={ui.primaryBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </aside>
    </>
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
  table: { width: '100%', borderCollapse: 'collapse', fontFamily: fonts.body },
  th: {
    textAlign: 'left',
    padding: '12px 20px',
    fontSize: 12,
    fontWeight: 600,
    color: t.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    borderBottom: `1px solid ${tokens.border}`,
    background: tokens.bg,
  },
  row: {
    cursor: 'pointer',
    // Lets the gold highlight fade back out smoothly once it is cleared.
    transition: 'background-color 0.6s ease',
  },
  rowActive: { background: tokens.tealLight },
  rowHighlight: { background: tokens.goldLight },
  td: {
    padding: '14px 20px',
    fontSize: 14,
    color: t.text.secondary,
    borderBottom: `1px solid ${tokens.border}`,
  },

  // ── Right-side slide-in panel (matches InvoicePreview: backdrop z200, panel z201) ──
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10, 26, 27, 0.4)',
    zIndex: 200,
  },
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    height: '100vh',
    width: 480,
    maxWidth: '92vw',
    background: tokens.surface,
    borderLeft: `1px solid ${tokens.border}`,
    boxShadow: '0 12px 48px rgba(2, 76, 79, 0.18)',
    zIndex: 201,
    overflowY: 'auto',
    transition: `transform ${motionTokens.durationBase} ${motionTokens.easeEnter}`,
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
  panelBody: { padding: 32, display: 'flex', flexDirection: 'column', gap: 14 },
  panelEyebrow: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: t.text.tertiary,
  },
  panelTitle: { fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: t.text.primary, margin: 0 },
  panelClient: { fontFamily: fonts.body, fontSize: 14, color: t.text.tertiary, margin: '0 0 8px' },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: { fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: t.text.tertiary },
  input: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '9px 11px',
    width: '100%',
    boxSizing: 'border-box',
  },
  panelActions: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  secondaryBtn: {
    background: tokens.surface,
    color: t.text.primary,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '10px 16px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
