// Mockups admin (Phase 3). Lists mockup sets, scoped by the global client
// selector, and hosts the create/edit modal where an admin uploads concept
// images, orders and labels them, reviews client feedback, previews the set the
// way the client will see it, and publishes it.
//
// Storage layout: every image lives at `mockups/{set_id}/{filename}` so the
// bucket RLS policy can grant a client read access by matching the first path
// segment to one of their published sets. `mockup_items.storage_path` stores
// that in-bucket path (`{set_id}/{filename}`).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, ArrowUp, ArrowDown, Trash2, Eye, UploadCloud } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, fonts } from '../theme'
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

function itemCount(row: MockupSetRow): number {
  return row.mockup_items?.[0]?.count ?? 0
}

function clientName(row: { clients: MockupSetRow['clients'] }): string {
  return row.clients?.company_name || row.clients?.contact_name || '—'
}

// ── List page ────────────────────────────────────────────────────────────
export function MockupsAdmin() {
  const { selectedClientId, clients } = usePortal()
  const [sets, setSets] = useState<MockupSetRow[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<MockupSetRow | 'new' | null>(null)

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
          <button type="button" style={ui.primaryBtn} onClick={() => setEditing('new')}>
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
          <p style={{ ...ui.muted, padding: 20 }}>No mockup sets yet. Create one to get started.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Concept</th>
                <th style={styles.th}>Project</th>
                <th style={styles.th}>Client</th>
                <th style={styles.th}>Phase</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Items</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Created</th>
              </tr>
            </thead>
            <tbody>
              {sets.map((s) => (
                <tr key={s.id} style={styles.row} onClick={() => setEditing(s)}>
                  <td style={{ ...styles.td, fontWeight: 600, color: tokens.text }}>{s.concept_name}</td>
                  <td style={styles.td}>{s.projects?.title || '—'}</td>
                  <td style={styles.td}>{clientName(s)}</td>
                  <td style={styles.td}>{s.phase || '—'}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{itemCount(s)}</td>
                  <td style={styles.td}>
                    <StatusPill status={s.status} />
                  </td>
                  <td style={styles.td}>{formatDate(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {editing && (
        <MockupSetModal
          existing={editing === 'new' ? null : editing}
          projects={projects}
          clients={clients}
          defaultClientId={selectedClientId}
          onClose={() => setEditing(null)}
          onChanged={() => void load()}
        />
      )}
    </>
  )
}

function StatusPill({ status }: { status: SetStatus }) {
  const tone: Record<SetStatus, { bg: string; fg: string }> = {
    draft: { bg: '#F0EEEA', fg: tokens.textMuted },
    published: { bg: tokens.tealLight, fg: tokens.primary },
    archived: { bg: '#F0EEEA', fg: '#9AA7A7' },
  }
  const t = tone[status]
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
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

// ── Create / edit modal ────────────────────────────────────────────────────
type Tab = 'items' | 'feedback'

function MockupSetModal({
  existing,
  projects,
  clients,
  defaultClientId,
  onClose,
  onChanged,
}: {
  existing: MockupSetRow | null
  projects: ProjectOption[]
  clients: { id: string; company_name: string | null; contact_name: string | null }[]
  defaultClientId: string | null
  onClose: () => void
  onChanged: () => void
}) {
  const [setId, setSetId] = useState<string | null>(existing?.id ?? null)
  const [status, setStatus] = useState<SetStatus>(existing?.status ?? 'draft')

  const [conceptName, setConceptName] = useState(existing?.concept_name ?? '')
  const [projectId, setProjectId] = useState(existing?.project_id ?? '')
  const [clientId, setClientId] = useState(existing?.client_id ?? defaultClientId ?? '')
  const [phase, setPhase] = useState(existing?.phase ?? '')
  const [phaseName, setPhaseName] = useState(existing?.phase_name ?? '')
  const [taskItem, setTaskItem] = useState(existing?.task_item ?? '')

  const [savingDetails, setSavingDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('items')
  const [preview, setPreview] = useState(false)

  const selectedClientName = useMemo(() => {
    const c = clients.find((x) => x.id === clientId)
    return clientLabel(c)
  }, [clients, clientId])

  function onPickProject(value: string) {
    setProjectId(value)
    const p = projects.find((x) => x.id === value)
    if (p?.client_id && !clientId) setClientId(p.client_id)
  }

  async function saveDetails() {
    setError(null)
    if (!conceptName.trim()) return setError('Concept name is required.')
    if (!clientId) return setError('Choose a client for this mockup set.')
    setSavingDetails(true)
    try {
      const payload = {
        concept_name: conceptName.trim(),
        project_id: projectId || null,
        client_id: clientId,
        phase: phase.trim() || null,
        phase_name: phaseName.trim() || null,
        task_item: taskItem.trim() || null,
      }
      if (setId) {
        const { error: err } = await supabase.from('mockup_sets').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', setId)
        if (err) throw err
      } else {
        const { data: sess } = await supabase.auth.getUser()
        const { data, error: err } = await supabase
          .from('mockup_sets')
          .insert({ ...payload, status: 'draft', created_by: sess.user?.id ?? null })
          .select('id')
          .single()
        if (err) throw err
        setSetId((data as { id: string }).id)
      }
      onChanged()
    } catch {
      setError('Could not save the mockup set. Check the details and try again.')
    } finally {
      setSavingDetails(false)
    }
  }

  async function publish() {
    if (!setId) return
    const ok = window.confirm(
      `This will make the mockup set visible to ${selectedClientName}. Continue?`
    )
    if (!ok) return
    try {
      const { error: err } = await supabase
        .from('mockup_sets')
        .update({ status: 'published', updated_at: new Date().toISOString() })
        .eq('id', setId)
      if (err) throw err
      setStatus('published')
      onChanged()
    } catch {
      setError('Could not publish the set. Try again.')
    }
  }

  const meta = {
    projectName: projects.find((p) => p.id === projectId)?.title ?? '',
    conceptName,
    phase,
    phaseName,
    taskItem,
    date: existing?.created_at ?? new Date().toISOString(),
  }

  return (
    <Modal
      title={setId ? 'Edit mockup set' : 'New mockup set'}
      size="lg"
      closeOnBackdrop={false}
      onClose={onClose}
      headerExtra={status === 'published' ? <StatusPill status="published" /> : undefined}
    >
      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.detailGrid}>
        <Field label="Concept name" required style={{ gridColumn: '1 / -1' }}>
          <input value={conceptName} onChange={(e) => setConceptName(e.target.value)} style={styles.input} />
        </Field>
        <Field label="Project">
          <select value={projectId} onChange={(e) => onPickProject(e.target.value)} style={styles.input}>
            <option value="">None</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Client" required>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={styles.input}>
            <option value="">Choose client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {clientLabel(c)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Phase">
          <input value={phase} onChange={(e) => setPhase(e.target.value)} style={styles.input} placeholder="e.g. 2" />
        </Field>
        <Field label="Phase name">
          <input value={phaseName} onChange={(e) => setPhaseName(e.target.value)} style={styles.input} />
        </Field>
        <Field label="Task item" style={{ gridColumn: '1 / -1' }}>
          <input value={taskItem} onChange={(e) => setTaskItem(e.target.value)} style={styles.input} />
        </Field>
      </div>

      <div style={styles.detailActions}>
        <button type="button" style={styles.secondaryBtn} onClick={onClose}>
          Close
        </button>
        <button type="button" style={ui.primaryBtn} onClick={saveDetails} disabled={savingDetails}>
          {savingDetails ? 'Saving...' : setId ? 'Save details' : 'Save and add images'}
        </button>
      </div>

      {setId ? (
        <>
          <div style={styles.tabStrip}>
            <TabButton active={tab === 'items'} onClick={() => setTab('items')}>
              Images
            </TabButton>
            <TabButton active={tab === 'feedback'} onClick={() => setTab('feedback')}>
              Feedback
            </TabButton>
          </div>
          {tab === 'items' ? (
            <ItemsTab
              setId={setId}
              status={status}
              clientName={selectedClientName}
              onPublish={publish}
              onPreview={() => setPreview(true)}
              onError={setError}
            />
          ) : (
            <FeedbackTab setId={setId} />
          )}
        </>
      ) : (
        <p style={styles.afterSaveHint}>Save the details above to start uploading concept images.</p>
      )}

      {preview && setId && (
        <PreviewOverlay setId={setId} meta={meta} onClose={() => setPreview(false)} />
      )}
    </Modal>
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
    <button
      type="button"
      onClick={onClick}
      style={{ ...styles.tab, ...(active ? styles.tabActive : null) }}
    >
      {children}
    </button>
  )
}

// ── Items tab: uploader + reorderable list ─────────────────────────────────
function ItemsTab({
  setId,
  status,
  clientName,
  onPublish,
  onPreview,
  onError,
}: {
  setId: string
  status: SetStatus
  clientName: string
  onPublish: () => void
  onPreview: () => void
  onError: (msg: string) => void
}) {
  const [items, setItems] = useState<MockupItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      let nextOrder = items.reduce((m, it) => Math.max(m, it.sort_order), -1) + 1
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        const path = `${setId}/${file.name}`
        const { error: upErr } = await supabase.storage
          .from('mockups')
          .upload(path, file, { upsert: true, contentType: file.type })
        if (upErr) throw upErr
        const label = file.name.replace(/\.[^.]+$/, '')
        const { error: insErr } = await supabase
          .from('mockup_items')
          .insert({ set_id: setId, label, storage_path: path, sort_order: nextOrder })
        if (insErr) throw insErr
        nextOrder += 1
      }
      await load()
    } catch {
      onError('Could not upload one or more images. Try again.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const other = index + dir
    if (other < 0 || other >= items.length) return
    const a = items[index]
    const b = items[other]
    // Swap their sort_order values.
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
    if (!window.confirm(`Delete "${item.label}"? This cannot be undone.`)) return
    try {
      const { error: delErr } = await supabase.from('mockup_items').delete().eq('id', item.id)
      if (delErr) throw delErr
      await supabase.storage.from('mockups').remove([item.storage_path])
      await load()
    } catch {
      onError('Could not delete the image. Try again.')
    }
  }

  return (
    <div style={styles.itemsWrap}>
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
        style={styles.dropzone}
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
      >
        <UploadCloud size={20} />
        <span>{uploading ? 'Uploading...' : 'Click to upload concept images'}</span>
        <span style={styles.dropzoneHint}>PNG or JPG, multiple allowed</span>
      </button>

      {loading ? (
        <p style={{ ...ui.muted, padding: '12px 0' }}>Loading images...</p>
      ) : items.length === 0 ? (
        <p style={{ ...ui.muted, padding: '12px 0' }}>No images yet.</p>
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
                <button
                  type="button"
                  style={styles.iconBtn}
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Move up"
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  type="button"
                  style={styles.iconBtn}
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1}
                  aria-label="Move down"
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  type="button"
                  style={{ ...styles.iconBtn, color: tokens.ruby }}
                  onClick={() => remove(it)}
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
        <button
          type="button"
          style={styles.secondaryBtn}
          onClick={onPreview}
          disabled={items.length === 0}
        >
          <Eye size={15} /> Preview as client
        </button>
        <button
          type="button"
          style={{ ...ui.primaryBtn, ...(status === 'published' ? styles.disabledBtn : null) }}
          onClick={onPublish}
          disabled={status === 'published' || items.length === 0}
        >
          {status === 'published' ? 'Published' : 'Publish'}
        </button>
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

function FeedbackTab({ setId }: { setId: string }) {
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

  // Concept status: the most recent approval/rejection wins.
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

  // Group comments by item label.
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

      {grouped.length === 0 && comments.length === 0 ? (
        <p style={{ ...ui.muted, padding: '8px 0' }}>No comments yet.</p>
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
  const config = {
    approved: { bg: tokens.greenLight, fg: tokens.green, label: 'Approved' },
    changes: { bg: tokens.rubyLight, fg: tokens.ruby, label: 'Changes requested' },
    awaiting: { bg: '#F0EEEA', fg: tokens.textMuted, label: 'Awaiting feedback' },
  }[status]
  return (
    <div style={{ ...styles.conceptBanner, background: config.bg, color: config.fg }}>
      {config.label}
    </div>
  )
}

function FeedbackComment({ row, email }: { row: FeedbackRow; email?: string }) {
  return (
    <div style={styles.fbComment}>
      <p style={styles.fbCommentText}>{row.comment}</p>
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
  style,
  children,
}: {
  label: string
  required?: boolean
  style?: CSSProperties
  children: React.ReactNode
}) {
  return (
    <label style={{ ...styles.field, ...style }}>
      <span style={styles.fieldLabel}>
        {label}
        {required && <span style={{ color: tokens.ruby }}> *</span>}
      </span>
      {children}
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
  table: { width: '100%', borderCollapse: 'collapse', fontFamily: fonts.body },
  th: {
    textAlign: 'left',
    padding: '12px 20px',
    fontSize: 12,
    fontWeight: 600,
    color: tokens.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    borderBottom: `1px solid ${tokens.border}`,
    background: tokens.bg,
  },
  row: { cursor: 'pointer' },
  td: {
    padding: '14px 20px',
    fontSize: 14,
    color: tokens.textMuted,
    borderBottom: `1px solid ${tokens.border}`,
    verticalAlign: 'middle',
  },
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  detailActions: { display: 'flex', justifyContent: 'flex-end', gap: 12, margin: '18px 0 4px' },
  afterSaveHint: {
    ...ui.muted,
    marginTop: 18,
    paddingTop: 18,
    borderTop: `1px solid ${tokens.border}`,
  } as CSSProperties,
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: { fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: tokens.textMuted },
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
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
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
  disabledBtn: { opacity: 0.6, cursor: 'default' },
  tabStrip: {
    display: 'flex',
    gap: 8,
    marginTop: 20,
    borderBottom: `1px solid ${tokens.border}`,
  },
  tab: {
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '8px 4px',
    marginBottom: -1,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    color: tokens.textMuted,
    cursor: 'pointer',
  },
  tabActive: { color: tokens.primary, borderBottomColor: tokens.accent },
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
    color: tokens.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  dropzoneHint: { fontSize: 12, fontWeight: 400 },
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
    color: tokens.text,
    background: 'transparent',
    border: `1px solid transparent`,
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
    color: tokens.textMuted,
    cursor: 'pointer',
  },
  itemsFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 6,
    paddingTop: 14,
    borderTop: `1px solid ${tokens.border}`,
  },
  feedbackWrap: { display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 16 },
  conceptBanner: {
    alignSelf: 'flex-start',
    padding: '6px 14px',
    borderRadius: 999,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
  },
  fbGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
  fbGroupTitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 700,
    color: tokens.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    margin: 0,
  },
  fbComment: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '10px 12px',
  },
  fbCommentText: { fontFamily: fonts.body, fontSize: 14, color: tokens.text, margin: 0, lineHeight: 1.5 },
  fbCommentMeta: { fontFamily: fonts.body, fontSize: 12, color: tokens.textMuted, margin: '6px 0 0' },
}
