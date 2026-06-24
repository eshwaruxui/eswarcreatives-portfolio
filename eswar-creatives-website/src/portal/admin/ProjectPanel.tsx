// Admin project right-side panel. Opened from the client panel's Projects
// section (and reusable elsewhere). Phase 5 base view: project identity, status,
// current phase and the phase checklist. Task 5h extends this with the
// "Send timeline extension" action for active projects.
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { tokens, fonts } from '../theme'
import { StatusBadge, mono, formatDate } from './ui'
import { SidePanel } from './SidePanel'
import type { CSSProperties } from 'react'

type Project = {
  id: string
  title: string
  status: string
  current_phase: string | null
  timeline: string | null
  created_at: string
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

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [projRes, phasesRes] = await Promise.all([
          supabase
            .from('projects')
            .select('id, title, status, current_phase, timeline, created_at')
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

  return (
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
}
