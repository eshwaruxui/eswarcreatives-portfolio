// Admin project right-side panel. Opened from the client panel's Projects
// section (and reusable elsewhere). Phase 5 base view: project identity, status,
// current phase and the phase checklist. Task 5h extends this with the
// "Send timeline extension" action for active projects.
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, fonts } from '../theme'
import { StatusBadge, mono, formatDate, ui } from './ui'
import { SidePanel } from './SidePanel'
import type { CSSProperties } from 'react'

type Project = {
  id: string
  title: string
  status: string
  current_phase: string | null
  timeline: string | null
  created_at: string
  client_id: string | null
}

type Phase = {
  id: string
  phase_name: string
  phase_status: string
  sort_order: number
}

export function ProjectPanel({
  projectId,
  onClose,
}: {
  projectId: string
  onClose: () => void
}) {
  const [project, setProject] = useState<Project | null>(null)
  const [phases, setPhases] = useState<Phase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 5h: timeline extension modal state.
  const [showExt, setShowExt] = useState(false)
  const [extTimeline, setExtTimeline] = useState('')
  const [extReason, setExtReason] = useState('')
  const [sending, setSending] = useState(false)
  const [extError, setExtError] = useState<string | null>(null)
  const [sentOk, setSentOk] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [projRes, phasesRes] = await Promise.all([
          supabase
            .from('projects')
            .select('id, title, status, current_phase, timeline, created_at, client_id')
            .eq('id', projectId)
            .single(),
          supabase
            .from('project_phases')
            .select('id, phase_name, phase_status, sort_order')
            .eq('project_id', projectId)
            .order('sort_order', { ascending: true }),
        ])
        if (projRes.error) throw projRes.error
        if (phasesRes.error) throw phasesRes.error
        if (cancelled) return
        setProject(projRes.data as Project)
        setPhases((phasesRes.data ?? []) as Phase[])
      } catch {
        // H9: plain-language error, never a raw Supabase string.
        if (!cancelled) setError('Could not load this project. Refresh to try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  // 5h: admin proposes a timeline extension; the client approves or denies it.
  async function sendExtension() {
    if (!project) return
    if (!extTimeline.trim()) {
      setExtError('Enter the new timeline.')
      return
    }
    setSending(true)
    setExtError(null)
    try {
      const { data: sess } = await supabase.auth.getUser()
      const uid = sess.user?.id ?? null
      const { data: ext, error: insErr } = await supabase
        .from('timeline_extensions')
        .insert({
          project_id: project.id,
          new_timeline: extTimeline.trim(),
          reason: extReason.trim() || null,
          created_by: uid,
        })
        .select('id')
        .single()
      if (insErr) throw insErr
      // Notify the client (best-effort; a failed notification must not block).
      if (project.client_id) {
        await supabase.from('client_notifications').insert({
          client_id: project.client_id,
          type: 'timeline_extension',
          reference_id: (ext as { id: string }).id,
        })
      }
      setSending(false)
      setShowExt(false)
      setExtTimeline('')
      setExtReason('')
      // H1: confirm the action to the admin.
      setSentOk(true)
      setTimeout(() => setSentOk(false), 3000)
    } catch {
      setSending(false)
      // H9: never surface a raw Supabase string.
      setExtError('Could not send the extension. Try again.')
    }
  }

  return (
    <>
    <SidePanel
      title={project?.title || 'Project'}
      subtitle={project ? `Created ${formatDate(project.created_at)}` : undefined}
      onClose={onClose}
    >
      {loading ? (
        <p style={styles.muted}>Loading...</p>
      ) : error || !project ? (
        <p style={styles.errorText}>{error ?? 'Project not found.'}</p>
      ) : (
        <>
          <div style={styles.metaRow}>
            <StatusBadge status={project.status} />
            {project.current_phase && <span style={styles.phaseTag}>{project.current_phase}</span>}
          </div>

          {project.timeline && (
            <div style={styles.field}>
              <span style={styles.fieldLabel}>Timeline</span>
              <span style={styles.fieldValue}>{project.timeline}</span>
            </div>
          )}

          {/* 5h: timeline extension is only offered while the project is active. */}
          {project.status === 'active' && (
            <div style={styles.extWrap}>
              <button type="button" style={styles.extBtn} onClick={() => setShowExt(true)}>
                Send timeline extension
              </button>
              {sentOk && <span style={styles.extSent}>Extension sent to client.</span>}
            </div>
          )}

          <h3 style={styles.sectionTitle}>Phases</h3>
          {phases.length === 0 ? (
            <p style={styles.muted}>No phases recorded.</p>
          ) : (
            <ul style={styles.phaseList}>
              {phases.map((ph) => (
                <li key={ph.id} style={styles.phaseRow}>
                  <span style={styles.phaseName}>{ph.phase_name}</span>
                  <StatusBadge status={ph.phase_status} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </SidePanel>

    {/* 5h: extension modal. Rendered above the drawer (z-index > 201) since the
        shared ui Modal sits at z-100, below the side panel. */}
    {showExt && (
      <div style={styles.modalOverlay} onClick={() => !sending && setShowExt(false)}>
        <div style={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalHead}>
            <h3 style={styles.modalTitle}>Send timeline extension</h3>
            <button
              type="button"
              style={styles.modalClose}
              onClick={() => setShowExt(false)}
              disabled={sending}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          {extError && <div style={styles.modalError}>{extError}</div>}
          <label style={styles.field}>
            <span style={styles.fieldLabel}>New timeline</span>
            <input
              value={extTimeline}
              onChange={(e) => setExtTimeline(e.target.value)}
              style={styles.input}
              placeholder="e.g. 2 extra weeks, delivery by 15 Jul"
              autoFocus
            />
          </label>
          <label style={{ ...styles.field, marginTop: 12 }}>
            <span style={styles.fieldLabel}>Reason</span>
            <textarea
              value={extReason}
              onChange={(e) => setExtReason(e.target.value)}
              style={{ ...styles.input, minHeight: 72, resize: 'vertical' }}
              placeholder="Why the timeline needs to change"
            />
          </label>
          <div style={styles.modalActions}>
            <button
              type="button"
              style={styles.cancelBtn}
              onClick={() => setShowExt(false)}
              disabled={sending}
            >
              Cancel
            </button>
            <button type="button" style={ui.primaryBtn} onClick={() => void sendExtension()} disabled={sending}>
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

const styles: Record<string, CSSProperties> = {
  muted: { fontFamily: fonts.body, fontSize: 14, color: tokens.textMuted, margin: 0 },
  errorText: { fontFamily: fonts.body, fontSize: 14, color: tokens.ruby, margin: 0 },
  metaRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 },
  phaseTag: {
    fontFamily: mono,
    fontSize: 12,
    color: tokens.textMuted,
  },
  field: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 },
  fieldLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: tokens.textMuted,
  },
  fieldValue: { fontFamily: fonts.body, fontSize: 14, color: tokens.text },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    fontWeight: 600,
    color: tokens.text,
    margin: '8px 0 12px',
  },
  phaseList: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 },
  phaseRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '10px 12px',
    background: tokens.bg,
    borderRadius: 8,
  },
  phaseName: { fontFamily: fonts.body, fontSize: 14, color: tokens.text },
  extWrap: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '4px 0 16px' },
  extBtn: {
    background: tokens.surface,
    color: tokens.primary,
    border: `1px solid ${tokens.accent}`,
    borderRadius: 8,
    padding: '9px 14px',
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  extSent: { fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: tokens.green },
  input: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: tokens.text,
    background: tokens.inputBg,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '9px 11px',
    width: '100%',
    boxSizing: 'border-box',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10, 26, 27, 0.45)',
    zIndex: 320,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '80px 20px',
    overflowY: 'auto',
  },
  modalPanel: {
    background: tokens.surface,
    borderRadius: 12,
    border: `1px solid ${tokens.border}`,
    padding: 24,
    width: '100%',
    maxWidth: 440,
  },
  modalHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: 600,
    color: tokens.text,
    margin: 0,
  },
  modalClose: {
    background: 'transparent',
    border: 'none',
    color: tokens.textMuted,
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
  },
  modalError: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '10px 12px',
    marginBottom: 12,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 },
  cancelBtn: {
    background: tokens.surface,
    color: tokens.text,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '10px 16px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
