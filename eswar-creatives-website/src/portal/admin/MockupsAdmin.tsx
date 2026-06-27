// Mockups admin (Phase 3). Lists mockup sets (scoped by the global client
// selector). Creating a set uses a modal; viewing/editing an existing set opens
// a right-side slide-in panel that mirrors the InvoicePreview drawer, holding
// the editable details, the image uploader (with per-file progress) and the
// client feedback.
//
// Storage layout: every image lives at `mockups/{set_id}/{filename}` so the
// bucket RLS policy can grant a client read access by matching the first path
// segment to one of their published sets.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, ArrowUp, ArrowDown, Trash2, Eye, UploadCloud, X, Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts } from '../theme'
import { PageHeader, Card, Modal, ui, formatDate } from './ui'
import { usePortal, clientLabel } from '../PortalContext'
import { ClientFilterBanner } from './ClientFilterBanner'
import { ClientLightbox } from '../mockups/ClientLightbox'
import { signMockupItems, type LightboxMockup, type LightboxMeta } from '../mockups/signItems'
import type { CSSProperties } from 'react'

type SetStatus = 'draft' | 'published' | 'archived'

type MockupSetRow = {
  id: string
  concept_name: string
  phase: string | null
  phase_name: string | null
  task_item: string | null
  status: SetStatus
  created_at: string
  project_id: string | null
  client_id: string | null
  projects: { title: string | null } | null
  clients: { company_name: string | null; contact_name: string | null } | null
  mockup_items: { count: number }[]
}

type MockupItem = {
  id: string
  label: string
  storage_path: string
  sort_order: number
}

type ProjectOption = { id: string; title: string; client_id: string | null }
type ClientOption = { id: string; company_name: string | null; contact_name: string | null }

function itemCount(row: MockupSetRow): number {
  return row.mockup_items?.[0]?.count ?? 0
}

function clientName(row: { clients: MockupSetRow['clients'] }): string {
  return row.clients?.company_name || row.clients?.contact_name || 'Unassigned'
}

// Shared drawer breakpoint hook (drawer on desktop, bottom sheet on mobile),
// matching the InvoicePreview behaviour.
function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const on = () => setNarrow(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return narrow
}

// ── List page ────────────────────────────────────────────────────────────
export function MockupsAdmin() {
  const { selectedClientId, clients } = usePortal()
  const [sets, setSets] = useState<MockupSetRow[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openSetId, setOpenSetId] = useState<string | null>(null) // panel (view/edit)
  const [showNew, setShowNew] = useState(false) // modal (create)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let q = supabase
        .from('mockup_sets')
        .select(
          'id, concept_name, phase, phase_name, task_item, status, created_at, project_id, client_id, projects(title), clients(company_name, contact_name), mockup_items(count)'
        )
        .order('created_at', { ascending: false })
      if (selectedClientId) q = q.eq('client_id', selectedClientId)
      const [setsRes, projRes] = await Promise.all([
        q,
        supabase.from('projects').select('id, title, client_id').order('created_at', { ascending: false }),
      ])
      if (setsRes.error) throw setsRes.error
      if (projRes.error) throw projRes.error
      setSets((setsRes.data ?? []) as unknown as MockupSetRow[])
      setProjects((projRes.data ?? []) as ProjectOption[])
    } catch {
      // H9: plain-language error, never a raw Supabase string.
      setError('Could not load mockups. Refresh to try again.')
    } finally {
      setLoading(false)
    }
  }, [selectedClientId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <PageHeader
        title="Mockups"
        action={
          <button type="button" style={ui.primaryBtn} onClick={() => setShowNew(true)}>
            <Plus size={16} /> New Mockup Set
          </button>
        }
      />
      <ClientFilterBanner />
      {error && <div style={styles.error}>{error}</div>}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ ...ui.muted, padding: 20 }}>Loading...</p>
        ) : sets.length === 0 ? (
          // H6: Recognition over recall — empty state explains the screen and the next action.
          <div style={styles.emptyState}>
            <h2 style={styles.emptyHeading}>No mockup sets yet</h2>
            <p style={styles.emptyBody}>
              A mockup set groups the concept images you share with a client for review. Click
              "+ New Mockup Set" to create your first one.
            </p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Concept</th>
                <th style={styles.th}>Project</th>
                <th style={styles.th}>Client</th>
                <th style={styles.th}>Phase</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Images</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Created</th>
              </tr>
            </thead>
            <tbody>
              {sets.map((s) => (
                <tr
                  key={s.id}
                  style={{ ...styles.row, ...(openSetId === s.id ? styles.rowActive : null) }}
                  onClick={() => setOpenSetId(s.id)}
                >
                  <td style={{ ...styles.td, fontWeight: 600, color: t.text.primary }}>{s.concept_name}</td>
                  <td style={styles.td}>{s.projects?.title || '—'}</td>
                  <td style={styles.td}>{clientName(s)}</td>
                  <td style={styles.td}>{s.phase || '—'}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{itemCount(s)}</td>
                  <td style={styles.td}>
                    <StatusPill status={s.status} />
                  </td>
                  {/* H2: human-readable date, never a raw timestamp. */}
                  <td style={styles.td}>{formatDate(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* CHANGE 1: existing sets open in a right-side panel, not a modal. */}
      {openSetId && (
        <MockupSetPanel
          setId={openSetId}
          projects={projects}
          clients={clients}
          lockedClientId={selectedClientId}
          onClose={() => setOpenSetId(null)}
          onChanged={() => void load()}
        />
      )}

      {/* New Mockup Set stays a modal (creation flow). */}
      {showNew && (
        <NewMockupModal
          projects={projects}
          clients={clients}
          lockedClientId={selectedClientId}
          onClose={() => setShowNew(false)}
          onCreated={(id) => {
            setShowNew(false)
            void load()
            setOpenSetId(id) // jump straight into the panel to add images
          }}
        />
      )}
    </>
  )
}

// H4: Consistency — one status-pill colour map reused everywhere
// (draft = grey, published = teal, archived = muted).
function StatusPill({ status }: { status: SetStatus }) {
  const tone: Record<SetStatus, { bg: string; fg: string }> = {
    draft: { bg: '#F0EEEA', fg: t.text.tertiary },
    published: { bg: tokens.tealLight, fg: tokens.primary },
    archived: { bg: '#F0EEEA', fg: t.text.muted },
  }
  const pill = tone[status]
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 999,
        background: pill.bg,
        color: pill.fg,
        fontFamily: fonts.body,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'capitalize',
        letterSpacing: 0.2,
      }}
    >
      {status}
    </span>
  )
}

