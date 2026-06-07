import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PortalGuard, type PortalProfile } from './PortalGuard'
import { tokens, fonts } from './theme'

// NOTE: the spec referenced src/app/theme.ts, which only exists on the
// design-system branch. On phase-3-portal the portal palette lives in
// src/portal/theme.ts (cream tokens.bg, Fraunces headings, Inter body), so we
// use that here, consistent with the other portal pages.

const BUCKET = 'logo-sketches'
const MAX_FILES = 25
const ACCEPT = 'image/jpeg,image/png,image/webp'

// A client who has at least one non-delivered project. profileId is what we
// store as logo_sketch_sets.client_id (that column references profiles.id, so
// the client's review page can find the set via auth.uid()). projectSlug is the
// NOT NULL project_slug we attach a new set to.
type ClientOption = {
  clientId: string
  profileId: string
  name: string
  projectSlug: string | null
}

type SketchSet = {
  id: string
  name: string | null
  set_number: number
  total_count: number
  created_at: string
}

// ── Route entry: auth via PortalGuard, then admin-only gate ──────────
export function AdminSketchUpload() {
  return (
    <PortalGuard>
      {(profile) =>
        profile.role !== 'admin' ? (
          <Navigate to="/portal/dashboard" replace />
        ) : (
          <AdminInner profile={profile} />
        )
      }
    </PortalGuard>
  )
}