// ── Shared details fields (cascading dropdowns + context lock) ──────────────
// CHANGE 4: picking a client filters the project list to that client; picking a
// project back-fills the client. When the top-bar client selector is active the
// client is locked to it.
function MockupDetailsFields({
  conceptName, setConceptName,
  projectId, setProjectId,
  clientId, setClientId,
  phase, setPhase,
  phaseName, setPhaseName,
  taskItem, setTaskItem,
  projects, clients,
  lockedClientId,
}: {
  conceptName: string; setConceptName: (v: string) => void
  projectId: string; setProjectId: (v: string) => void
  clientId: string; setClientId: (v: string) => void
  phase: string; setPhase: (v: string) => void
  phaseName: string; setPhaseName: (v: string) => void
  taskItem: string; setTaskItem: (v: string) => void
  projects: ProjectOption[]; clients: ClientOption[]
  lockedClientId: string | null
}) {
  const effectiveClientId = lockedClientId ?? clientId
  const lockedClient = lockedClientId ? clients.find((c) => c.id === lockedClientId) : null

  // Cascade: only show projects for the active client (all projects if none).
  const projectOptions = effectiveClientId
    ? projects.filter((p) => p.client_id === effectiveClientId)
    : projects

  function onChangeClient(id: string) {
    setClientId(id)
    // Clear a project that no longer belongs to the chosen client.
    if (projectId) {
      const proj = projects.find((p) => p.id === projectId)
      if (proj && proj.client_id !== id) setProjectId('')
    }
  }

  function onChangeProject(id: string) {
    setProjectId(id)
    const proj = projects.find((p) => p.id === id)
    if (proj?.client_id && !lockedClientId) setClientId(proj.client_id)
  }

  return (
    <div style={styles.detailGrid}>
      <Field
        label="Concept name"
        required
        style={{ gridColumn: '1 / -1' }}
        help="The name the client sees for this set of concepts."
      >
        <input value={conceptName} onChange={(e) => setConceptName(e.target.value)} style={styles.input} />
      </Field>

      {/* H4/H6: client always has a visible label; locked state is explained. */}
      <Field
        label="Client"
        required
        help={lockedClient ? 'Locked to the client selected in the top bar.' : 'Who this set is for.'}
      >
        {lockedClient ? (
          <div style={styles.lockedField}>
            <Lock size={14} />
            <span>{clientLabel(lockedClient)}</span>
          </div>
        ) : (
          <select value={clientId} onChange={(e) => onChangeClient(e.target.value)} style={styles.input}>
            <option value="">Choose client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {clientLabel(c)}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label="Project" help="Filtered to the selected client's projects.">
        <select value={projectId} onChange={(e) => onChangeProject(e.target.value)} style={styles.input}>
          <option value="">None</option>
          {projectOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Phase" help="The project phase this concept belongs to.">
        <input value={phase} onChange={(e) => setPhase(e.target.value)} style={styles.input} placeholder="e.g. 2" />
      </Field>
      <Field label="Phase name" help="A short name for the phase, e.g. Foundation.">
        <input value={phaseName} onChange={(e) => setPhaseName(e.target.value)} style={styles.input} />
      </Field>
      <Field
        label="Task item"
        style={{ gridColumn: '1 / -1' }}
        help="The specific deliverable, e.g. 01 Brand Identity Design."
      >
        <input value={taskItem} onChange={(e) => setTaskItem(e.target.value)} style={styles.input} />
      </Field>
    </div>
  )
}

// ── New mockup set (creation modal) ─────────────────────────────────────────
function NewMockupModal({
  projects,
  clients,
  lockedClientId,
  onClose,
  onCreated,
}: {
  projects: ProjectOption[]
  clients: ClientOption[]
  lockedClientId: string | null
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const [conceptName, setConceptName] = useState('')
  const [projectId, setProjectId] = useState('')
  const [clientId, setClientId] = useState('')
  const [phase, setPhase] = useState('')
  const [phaseName, setPhaseName] = useState('')
  const [taskItem, setTaskItem] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const finalClientId = lockedClientId ?? clientId
  // H5: error prevention — Create stays disabled until required fields are set.
  const canCreate = conceptName.trim().length > 0 && !!finalClientId

  async function handleCreate() {
    if (!canCreate || saving) return
    setSaving(true)
    setError(null)
    try {
      const { data: sess } = await supabase.auth.getUser()
      const { data, error: err } = await supabase
        .from('mockup_sets')
        .insert({
          concept_name: conceptName.trim(),
          project_id: projectId || null,
          client_id: finalClientId,
          phase: phase.trim() || null,
          phase_name: phaseName.trim() || null,
          task_item: taskItem.trim() || null,
          status: 'draft',
          created_by: sess.user?.id ?? null,
        })
        .select('id')
        .single()
      if (err) throw err
      onCreated((data as { id: string }).id)
    } catch {
      // H9: plain-language error shown inline, with a next step.
      setError('Could not create the mockup set. Check the details and try again.')
      setSaving(false)
    }
  }

  return (
    <Modal title="New mockup set" onClose={onClose}>
      {error && <div style={styles.error}>{error}</div>}
      {/* H7: Enter submits the form when valid. */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void handleCreate()
        }}
      >
        <MockupDetailsFields
          conceptName={conceptName} setConceptName={setConceptName}
          projectId={projectId} setProjectId={setProjectId}
          clientId={clientId} setClientId={setClientId}
          phase={phase} setPhase={setPhase}
          phaseName={phaseName} setPhaseName={setPhaseName}
          taskItem={taskItem} setTaskItem={setTaskItem}
          projects={projects} clients={clients}
          lockedClientId={lockedClientId}
        />
        <div style={styles.modalActions}>
          {/* H4: cancel is outlined, never filled. */}
          <button type="button" style={styles.secondaryBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          {/* H1/H5: loading state on the action; disabled until valid. */}
          <button
            type="submit"
            style={{ ...ui.primaryBtn, ...(!canCreate || saving ? styles.btnDisabled : null) }}
            disabled={!canCreate || saving}
          >
            {saving ? 'Creating...' : 'Create and add images'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Edit/view panel (right-side drawer) ─────────────────────────────────────
type Tab = 'images' | 'feedback'

type FullSet = {
  id: string
  concept_name: string
  project_id: string | null
  client_id: string | null
  phase: string | null
  phase_name: string | null
  task_item: string | null
  status: SetStatus
  created_at: string
  projects: { title: string | null } | null
}

function MockupSetPanel({
  setId,
  projects,
  clients,
  lockedClientId,
  onClose,
  onChanged,
}: {
  setId: string
  projects: ProjectOption[]
  clients: ClientOption[]
  lockedClientId: string | null
  onClose: () => void
  onChanged: () => void
}) {
  const narrow = useIsNarrow()
  const [shown, setShown] = useState(false)
  const [tab, setTab] = useState<Tab>('images')
  const [preview, setPreview] = useState(false)

  const [set, setSet] = useState<FullSet | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Editable detail fields.
  const [conceptName, setConceptName] = useState('')
  const [projectId, setProjectId] = useState('')
  const [clientId, setClientId] = useState('')
  const [phase, setPhase] = useState('')
  const [phaseName, setPhaseName] = useState('')
  const [taskItem, setTaskItem] = useState('')
  const [saving, setSaving] = useState(false)

  // Slide-in once mounted.
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(t)
  }, [])

  // H7: Escape closes the panel — but yields to the preview lightbox, which has
  // its own Escape handler, so one keypress never closes both at once.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !preview) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, preview])

  // Load (or reload when a different row is clicked — content swaps in place).
  const loadSet = useCallback(async () => {
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('mockup_sets')
        .select(
          'id, concept_name, project_id, client_id, phase, phase_name, task_item, status, created_at, projects(title)'
        )
        .eq('id', setId)
        .single()
      if (err) throw err
      const s = data as unknown as FullSet
      setSet(s)
      setConceptName(s.concept_name ?? '')
      setProjectId(s.project_id ?? '')
      setClientId(s.client_id ?? '')
      setPhase(s.phase ?? '')
      setPhaseName(s.phase_name ?? '')
      setTaskItem(s.task_item ?? '')
    } catch {
      setError('Could not load this mockup set. Refresh to try again.')
    }
  }, [setId])

  useEffect(() => {
    void loadSet()
  }, [loadSet])

  const finalClientId = lockedClientId ?? clientId
  const canSave = conceptName.trim().length > 0 && !!finalClientId
  const selectedClientName = clientLabel(clients.find((c) => c.id === finalClientId))

  async function saveDetails() {
    if (!canSave || saving) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const { error: err } = await supabase
        .from('mockup_sets')
        .update({
          concept_name: conceptName.trim(),
          project_id: projectId || null,
          client_id: finalClientId,
          phase: phase.trim() || null,
          phase_name: phaseName.trim() || null,
          task_item: taskItem.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', setId)
      if (err) throw err
      setNotice('Details saved.') // H1: success is visible in the panel.
      await loadSet()
      onChanged()
    } catch {
      setError('Could not save the details. Try again.')
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(next: SetStatus, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    setError(null)
    try {
      const { error: err } = await supabase
        .from('mockup_sets')
        .update({ status: next, updated_at: new Date().toISOString() })
        .eq('id', setId)
      if (err) throw err
      await loadSet()
      onChanged()
    } catch {
      setError('Could not update the status. Try again.')
    }
  }

  const meta: LightboxMeta = {
    projectName: set?.projects?.title ?? '',
    conceptName,
    phase,
    phaseName,
    taskItem,
    date: set?.created_at ?? new Date().toISOString(),
  }

  const panelStyle: CSSProperties = narrow
    ? { ...styles.panelBase, ...styles.sheet, transform: shown ? 'translateY(0)' : 'translateY(100%)' }
    : { ...styles.panelBase, ...styles.drawer, transform: shown ? 'translateX(0)' : 'translateX(100%)' }

  return (
    <>
      {/* Backdrop only on the mobile bottom sheet; desktop keeps the list live. */}
      {narrow && <div style={styles.panelBackdrop} onClick={onClose} />}
      <aside style={panelStyle} role="dialog" aria-label={set ? `Mockup set ${set.concept_name}` : 'Mockup set'}>
        {/* H3: always-visible close path. */}
        <button type="button" style={styles.panelClose} onClick={onClose} aria-label="Close panel">
          <X size={18} />
        </button>

        <div style={styles.panelBody}>
          <header style={styles.panelHeader}>
            <h2 style={styles.panelTitle}>{conceptName || 'Mockup set'}</h2>
            {set && <StatusPill status={set.status} />}
          </header>
          {set && (
            <p style={styles.panelMeta}>
              {(set.projects?.title || 'No project') + ' · ' + selectedClientName + (phase ? ` · Phase ${phase}` : '')}
            </p>
          )}

          {error && <div style={styles.error}>{error}</div>}
          {notice && <div style={styles.notice}>{notice}</div>}

          {!set ? (
            <p style={{ ...ui.muted, padding: '12px 0' }}>Loading...</p>
          ) : (
            <>
              {/* Editable details */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void saveDetails()
                }}
              >
                <MockupDetailsFields
                  conceptName={conceptName} setConceptName={setConceptName}
                  projectId={projectId} setProjectId={setProjectId}
                  clientId={clientId} setClientId={setClientId}
                  phase={phase} setPhase={setPhase}
                  phaseName={phaseName} setPhaseName={setPhaseName}
                  taskItem={taskItem} setTaskItem={setTaskItem}
                  projects={projects} clients={clients}
                  lockedClientId={lockedClientId}
                />
                <div style={styles.detailActions}>
                  <button
                    type="submit"
                    style={{ ...ui.primaryBtn, ...(!canSave || saving ? styles.btnDisabled : null) }}
                    disabled={!canSave || saving}
                  >
                    {saving ? 'Saving...' : 'Save details'}
                  </button>
                </div>
              </form>

              {/* Tabs */}
              <div style={styles.tabStrip}>
                <TabButton active={tab === 'images'} onClick={() => setTab('images')}>
                  Images
                </TabButton>
                <TabButton active={tab === 'feedback'} onClick={() => setTab('feedback')}>
                  Feedback
                </TabButton>
              </div>

              {tab === 'images' ? (
                <ItemsTab
                  setId={setId}
                  status={set.status}
                  clientName={selectedClientName}
                  onPreview={() => setPreview(true)}
                  onChanged={onChanged}
                  onStatus={setStatus}
                  onError={setError}
                />
              ) : (
                <FeedbackTab setId={setId} status={set.status} />
              )}
            </>
          )}
        </div>
      </aside>

      {preview && <PreviewOverlay setId={setId} meta={meta} onClose={() => setPreview(false)} />}
    </>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button type="button" onClick={onClick} style={{ ...styles.tab, ...(active ? styles.tabActive : null) }}>
      {children}
    </button>
  )
}

// ── Items tab: uploader (per-file progress) + reorderable list ──────────────
type UploadEntry = { id: string; name: string; status: 'uploading' | 'done' | 'error'; file: File }

function ItemsTab({
  setId,
  status,
  clientName,
  onPreview,
  onChanged,
  onStatus,
  onError,
}: {
  setId: string
  status: SetStatus
  clientName: string
  onPreview: () => void
  onChanged: () => void
  onStatus: (next: SetStatus, confirmMsg?: string) => void
  onError: (msg: string) => void
}) {
  const [items, setItems] = useState<MockupItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploads, setUploads] = useState<UploadEntry[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const orderRef = useRef(0)

  const uploading = uploads.some((u) => u.status === 'uploading')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('mockup_items')
      .select('id, label, storage_path, sort_order')
      .eq('set_id', setId)
      .order('sort_order', { ascending: true })
    if (error) onError('Could not load images for this set.')
    else setItems((data ?? []) as MockupItem[])
    setLoading(false)
  }, [setId, onError])

  useEffect(() => {
    void load()
  }, [load])

  // CHANGE 2: upload each file with its own progress row.
  async function uploadOne(entry: UploadEntry) {
    setUploads((prev) => prev.map((u) => (u.id === entry.id ? { ...u, status: 'uploading' } : u)))
    try {
      const path = `${setId}/${entry.file.name}`
      const { error: upErr } = await supabase.storage
        .from('mockups')
        .upload(path, entry.file, { upsert: true, contentType: entry.file.type })
      if (upErr) throw upErr
      const label = entry.file.name.replace(/\.[^.]+$/, '')
      const { error: insErr } = await supabase
        .from('mockup_items')
        .insert({ set_id: setId, label, storage_path: path, sort_order: orderRef.current++ })
      if (insErr) throw insErr
      setUploads((prev) => prev.map((u) => (u.id === entry.id ? { ...u, status: 'done' } : u)))
      await load()
      onChanged()
      // Clear the finished row shortly after it reads 100%.
      setTimeout(() => setUploads((prev) => prev.filter((u) => u.id !== entry.id)), 1200)
    } catch {
      // H9: keep the failed file visible with a retry path.
      setUploads((prev) => prev.map((u) => (u.id === entry.id ? { ...u, status: 'error' } : u)))
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      onError('Those files are not images. Upload PNG or JPG files.')
      return
    }
    orderRef.current = items.reduce((m, it) => Math.max(m, it.sort_order), -1) + 1
    const entries: UploadEntry[] = imageFiles.map((f, i) => ({
      id: `${Date.now()}-${i}`,
      name: f.name,
      status: 'uploading',
      file: f,
    }))
    setUploads((prev) => [...prev, ...entries])
    if (fileRef.current) fileRef.current.value = ''
    for (const entry of entries) {
      await uploadOne(entry)
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const other = index + dir
    if (other < 0 || other >= items.length) return
    const a = items[index]
    const b = items[other]
    setItems((prev) => {
      const copy = [...prev]
      copy[index] = { ...b }
      copy[other] = { ...a }
      return copy
    })
    try {
      await Promise.all([
        supabase.from('mockup_items').update({ sort_order: b.sort_order }).eq('id', a.id),
        supabase.from('mockup_items').update({ sort_order: a.sort_order }).eq('id', b.id),
      ])
    } catch {
      onError('Could not reorder images. Refresh to try again.')
      await load()
    }
  }

  async function rename(id: string, label: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, label } : it)))
    const { error } = await supabase.from('mockup_items').update({ label }).eq('id', id)
    if (error) onError('Could not rename the image.')
  }

  async function remove(item: MockupItem) {
    // H3: destructive action with a plain-language, irreversible consequence.
    if (!window.confirm('This will permanently remove this image. It cannot be undone.')) return
    try {
      const { error: delErr } = await supabase.from('mockup_items').delete().eq('id', item.id)
      if (delErr) throw delErr
      await supabase.storage.from('mockups').remove([item.storage_path])
      await load()
      onChanged()
    } catch {
      onError('Could not delete the image. Try again.')
    }
  }

  return (
    <div style={styles.itemsWrap}>
      {/* Indeterminate progress-bar animation (no per-byte progress from the SDK). */}
      <style>{`@keyframes mockupBar{0%{transform:translateX(-100%)}100%{transform:translateX(320%)}}`}</style>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        style={{ ...styles.dropzone, ...(uploading ? styles.btnDisabled : null) }}
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
      >
        <UploadCloud size={20} />
        {/* H1: triggering control reflects the in-progress state. */}
        <span>{uploading ? 'Uploading...' : 'Click to upload concept images'}</span>
        <span style={styles.dropzoneHint}>PNG or JPG, multiple allowed</span>
      </button>

      {/* CHANGE 2 + H1/H9: per-file progress, with retry on failure. */}
      {uploads.length > 0 && (
        <ul style={styles.uploadList}>
          {uploads.map((u) => (
            <li key={u.id} style={styles.uploadRow}>
              <div style={styles.uploadInfo}>
                <span style={styles.uploadName}>{u.name}</span>
                {u.status === 'error' && (
                  <span style={styles.uploadErrText}>Upload failed. Check your connection and try again.</span>
                )}
              </div>
              {u.status === 'error' ? (
                <button type="button" style={styles.retryBtn} onClick={() => uploadOne(u)}>
                  Retry
                </button>
              ) : (
                <div style={styles.barTrack}>
                  <div
                    style={
                      u.status === 'done'
                        ? styles.barDone
                        : styles.barIndeterminate
                    }
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {loading ? (
        <p style={{ ...ui.muted, padding: '12px 0' }}>Loading images...</p>
      ) : items.length === 0 ? (
        // H6: empty state explains what to do.
        <p style={{ ...ui.muted, padding: '12px 0' }}>No images yet. Upload concept images above to build this set.</p>
      ) : (
        <ul style={styles.itemList}>
          {items.map((it, i) => (
            <li key={it.id} style={styles.itemRow}>
              <span style={styles.itemIndex}>{i + 1}</span>
              <input
                value={it.label}
                onChange={(e) => rename(it.id, e.target.value)}
                style={styles.itemLabelInput}
                aria-label="Image label"
              />
              <div style={styles.itemActions}>
                <button type="button" style={styles.iconBtn} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                  <ArrowUp size={15} />
                </button>
                <button type="button" style={styles.iconBtn} onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down">
                  <ArrowDown size={15} />
                </button>
                {/* H5: delete disabled while an upload is in progress. */}
                <button
                  type="button"
                  style={{ ...styles.iconBtn, color: tokens.ruby, ...(uploading ? styles.btnDisabled : null) }}
                  onClick={() => remove(it)}
                  disabled={uploading}
                  aria-label="Delete image"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div style={styles.itemsFooter}>
        {/* H4: cancel/secondary actions are outlined, never filled. */}
        <button type="button" style={{ ...styles.secondaryBtn, ...(items.length === 0 ? styles.btnDisabled : null) }} onClick={onPreview} disabled={items.length === 0}>
          <Eye size={15} /> Preview as client
        </button>

        {/* H5: publish disabled until at least one image exists.
            H3: unpublish is reversible-but-significant, so it confirms first. */}
        {status === 'published' ? (
          <button
            type="button"
            style={styles.dangerBtn}
            onClick={() =>
              onStatus('draft', `This will unpublish the set and hide it from ${clientName}. Continue?`)
            }
          >
            Unpublish
          </button>
        ) : (
          <button
            type="button"
            style={{ ...ui.primaryBtn, ...(items.length === 0 ? styles.btnDisabled : null) }}
            onClick={() =>
              onStatus('published', `This will make the mockup set visible to ${clientName}. Continue?`)
            }
            disabled={items.length === 0}
          >
            Publish
          </button>
        )}
      </div>
    </div>
  )
}

// ── Feedback tab (read-only) ───────────────────────────────────────────────
type FeedbackRow = {
  id: string
  item_id: string | null
  submitted_by: string | null
  feedback_type: 'concept_approval' | 'concept_rejection' | 'item_comment' | null
  comment: string | null
  created_at: string
}

function FeedbackTab({ setId, status }: { setId: string; status: SetStatus }) {
  const [feedback, setFeedback] = useState<FeedbackRow[]>([])
  const [items, setItems] = useState<MockupItem[]>([])
  const [emails, setEmails] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [fbRes, itRes] = await Promise.all([
        supabase
          .from('mockup_feedback')
          .select('id, item_id, submitted_by, feedback_type, comment, created_at')
          .eq('set_id', setId)
          .order('created_at', { ascending: true }),
        supabase.from('mockup_items').select('id, label, storage_path, sort_order').eq('set_id', setId),
      ])
      if (cancelled) return
      const fb = (fbRes.data ?? []) as FeedbackRow[]
      setFeedback(fb)
      setItems((itRes.data ?? []) as MockupItem[])

      const ids = Array.from(new Set(fb.map((f) => f.submitted_by).filter(Boolean))) as string[]
      if (ids.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, email').in('id', ids)
        if (!cancelled) {
          const map: Record<string, string> = {}
          for (const p of profs ?? []) map[(p as { id: string }).id] = (p as { email: string }).email
          setEmails(map)
        }
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [setId])

  const conceptStatus = useMemo(() => {
    const decisions = feedback.filter(
      (f) => f.feedback_type === 'concept_approval' || f.feedback_type === 'concept_rejection'
    )
    const last = decisions[decisions.length - 1]
    if (!last) return 'awaiting' as const
    return last.feedback_type === 'concept_approval' ? ('approved' as const) : ('changes' as const)
  }, [feedback])

  const itemLabel = useCallback(
    (id: string | null) => items.find((it) => it.id === id)?.label ?? 'General',
    [items]
  )

  const comments = feedback.filter((f) => f.feedback_type === 'item_comment')
  const conceptNotes = feedback.filter(
    (f) => f.feedback_type === 'concept_approval' || f.feedback_type === 'concept_rejection'
  )

  const grouped = useMemo(() => {
    const map = new Map<string, FeedbackRow[]>()
    for (const c of comments) {
      const key = itemLabel(c.item_id)
      const arr = map.get(key) ?? []
      arr.push(c)
      map.set(key, arr)
    }
    return Array.from(map.entries())
  }, [comments, itemLabel])

  if (loading) return <p style={{ ...ui.muted, padding: '12px 0' }}>Loading feedback...</p>

  if (feedback.length === 0) {
    // H10: empty feedback explains how feedback is collected.
    return (
      <p style={{ ...ui.muted, padding: '12px 0' }}>
        {status === 'published'
          ? 'No feedback yet. Your client can review this published set and respond from their portal.'
          : 'No feedback yet. Publish this set so your client can review it and respond.'}
      </p>
    )
  }

  return (
    <div style={styles.feedbackWrap}>
      <ConceptStatusBanner status={conceptStatus} />

      {conceptNotes.some((n) => n.comment) && (
        <div style={styles.fbGroup}>
          <h4 style={styles.fbGroupTitle}>Concept response</h4>
          {conceptNotes
            .filter((n) => n.comment)
            .map((n) => (
              <FeedbackComment key={n.id} row={n} email={emails[n.submitted_by ?? '']} />
            ))}
        </div>
      )}

      {grouped.length === 0 ? (
        <p style={{ ...ui.muted, padding: '8px 0' }}>No image comments yet.</p>
      ) : (
        grouped.map(([label, rows]) => (
          <div key={label} style={styles.fbGroup}>
            <h4 style={styles.fbGroupTitle}>{label}</h4>
            {rows.map((r) => (
              <FeedbackComment key={r.id} row={r} email={emails[r.submitted_by ?? '']} />
            ))}
          </div>
        ))
      )}
    </div>
  )
}

function ConceptStatusBanner({ status }: { status: 'approved' | 'changes' | 'awaiting' }) {
  // H4: same colour language as everywhere (green approved, ruby changes, grey awaiting).
  const config = {
    approved: { bg: tokens.greenLight, fg: tokens.green, label: 'Approved' },
    changes: { bg: tokens.rubyLight, fg: tokens.ruby, label: 'Changes requested' },
    awaiting: { bg: '#F0EEEA', fg: t.text.tertiary, label: 'Awaiting feedback' },
  }[status]
  return <div style={{ ...styles.conceptBanner, background: config.bg, color: config.fg }}>{config.label}</div>
}

function FeedbackComment({ row, email }: { row: FeedbackRow; email?: string }) {
  return (
    <div style={styles.fbComment}>
      <p style={styles.fbCommentText}>{row.comment}</p>
      {/* H2: human date, never a raw timestamp. */}
      <p style={styles.fbCommentMeta}>
        {email || 'Client'} · {formatDate(row.created_at)}
      </p>
    </div>
  )
}

// ── Preview-as-client overlay ──────────────────────────────────────────────
function PreviewOverlay({
  setId,
  meta,
  onClose,
}: {
  setId: string
  meta: LightboxMeta
  onClose: () => void
}) {
  const [mockups, setMockups] = useState<LightboxMockup[] | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: items } = await supabase
        .from('mockup_items')
        .select('id, label, storage_path, sort_order')
        .eq('set_id', setId)
        .order('sort_order', { ascending: true })
      const signed = await signMockupItems((items ?? []) as MockupItem[])
      if (!cancelled) setMockups(signed)
    })()
    return () => {
      cancelled = true
    }
  }, [setId])

  if (!mockups) return null
  return <ClientLightbox mockups={mockups} meta={meta} onClose={onClose} isAdmin setId={setId} />
}

function Field({
  label,
  required,
  help,
  style,
  children,
}: {
  label: string
  required?: boolean
  help?: string
  style?: CSSProperties
  children: React.ReactNode
}) {
  return (
    <label style={{ ...styles.field, ...style }}>
      {/* H6: every field has a visible label, not just a placeholder. */}
      <span style={styles.fieldLabel}>
        {label}
        {required && <span style={{ color: tokens.ruby }}> *</span>}
      </span>
      {children}
      {/* H10: helper text under non-obvious fields. */}
      {help && <span style={styles.fieldHelp}>{help}</span>}
    </label>
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
  notice: {
    background: tokens.greenLight,
    color: tokens.green,
    border: `1px solid ${tokens.green}`,
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
  row: { cursor: 'pointer' },
  rowActive: { background: tokens.tealLight },
  td: {
    padding: '14px 20px',
    fontSize: 14,
    color: t.text.secondary,
    borderBottom: `1px solid ${tokens.border}`,
    verticalAlign: 'middle',
  },
  emptyState: { padding: '48px 24px', textAlign: 'center' },
  emptyHeading: { fontFamily: fonts.heading, fontSize: 18, fontWeight: 600, color: t.text.primary, margin: '0 0 8px' },
  emptyBody: { fontFamily: fonts.body, fontSize: 14, color: t.text.secondary, margin: '0 auto', maxWidth: 420, lineHeight: 1.5 },

  // Form — H8: 16px between fields, 8px label-to-input (see field gap).
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  detailActions: { display: 'flex', justifyContent: 'flex-end', gap: 12, margin: '16px 0 4px' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 },
  field: { display: 'flex', flexDirection: 'column', gap: 8 },
  fieldLabel: { fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: t.text.tertiary },
  fieldHelp: { fontFamily: fonts.body, fontSize: 12, color: t.text.muted, opacity: 0.85 },
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
  lockedField: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
    background: tokens.bg,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '9px 11px',
  },
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
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
  // H4: destructive buttons use ruby, never teal.
  dangerBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: tokens.surface,
    color: tokens.ruby,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '10px 16px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnDisabled: { opacity: 0.5, cursor: 'default' },

  // Tabs
  tabStrip: { display: 'flex', gap: 8, marginTop: 24, borderBottom: `1px solid ${tokens.border}` },
  tab: {
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '8px 4px',
    marginBottom: -1,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    color: t.text.tertiary,
    cursor: 'pointer',
  },
  tabActive: { color: tokens.primary, borderBottomColor: tokens.accent },

  // Items
  itemsWrap: { display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 16 },
  dropzone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: '24px 16px',
    border: `1.5px dashed ${tokens.border}`,
    borderRadius: 10,
    background: tokens.inputBg,
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  dropzoneHint: { fontSize: 12, fontWeight: 400 },
  uploadList: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 },
  uploadRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '8px 12px',
  },
  uploadInfo: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  uploadName: { fontFamily: fonts.body, fontSize: 13, color: t.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  uploadErrText: { fontFamily: fonts.body, fontSize: 12, color: tokens.ruby },
  barTrack: { width: 120, height: 6, borderRadius: 999, background: tokens.border, overflow: 'hidden', flexShrink: 0 },
  barIndeterminate: { width: '40%', height: '100%', borderRadius: 999, background: tokens.accent, animation: 'mockupBar 1.1s ease-in-out infinite' },
  barDone: { width: '100%', height: '100%', borderRadius: 999, background: tokens.green },
  retryBtn: {
    flexShrink: 0,
    background: tokens.surface,
    color: tokens.primary,
    border: `1px solid ${tokens.border}`,
    borderRadius: 6,
    padding: '6px 12px',
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  itemList: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '8px 12px',
  },
  itemIndex: {
    width: 22,
    height: 22,
    flexShrink: 0,
    borderRadius: '50%',
    background: tokens.tealLight,
    color: tokens.primary,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabelInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: 6,
    padding: '6px 8px',
  },
  itemActions: { display: 'flex', alignItems: 'center', gap: 4 },
  iconBtn: {
    background: 'transparent',
    border: `1px solid ${tokens.border}`,
    borderRadius: 6,
    width: 30,
    height: 30,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: t.text.muted,
    cursor: 'pointer',
  },
  itemsFooter: { display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 6, paddingTop: 14, borderTop: `1px solid ${tokens.border}` },

  // Feedback
  feedbackWrap: { display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 16 },
  conceptBanner: { alignSelf: 'flex-start', padding: '6px 14px', borderRadius: 999, fontFamily: fonts.body, fontSize: 13, fontWeight: 600 },
  fbGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
  fbGroupTitle: { fontFamily: fonts.body, fontSize: 12, fontWeight: 700, color: t.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.4, margin: 0 },
  fbComment: { background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 8, padding: '10px 12px' },
  fbCommentText: { fontFamily: fonts.body, fontSize: 14, color: t.text.primary, margin: 0, lineHeight: 1.5 },
  fbCommentMeta: { fontFamily: fonts.body, fontSize: 12, color: t.text.tertiary, margin: '6px 0 0' },

  // Right-side panel (mirrors InvoicePreview)
  panelBackdrop: { position: 'fixed', inset: 0, background: 'rgba(10, 26, 27, 0.4)', zIndex: 200 },
  panelBase: {
    position: 'fixed',
    background: tokens.surface,
    zIndex: 201,
    boxShadow: '0 12px 48px rgba(2, 76, 79, 0.18)',
    transition: 'transform 0.28s ease',
    overflowY: 'auto',
  },
  drawer: { top: 0, right: 0, height: '100vh', width: 520, maxWidth: '94vw', borderLeft: `1px solid ${tokens.border}` },
  sheet: { left: 0, right: 0, bottom: 0, maxHeight: '88vh', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  panelClose: {
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
  panelBody: { padding: 28 },
  panelHeader: { display: 'flex', alignItems: 'center', gap: 12, paddingRight: 40 },
  panelTitle: { fontFamily: fonts.heading, fontSize: 20, fontWeight: 600, color: t.text.primary, margin: 0 },
  panelMeta: { fontFamily: fonts.body, fontSize: 13, color: t.text.tertiary, margin: '6px 0 20px' },
}