function AdminInner({ profile: _profile }: { profile: PortalProfile }) {
  const [clients, setClients] = useState<ClientOption[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [sets, setSets] = useState<SketchSet[]>([])
  const [selectedSetId, setSelectedSetId] = useState('')
  const [newSetName, setNewSetName] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null)
  const [thumbs, setThumbs] = useState<{ name: string; url: string }[]>([])
  const [thumbsLoading, setThumbsLoading] = useState(false)
  const [working, setWorking] = useState(false)

  const [loadingClients, setLoadingClients] = useState(true)
  const [loadingSets, setLoadingSets] = useState(false)
  const [creating, setCreating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const selectedClient = clients.find((c) => c.clientId === selectedClientId) ?? null
  const selectedSet = sets.find((s) => s.id === selectedSetId) ?? null

  // ── Load clients with a non-delivered project ──────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data, error: err } = await supabase
          .from('projects')
          .select(
            'slug, created_at, status, clients!inner(id, profile_id, company_name, contact_name)'
          )
          .neq('status', 'delivered')
          .order('created_at', { ascending: false })
        if (err) throw err
        if (cancelled) return

        const byClient = new Map<string, ClientOption>()
        for (const row of (data ?? []) as any[]) {
          const c = row.clients
          if (!c) continue
          const existing = byClient.get(c.id)
          if (!existing) {
            byClient.set(c.id, {
              clientId: c.id,
              profileId: c.profile_id,
              name: c.contact_name || c.company_name || '(unnamed client)',
              projectSlug: row.slug ?? null,
            })
          } else if (!existing.projectSlug && row.slug) {
            existing.projectSlug = row.slug
          }
        }
        setClients(Array.from(byClient.values()))
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoadingClients(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function loadSets(client: ClientOption) {
    setLoadingSets(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('logo_sketch_sets')
        .select('id, name, set_number, total_count, created_at')
        .eq('client_id', client.profileId)
        .order('created_at', { ascending: false })
      if (err) throw err
      setSets((data ?? []) as SketchSet[])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoadingSets(false)
    }
  }

  function handleClientChange(clientId: string) {
    setSelectedClientId(clientId)
    setSelectedSetId('')
    setSets([])
    setFiles([])
    setToast(null)
    const client = clients.find((c) => c.clientId === clientId)
    if (client) void loadSets(client)
  }

  // ── Expand / collapse a set and load its thumbnails ────────────────
  function toggleExpand(s: SketchSet) {
    if (expandedSetId === s.id) {
      setExpandedSetId(null)
      return
    }
    setSelectedSetId(s.id)
    setExpandedSetId(s.id)
    void loadThumbs(s.id)
  }

  async function loadThumbs(setId: string) {
    setThumbsLoading(true)
    setThumbs([])
    try {
      const { data, error: err } = await supabase.storage
        .from(BUCKET)
        .list(setId, { limit: 1000, sortBy: { column: 'name', order: 'asc' } })
      if (err) throw err
      const visible = (data ?? []).filter((f) => f.name && !f.name.startsWith('.'))
      setThumbs(
        visible.map((f) => ({
          name: f.name,
          url: supabase.storage.from(BUCKET).getPublicUrl(`${setId}/${f.name}`).data.publicUrl,
        }))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setThumbsLoading(false)
    }
  }

  // ── Delete a single sketch ─────────────────────────────────────────
  async function handleDeleteFile(s: SketchSet, fileName: string) {
    if (!window.confirm('Delete this sketch?')) return
    setWorking(true)
    setError(null)
    setToast(null)
    try {
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove([`${s.id}/${fileName}`])
      if (rmErr) throw rmErr
      // Recount actual files in storage and set total_count to that, so the
      // stored total can never drift from what is really in the bucket.
      const { data: list, error: listErr } = await supabase.storage
        .from(BUCKET)
        .list(s.id, { limit: 1000 })
      if (listErr) throw listErr
      const actualCount = (list ?? []).filter(
        (f) => f.name && !f.name.startsWith('.')
      ).length
      const { error: updErr } = await supabase
        .from('logo_sketch_sets')
        .update({ total_count: actualCount })
        .eq('id', s.id)
      if (updErr) throw updErr
      await loadThumbs(s.id)
      if (selectedClient) await loadSets(selectedClient)
      setToast('Sketch deleted')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setWorking(false)
    }
  }

  // ── Delete an entire set and all its sketches ──────────────────────
  async function handleDeleteSet(s: SketchSet) {
    if (!window.confirm('Delete entire set and all sketches? This cannot be undone.')) return
    setWorking(true)
    setError(null)
    setToast(null)
    try {
      const { data: list, error: listErr } = await supabase.storage
        .from(BUCKET)
        .list(s.id, { limit: 1000 })
      if (listErr) throw listErr
      const paths = (list ?? [])
        .filter((f) => f.name && !f.name.startsWith('.'))
        .map((f) => `${s.id}/${f.name}`)
      if (paths.length > 0) {
        const { error: rmErr } = await supabase.storage.from(BUCKET).remove(paths)
        if (rmErr) throw rmErr
      }
      const { error: delErr } = await supabase.from('logo_sketch_sets').delete().eq('id', s.id)
      if (delErr) throw delErr
      if (expandedSetId === s.id) setExpandedSetId(null)
      if (selectedSetId === s.id) setSelectedSetId('')
      if (selectedClient) await loadSets(selectedClient)
      setToast('Set deleted')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setWorking(false)
    }
  }

  // ── Create a new set ───────────────────────────────────────────────
  async function handleCreateSet() {
    if (!selectedClient) return
    const name = newSetName.trim()
    if (!name) {
      setError('Set name cannot be empty.')
      return
    }
    if (!selectedClient.projectSlug) {
      setError('This client has no active project to attach the set to.')
      return
    }
    setCreating(true)
    setError(null)
    try {
      const nextNumber =
        sets.reduce((max, s) => Math.max(max, s.set_number), 0) + 1
      const { data, error: err } = await supabase
        .from('logo_sketch_sets')
        .insert({
          client_id: selectedClient.profileId,
          project_slug: selectedClient.projectSlug,
          name,
          set_number: nextNumber,
          total_count: 0,
        })
        .select('id, name, set_number, total_count, created_at')
        .single()
      if (err) throw err
      setNewSetName('')
      await loadSets(selectedClient)
      if (data) setSelectedSetId((data as SketchSet).id)
      setToast(`Set "${name}" created.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setCreating(false)
    }
  }

  // ── File selection ─────────────────────────────────────────────────
  function handleFiles(list: FileList | null) {
    setToast(null)
    setError(null)
    if (!list) {
      setFiles([])
      return
    }
    const picked = Array.from(list)
    if (picked.length > MAX_FILES) {
      setError(`You can upload up to ${MAX_FILES} files at a time. Using the first ${MAX_FILES}.`)
      setFiles(picked.slice(0, MAX_FILES))
    } else {
      setFiles(picked)
    }
  }

  // ── Upload to the selected set ─────────────────────────────────────
  async function handleUpload() {
    if (!selectedSet || !selectedClient || files.length === 0) return
    setUploading(true)
    setProgress(0)
    setError(null)
    setToast(null)
    let uploaded = 0
    const failures: string[] = []
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(`${selectedSet.id}/${file.name}`, file, {
            upsert: true,
            contentType: file.type,
          })
        if (upErr) {
          failures.push(`${file.name}: ${upErr.message}`)
        } else {
          uploaded++
        }
        setProgress((i + 1) / files.length)
      }

      if (uploaded > 0) {
        // Recount the actual files in storage and set total_count to that, so
        // re-uploading an existing filename (upsert) never double-counts.
        const { data: list, error: listErr } = await supabase.storage
          .from(BUCKET)
          .list(selectedSet.id, { limit: 1000 })
        if (listErr) throw listErr
        const actualCount = (list ?? []).filter(
          (f) => f.name && !f.name.startsWith('.')
        ).length
        const { error: updErr } = await supabase
          .from('logo_sketch_sets')
          .update({ total_count: actualCount })
          .eq('id', selectedSet.id)
        if (updErr) throw updErr
        await loadSets(selectedClient)
        setToast(`${uploaded} sketches uploaded to ${selectedSet.name ?? `Set ${selectedSet.set_number}`}`)
      }
      if (failures.length > 0) {
        setError(`${failures.length} file(s) failed. ${failures[0]}`)
      }
      setFiles([])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setUploading(false)
    }
  }

  const setLabel = (s: SketchSet) => s.name ?? `Set ${s.set_number}`

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <main style={styles.container}>
        <header style={styles.headerBlock}>
          <h1 style={styles.title}>Upload logo sketches</h1>
          <p style={styles.subtitle}>
            Pick a client, create a set, then upload the sketches for them to review.
          </p>
        </header>

        {error && <div style={styles.error}>{error}</div>}
        {toast && <div style={styles.toast}>{toast}</div>}

        {/* Section 1 — Select client */}
        <section style={styles.card}>
          <h2 style={styles.h2}>1. Select client</h2>
          {loadingClients ? (
            <p style={styles.muted}>Loading clients...</p>
          ) : clients.length === 0 ? (
            <p style={styles.muted}>No clients with active projects.</p>
          ) : (
            <select
              value={selectedClientId}
              onChange={(e) => handleClientChange(e.target.value)}
              style={styles.select}
            >
              <option value="">Choose a client...</option>
              {clients.map((c) => (
                <option key={c.clientId} value={c.clientId}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </section>

        {/* Section 2 — Create new set */}
        {selectedClient && (
          <section style={styles.card}>
            <h2 style={styles.h2}>2. Create new set</h2>
            <div style={styles.row}>
              <input
                type="text"
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                placeholder="Round 1 Exploration"
                style={styles.input}
              />
              <button
                type="button"
                onClick={handleCreateSet}
                disabled={creating}
                style={{ ...styles.btn, ...styles.btnPrimary, opacity: creating ? 0.6 : 1 }}
              >
                {creating ? 'Creating...' : 'Create Set'}
              </button>
            </div>
          </section>
        )}

        {/* Section 3 — Upload to set */}
        {selectedClient && (
          <section style={styles.card}>
            <h2 style={styles.h2}>3. Upload to set</h2>

            {loadingSets ? (
              <p style={styles.muted}>Loading sets...</p>
            ) : sets.length === 0 ? (
              <p style={styles.muted}>No sets yet. Create one above to get started.</p>
            ) : (
              <div style={styles.setList}>
                {sets.map((s) => {
                  const active = s.id === selectedSetId
                  const expanded = s.id === expandedSetId
                  return (
                    <div
                      key={s.id}
                      style={{
                        ...styles.setCard,
                        borderColor: active ? tokens.accent : tokens.border,
                        boxShadow: active ? `0 0 0 1px ${tokens.accent}` : 'none',
                      }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleExpand(s)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            toggleExpand(s)
                          }
                        }}
                        style={styles.setHeader}
                      >
                        <div style={styles.setHeaderText}>
                          <span style={styles.setName}>{setLabel(s)}</span>
                          <span style={styles.setMeta}>
                            {s.total_count} {s.total_count === 1 ? 'sketch' : 'sketches'} · {formatDate(s.created_at)}
                          </span>
                        </div>
                        {expanded ? (
                          <ChevronUp size={18} style={styles.chevron} />
                        ) : (
                          <ChevronDown size={18} style={styles.chevron} />
                        )}
                      </div>

                      {expanded && (
                        <div style={styles.expandPanel}>
                          {thumbsLoading ? (
                            <div style={styles.spinnerWrap}>
                              <div style={styles.spinner} />
                            </div>
                          ) : thumbs.length === 0 ? (
                            <p style={styles.muted}>No sketches in this set yet.</p>
                          ) : (
                            <div className="sketch-thumb-grid">
                              {thumbs.map((t) => (
                                <div key={t.name} style={styles.thumbCell}>
                                  <div style={styles.thumbWrap}>
                                    <img src={t.url} alt={t.name} style={styles.thumbImg} />
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteFile(s, t.name)}
                                      disabled={working}
                                      style={styles.thumbDelete}
                                      aria-label={`Delete ${t.name}`}
                                    >
                                      ×
                                    </button>
                                  </div>
                                  <span style={styles.thumbName}>{t.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteSet(s)}
                            disabled={working}
                            style={styles.deleteSetBtn}
                          >
                            Delete set
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {selectedSet && (
              <div style={styles.uploadBlock}>
                <label style={styles.fileLabel}>
                  <input
                    type="file"
                    accept={ACCEPT}
                    multiple
                    onChange={(e) => handleFiles(e.target.files)}
                    style={styles.fileInput}
                  />
                  <span style={styles.fileButton}>Choose images</span>
                  {files.length > 0 && (
                    <span style={styles.countBadge}>
                      {files.length} {files.length === 1 ? 'file' : 'files'} selected
                    </span>
                  )}
                </label>

                {uploading && (
                  <div style={styles.track}>
                    <div style={{ ...styles.fill, width: `${Math.round(progress * 100)}%` }} />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading || files.length === 0}
                  style={{
                    ...styles.btn,
                    ...styles.btnPrimary,
                    width: '100%',
                    opacity: uploading || files.length === 0 ? 0.6 : 1,
                  }}
                >
                  {uploading ? 'Uploading...' : `Upload to ${setLabel(selectedSet)}`}
                </button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: tokens.bg, // Atelier cream
    color: tokens.text,
    fontFamily: fonts.body,
  },
  container: { maxWidth: 672, margin: '0 auto', padding: '40px 24px 80px' },

  headerBlock: { marginBottom: 28 },
  title: {
    margin: 0,
    fontFamily: fonts.heading,
    fontSize: 28,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: tokens.text,
  },
  subtitle: { margin: '8px 0 0', fontSize: 15, color: tokens.textMuted, lineHeight: '22px' },

  card: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    padding: 22,
    marginBottom: 16,
  },
  h2: {
    margin: '0 0 14px',
    fontSize: 12,
    fontWeight: 600,
    color: tokens.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  row: { display: 'flex', gap: 10, alignItems: 'stretch', flexWrap: 'wrap' },
  select: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 8,
    border: `1px solid ${tokens.border}`,
    background: tokens.inputBg,
    color: tokens.text,
    fontSize: 14,
    fontFamily: fonts.body,
    cursor: 'pointer',
  },
  input: {
    flex: 1,
    minWidth: 200,
    padding: '11px 14px',
    borderRadius: 8,
    border: `1px solid ${tokens.border}`,
    background: tokens.inputBg,
    color: tokens.text,
    fontSize: 14,
    fontFamily: fonts.body,
  },

  btn: {
    padding: '11px 18px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: fonts.body,
    cursor: 'pointer',
    border: '1px solid transparent',
    whiteSpace: 'nowrap',
  },
  btnPrimary: { background: tokens.primary, color: tokens.surface },

  setList: { display: 'flex', flexDirection: 'column', gap: 10 },
  setCard: {
    background: tokens.bg,
    border: `1px solid ${tokens.border}`,
    borderRadius: 10,
    overflow: 'hidden',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  setHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '14px 16px',
    cursor: 'pointer',
  },
  setHeaderText: { display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left' },
  chevron: { color: tokens.textMuted, flexShrink: 0 },
  setName: {
    fontFamily: fonts.heading,
    fontSize: 16,
    fontWeight: 600,
    color: tokens.text,
  },
  setMeta: { fontSize: 12, color: tokens.textMuted },

  expandPanel: {
    padding: '0 16px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  thumbCell: { display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' },
  thumbWrap: { position: 'relative', width: 80, height: 80 },
  thumbImg: {
    width: 80,
    height: 80,
    objectFit: 'cover',
    borderRadius: 8,
    border: `1px solid ${tokens.border}`,
    display: 'block',
  },
  thumbDelete: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: '50%',
    border: 'none',
    background: tokens.ruby,
    color: tokens.surface,
    fontSize: 13,
    lineHeight: 1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  thumbName: {
    fontSize: 10,
    color: tokens.textMuted,
    maxWidth: 80,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'center',
  },
  spinnerWrap: { display: 'flex', justifyContent: 'center', padding: '16px 0' },
  spinner: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    border: `2.5px solid ${tokens.tealLight}`,
    borderTopColor: tokens.accent,
    animation: 'spin 0.8s linear infinite',
  },
  deleteSetBtn: {
    alignSelf: 'flex-start',
    background: 'transparent',
    border: 'none',
    color: tokens.ruby,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: fonts.body,
    cursor: 'pointer',
    padding: 0,
  },

  uploadBlock: {
    marginTop: 18,
    paddingTop: 18,
    borderTop: `1px solid ${tokens.border}`,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  fileLabel: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  fileInput: { display: 'none' },
  fileButton: {
    display: 'inline-block',
    padding: '10px 16px',
    borderRadius: 8,
    border: `1px solid ${tokens.accent}`,
    color: tokens.primary,
    background: tokens.tealLight,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  countBadge: {
    background: tokens.goldLight,
    color: tokens.goldDark,
    borderRadius: 999,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 600,
  },

  track: { height: 8, borderRadius: 999, background: tokens.tealLight, overflow: 'hidden' },
  fill: { height: '100%', background: tokens.accent, borderRadius: 999, transition: 'width 0.2s ease' },

  muted: { color: tokens.textMuted, fontSize: 14, margin: 0 },
  toast: {
    background: tokens.greenLight,
    color: tokens.green,
    padding: '12px 14px',
    borderRadius: 8,
    fontSize: 13,
    border: `1px solid ${tokens.green}33`,
    marginBottom: 16,
  },
  error: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    padding: '12px 14px',
    borderRadius: 8,
    fontSize: 13,
    border: `1px solid ${tokens.ruby}33`,
    marginBottom: 16,
  },
}
