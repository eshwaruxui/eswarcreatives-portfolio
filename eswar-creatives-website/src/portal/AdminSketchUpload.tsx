import { useEffect, useRef, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router'
import { ChevronDown, ChevronUp, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { type PortalProfile } from './PortalGuard'
import { tokens, t, fonts, motionTokens } from './theme'

// NOTE: the spec referenced src/app/theme.ts, which only exists on the
// design-system branch. On phase-3-portal the portal palette lives in
// src/portal/theme.ts (cream tokens.bg, Fraunces headings, Inter body), so we
// use that here, consistent with the other portal pages.

const BUCKET = 'logo-sketches'
const MAX_FILES = 25
const ACCEPT = 'image/jpeg,image/png,image/webp'
// Sentinel client-dropdown value for "Public" (no-account voting campaign) mode.
const PUBLIC = '__public__'

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

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
  campaign_id: string | null
}

type Submission = {
  set_id: string
  client_id: string
  accepted_count: number
  passed_count: number
  completed_at: string
}

// A public voting campaign just launched (the bits we keep in state to link
// new sets and render the success card).
type LaunchedCampaign = {
  id: string
  voting_token: string
  campaign_title: string
  project_name: string
  status: string
}

// A campaign row in the admin "Public campaign responses" list.
type PublicCampaign = {
  id: string
  campaign_title: string
  project_name: string
  status: string
  voting_token: string
  created_at: string
}

// One anonymous vote, with the set name joined in for display.
type PublicVote = {
  id: string
  set_id: string
  set_name: string | null
  voter_name: string | null
  voter_age: string | null
  voter_gender: string | null
  voter_mobile: string | null
  sketch_index: number
  decision: 'pass' | 'reject'
  submitted_at: string
  archived: boolean
}

// One voter's decisions within a single set, for a response row.
type SetResponse = {
  setId: string
  setName: string
  accepted: number
  passed: number
  time: string
  votes: PublicVote[]
}

// Votes grouped by voter for the responses view.
type VoterGroup = {
  key: string
  name: string
  age: string | null
  gender: string | null
  mobile: string | null
  votes: PublicVote[]
  // True when every one of this voter's rows is archived (archive flips all rows).
  archived: boolean
}

// Which optional voter fields a campaign collects, and which are mandatory.
type FieldKey = 'name' | 'age' | 'gender' | 'mobile'

// ── Route entry: rendered inside AdminShell, which handles auth + the
// admin-only gate and passes the profile down via Outlet context. ──────
export function AdminSketchUpload() {
  const profile = useOutletContext<PortalProfile>()
  return <AdminInner profile={profile} />
}

function AdminInner({ profile }: { profile: PortalProfile }) {
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
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [orderDirty, setOrderDirty] = useState(false)
  const [setsBackup, setSetsBackup] = useState<SketchSet[] | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  // Inline set rename. renamingSetId is the row being edited; the blur-skip ref
  // stops an Escape cancel from also firing the blur commit on unmount.
  const [renamingSetId, setRenamingSetId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const skipRenameBlur = useRef(false)

  const [loadingClients, setLoadingClients] = useState(true)
  const [loadingSets, setLoadingSets] = useState(false)
  const [creating, setCreating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Accepted-sketches lightbox. `lightbox` is the set being viewed (null when
  // closed); `lightboxIndex` is null for the grid and a number for full-size.
  const [lightbox, setLightbox] = useState<{ setId: string; label: string } | null>(null)
  const [lightboxImages, setLightboxImages] = useState<{ name: string; url: string }[]>([])
  const [lightboxLoading, setLightboxLoading] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // ── Public mode: campaign settings form + launch state ─────────────
  const [campaignTitle, setCampaignTitle] = useState('')
  const [projectName, setProjectName] = useState('')
  const [collect, setCollect] = useState<Record<FieldKey, boolean>>({
    name: true, age: false, gender: false, mobile: false,
  })
  const [required, setRequired] = useState<Record<FieldKey, boolean>>({
    name: true, age: false, gender: false, mobile: false,
  })
  const [mobilePlaceholder, setMobilePlaceholder] = useState('9841085484')
  const [launching, setLaunching] = useState(false)
  const [launchedCampaign, setLaunchedCampaign] = useState<LaunchedCampaign | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  // ── Public campaign responses (Part 4) ─────────────────────────────
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([])
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null)
  const [campaignVotes, setCampaignVotes] = useState<Record<string, PublicVote[]>>({})
  const [campaignVotesLoading, setCampaignVotesLoading] = useState(false)
  const [copiedCampaignId, setCopiedCampaignId] = useState<string | null>(null)
  // Per-campaign toggle: reveal archived voter groups (hidden from the default list).
  const [showArchived, setShowArchived] = useState<Record<string, boolean>>({})
  // Per-campaign flag: archived rows have been fetched (so toggling won't refetch).
  const [archivedLoaded, setArchivedLoaded] = useState<Record<string, boolean>>({})
  // Per-voter, per-set decisions lightbox (Part 4 "View selections").
  const [voterLb, setVoterLb] = useState<
    { label: string; items: { url: string }[] } | null
  >(null)
  const [voterLbLoading, setVoterLbLoading] = useState(false)

  // Deep-link target: the Campaigns admin page links here as
  // /portal/admin/sketches?campaign=<id> to open a campaign's responses.
  const [searchParams] = useSearchParams()
  const deepLinkCampaignId = searchParams.get('campaign')
  // Honour it once, after the campaigns list has loaded.
  const deepLinkHandled = useRef(false)

  const selectedClient = clients.find((c) => c.clientId === selectedClientId) ?? null
  const selectedSet = sets.find((s) => s.id === selectedSetId) ?? null
  const isPublic = selectedClientId === PUBLIC
  // Set-creation/upload sections show for a real client, or in Public mode once
  // the campaign is launched (so its sets have a campaign_id to attach to).
  const setsEnabled = !!selectedClient || (isPublic && !!launchedCampaign)
  const campaignTitleById = Object.fromEntries(
    campaigns.map((c) => [c.id, c.campaign_title])
  ) as Record<string, string>
  const votingLink = launchedCampaign
    ? `${window.location.origin}/portal/vote/${launchedCampaign.voting_token}`
    : ''

  // ── Load clients with a non-delivered project ──────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data, error: err } = await supabase
          .from('clients')
          .select(
            'id, profile_id, company_name, contact_name, created_at, projects(slug, status, created_at)'
          )
          .order('created_at', { ascending: false })
        if (err) throw err
        if (cancelled) return

        const options: ClientOption[] = []
        for (const c of (data ?? []) as any[]) {
          const projects = (c.projects ?? []) as any[]
          const nonDelivered = projects
            .filter((p) => p.status !== 'delivered')
            .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
          // Include clients with no project yet, or with at least one non-delivered
          // project. A client whose only projects are delivered stays hidden, as before.
          if (projects.length > 0 && nonDelivered.length === 0) continue
          options.push({
            clientId: c.id,
            profileId: c.profile_id,
            name: c.contact_name || c.company_name || '(unnamed client)',
            projectSlug: nonDelivered.find((p) => p.slug)?.slug ?? null,
          })
        }
        setClients(options)
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

  // ── Load all public campaigns (admin) for the responses section ────
  useEffect(() => {
    void loadCampaigns()
  }, [])

  // ── Deep link: expand and scroll to a campaign named in ?campaign=<id>.
  // Read-only — it only opens the existing responses view, nothing new. Runs
  // once, after the matching campaign exists in the loaded list.
  useEffect(() => {
    if (deepLinkHandled.current || !deepLinkCampaignId) return
    if (!campaigns.some((c) => c.id === deepLinkCampaignId)) return
    deepLinkHandled.current = true
    setExpandedCampaignId(deepLinkCampaignId)
    if (!campaignVotes[deepLinkCampaignId]) void loadCampaignVotes(deepLinkCampaignId)
    // Let the expanded panel render before scrolling it into view.
    requestAnimationFrame(() => {
      document
        .getElementById(`campaign-${deepLinkCampaignId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns, deepLinkCampaignId])

  async function loadCampaigns() {
    try {
      const { data, error: err } = await supabase
        .from('public_campaigns')
        .select('id, campaign_title, project_name, status, voting_token, created_at')
        .order('created_at', { ascending: false })
      if (err) throw err
      setCampaigns((data ?? []) as PublicCampaign[])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function loadSets(client: ClientOption) {
    setLoadingSets(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('logo_sketch_sets')
        .select('id, name, set_number, total_count, created_at, campaign_id')
        .eq('client_id', client.profileId)
        .order('set_number', { ascending: true })
      if (err) throw err
      setSets((data ?? []) as SketchSet[])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoadingSets(false)
    }
  }

  // Sets for a launched campaign (Public mode). Mirrors loadSets but queries by
  // campaign_id, since campaign sets are not tied to a real client.
  async function loadCampaignSets(campaignId: string) {
    setLoadingSets(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('logo_sketch_sets')
        .select('id, name, set_number, total_count, created_at, campaign_id')
        .eq('campaign_id', campaignId)
        .order('set_number', { ascending: true })
      if (err) throw err
      setSets((data ?? []) as SketchSet[])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoadingSets(false)
    }
  }

  // Reload the set list for whichever mode is active.
  async function reloadSets() {
    if (isPublic && launchedCampaign) {
      await loadCampaignSets(launchedCampaign.id)
    } else if (selectedClient) {
      await loadSets(selectedClient)
    }
  }

  function handleClientChange(clientId: string) {
    setSelectedClientId(clientId)
    setSelectedSetId('')
    setSets([])
    setFiles([])
    setToast(null)
    setExpandedSetId(null)
    setSubmissions([])
    setOrderDirty(false)
    setSetsBackup(null)
    // Public mode: no client to load; the Campaign settings panel takes over.
    if (clientId === PUBLIC) return
    const client = clients.find((c) => c.clientId === clientId)
    if (client) {
      void loadSets(client)
      void loadClientSubmissions(client.profileId)
    }
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

  // Every submission this client has made, across all of their sets. Drives the
  // always-visible Submission History card below the set accordion.
  async function loadClientSubmissions(profileId: string) {
    try {
      const { data, error: err } = await supabase
        .from('logo_sketch_submissions')
        .select('set_id, client_id, accepted_count, passed_count, completed_at')
        .eq('client_id', profileId)
        .order('completed_at', { ascending: false })
      if (err) throw err
      setSubmissions((data ?? []) as Submission[])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  // ── Accepted sketches lightbox ─────────────────────────────────────
  // Reviews live per set (one set belongs to one client), so the accepted
  // sketches for a submission are just that set's rows where accepted = true.
  // We use the stored file_name to build the public URL directly.
  async function openSelections(setId: string, label: string) {
    setLightbox({ setId, label })
    setLightboxIndex(null)
    setLightboxImages([])
    setLightboxLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('logo_sketch_reviews')
        .select('sketch_index, file_name, accepted')
        .eq('set_id', setId)
        .eq('accepted', true)
        .order('sketch_index', { ascending: true })
      if (err) throw err
      const images = (data ?? [])
        .filter((r) => r.file_name)
        .map((r) => ({
          name: r.file_name as string,
          url: supabase.storage
            .from(BUCKET)
            .getPublicUrl(`${setId}/${r.file_name as string}`).data.publicUrl,
        }))
      setLightboxImages(images)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLightboxLoading(false)
    }
  }

  function closeSelections() {
    setLightbox(null)
    setLightboxIndex(null)
    setLightboxImages([])
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
      await reloadSets()
      setToast('Sketch deleted')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setWorking(false)
    }
  }

  // ── Delete an entire set and all its sketches ──────────────────────
  async function handleDeleteSet(s: SketchSet) {
    if (
      !window.confirm(`Delete ${setLabel(s)} and all its sketches? This cannot be undone.`)
    )
      return
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
      // Reviews reference the set without ON DELETE CASCADE, so clear them
      // first; submissions cascade automatically when the set row is removed.
      const { error: revErr } = await supabase
        .from('logo_sketch_reviews')
        .delete()
        .eq('set_id', s.id)
      if (revErr) throw revErr
      const { error: delErr } = await supabase.from('logo_sketch_sets').delete().eq('id', s.id)
      if (delErr) throw delErr
      if (expandedSetId === s.id) setExpandedSetId(null)
      if (selectedSetId === s.id) setSelectedSetId('')
      if (renamingSetId === s.id) setRenamingSetId(null)
      if (lightbox?.setId === s.id) closeSelections()
      await reloadSets()
      if (selectedClient) await loadClientSubmissions(selectedClient.profileId)
      setToast('Set deleted')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setWorking(false)
    }
  }

  // ── Inline set rename ──────────────────────────────────────────────
  function startRename(s: SketchSet) {
    skipRenameBlur.current = false
    setRenamingSetId(s.id)
    setRenameValue(s.name ?? `Set ${s.set_number}`)
  }

  function cancelRename() {
    skipRenameBlur.current = true
    setRenamingSetId(null)
  }

  async function commitRename(s: SketchSet) {
    if (skipRenameBlur.current) {
      skipRenameBlur.current = false
      return
    }
    const name = renameValue.trim()
    setRenamingSetId(null)
    if (!name || name === (s.name ?? '')) return
    setError(null)
    try {
      const { error: updErr } = await supabase
        .from('logo_sketch_sets')
        .update({ name })
        .eq('id', s.id)
      if (updErr) throw updErr
      setSets((prev) => prev.map((x) => (x.id === s.id ? { ...x, name } : x)))
      setToast('Set renamed')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  // ── Drag-to-reorder sets (HTML5 DnD, no library) ───────────────────
  // Reorder locally only; nothing persists until the admin presses Save.
  function handleDropOnSet(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      return
    }
    if (!orderDirty) setSetsBackup(sets) // snapshot the saved order once
    const reordered = [...sets]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(targetIndex, 0, moved)
    setSets(reordered.map((s, i) => ({ ...s, set_number: i + 1 })))
    setOrderDirty(true)
    setDragIndex(null)
  }

  async function handleSaveOrder() {
    if (!window.confirm('Save new set order?')) return
    setError(null)
    try {
      await Promise.all(
        sets.map((s) =>
          supabase.from('logo_sketch_sets').update({ set_number: s.set_number }).eq('id', s.id)
        )
      )
      setOrderDirty(false)
      setSetsBackup(null)
      setToast('Set order saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      await reloadSets() // reload true order on failure
    }
  }

  function handleCancelOrder() {
    if (setsBackup) setSets(setsBackup)
    setSetsBackup(null)
    setOrderDirty(false)
  }

  // ── Reset every review for the selected client ─────────────────────
  async function handleResetClientReviews() {
    if (!selectedClient) return
    if (
      !window.confirm(
        `Reset all sketch reviews for ${selectedClient.name}? This cannot be undone.`
      )
    )
      return
    setWorking(true)
    setError(null)
    setToast(null)
    try {
      const ids = sets.map((s) => s.id)
      if (ids.length > 0) {
        const { error: delErr } = await supabase
          .from('logo_sketch_reviews')
          .delete()
          .in('set_id', ids)
        if (delErr) throw delErr
      }
      setToast('Client reviews reset')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setWorking(false)
    }
  }

  // ── Create a new set (client mode, or campaign set in Public mode) ──
  async function handleCreateSet() {
    const name = newSetName.trim()
    if (!name) {
      setError('Set name cannot be empty.')
      return
    }
    const nextNumber = sets.reduce((max, s) => Math.max(max, s.set_number), 0) + 1
    const SELECT = 'id, name, set_number, total_count, created_at, campaign_id'

    // Public mode: campaign sets have no real client, so client_id is set to
    // the admin's own profile id (NOT NULL + FK) and project_slug to a slug from
    // the project name. Neither is used by the voter flow, which reads by
    // campaign_id; the new campaign_id is what ties the set to the campaign.
    if (isPublic) {
      if (!launchedCampaign) {
        setError('Launch the campaign first, then add its sets.')
        return
      }
      setCreating(true)
      setError(null)
      try {
        const { data, error: err } = await supabase
          .from('logo_sketch_sets')
          .insert({
            client_id: profile.id,
            project_slug: slugify(launchedCampaign.project_name) || 'campaign',
            campaign_id: launchedCampaign.id,
            name,
            set_number: nextNumber,
            total_count: 0,
          })
          .select(SELECT)
          .single()
        if (err) throw err
        setNewSetName('')
        await loadCampaignSets(launchedCampaign.id)
        if (data) setSelectedSetId((data as SketchSet).id)
        setToast(`Set "${name}" created.`)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setCreating(false)
      }
      return
    }

    // Client mode (unchanged behaviour).
    if (!selectedClient) return
    if (!selectedClient.projectSlug) {
      setError('This client has no active project to attach the set to.')
      return
    }
    setCreating(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('logo_sketch_sets')
        .insert({
          client_id: selectedClient.profileId,
          project_slug: selectedClient.projectSlug,
          name,
          set_number: nextNumber,
          total_count: 0,
        })
        .select(SELECT)
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

  // ── Launch a public voting campaign ────────────────────────────────
  async function handleLaunchCampaign() {
    const title = campaignTitle.trim()
    const project = projectName.trim()
    if (!title || !project) {
      setError('Campaign title and project name are required.')
      return
    }
    setLaunching(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('public_campaigns')
        .insert({
          campaign_title: title,
          project_name: project,
          collect_name: collect.name,
          name_required: collect.name && required.name,
          collect_age: collect.age,
          age_required: collect.age && required.age,
          collect_gender: collect.gender,
          gender_required: collect.gender && required.gender,
          collect_mobile: collect.mobile,
          mobile_required: collect.mobile && required.mobile,
          mobile_placeholder: mobilePlaceholder.trim() || null,
          status: 'active',
          created_by: profile.id,
        })
        .select('id, voting_token, campaign_title, project_name, status')
        .single()
      if (err) throw err
      setLaunchedCampaign(data as LaunchedCampaign)
      setSets([])
      setSelectedSetId('')
      setToast('Campaign launched.')
      void loadCampaigns()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLaunching(false)
    }
  }

  async function copyVotingLink() {
    if (!votingLink) return
    try {
      await navigator.clipboard.writeText(votingLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      /* clipboard unavailable; the field is selectable as a fallback */
    }
  }

  // ── Public campaign responses (Part 4) ─────────────────────────────
  function toggleCampaign(c: PublicCampaign) {
    if (expandedCampaignId === c.id) {
      setExpandedCampaignId(null)
      return
    }
    setExpandedCampaignId(c.id)
    if (!campaignVotes[c.id]) void loadCampaignVotes(c.id)
  }

  // Default load: active (non-archived) responses only. Archived rows are
  // fetched separately via loadArchivedVotes when the "Show archived" toggle is
  // turned on, so they never reappear in the default list after a refresh.
  async function loadCampaignVotes(campaignId: string) {
    setCampaignVotesLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('public_votes')
        .select(VOTE_SELECT)
        .eq('campaign_id', campaignId)
        .eq('archived', false)
        .order('voter_name', { ascending: true })
        .order('set_id', { ascending: true })
        .order('sketch_index', { ascending: true })
      if (err) throw err
      const votes = ((data ?? []) as any[]).map(mapVoteRow)
      setCampaignVotes((prev) => ({ ...prev, [campaignId]: votes }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setCampaignVotesLoading(false)
    }
  }

  // Fetch the archived rows for a campaign and merge them into the loaded votes
  // (deduped by id). Called the first time "Show archived" is turned on.
  async function loadArchivedVotes(campaignId: string) {
    setCampaignVotesLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('public_votes')
        .select(VOTE_SELECT)
        .eq('campaign_id', campaignId)
        .eq('archived', true)
        .order('voter_name', { ascending: true })
        .order('set_id', { ascending: true })
        .order('sketch_index', { ascending: true })
      if (err) throw err
      const archived = ((data ?? []) as any[]).map(mapVoteRow)
      setCampaignVotes((prev) => {
        const existing = prev[campaignId] ?? []
        const seen = new Set(existing.map((v) => v.id))
        const merged = [...existing, ...archived.filter((v) => !seen.has(v.id))]
        return { ...prev, [campaignId]: merged }
      })
      setArchivedLoaded((prev) => ({ ...prev, [campaignId]: true }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setCampaignVotesLoading(false)
    }
  }

  // Reveal/hide archived voter groups; fetch the archived rows on first reveal.
  function toggleArchived(campaignId: string) {
    const next = !showArchived[campaignId]
    setShowArchived((prev) => ({ ...prev, [campaignId]: next }))
    if (next && !archivedLoaded[campaignId]) void loadArchivedVotes(campaignId)
  }

  // Open a voter's ACCEPTED sketches for one set (decision = 'pass'): map each
  // accepted vote's sketch_index to its storage image (sets are listed name-asc,
  // the same order the voter saw).
  async function openVoterSelections(name: string, sr: SetResponse) {
    const label = `${name} · ${sr.setName}`
    setVoterLb({ label, items: [] })
    setVoterLbLoading(true)
    try {
      const { data: files } = await supabase.storage
        .from(BUCKET)
        .list(sr.setId, { limit: 1000, sortBy: { column: 'name', order: 'asc' } })
      const visible = (files ?? []).filter((f) => f.name && !f.name.startsWith('.'))
      const items = [...sr.votes]
        .filter((v) => v.decision === 'pass')
        .sort((a, b) => a.sketch_index - b.sketch_index)
        .map((v) => ({
          url: visible[v.sketch_index]
            ? supabase.storage
                .from(BUCKET)
                .getPublicUrl(`${sr.setId}/${visible[v.sketch_index].name}`).data.publicUrl
            : '',
        }))
      setVoterLb({ label, items })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setVoterLbLoading(false)
    }
  }

  async function copyCampaignLink(c: PublicCampaign) {
    const link = `${window.location.origin}/portal/vote/${c.voting_token}`
    try {
      await navigator.clipboard.writeText(link)
      setCopiedCampaignId(c.id)
      setTimeout(
        () => setCopiedCampaignId((id) => (id === c.id ? null : id)),
        2000
      )
    } catch {
      /* clipboard unavailable */
    }
  }

  // Archive or restore every row for one voter group. We target the group's
  // exact vote ids (not voter_name) so anonymous voters and repeated names are
  // handled correctly. Local state is patched in place so the list updates
  // without a refetch.
  async function setVoterArchived(campaignId: string, group: VoterGroup, archived: boolean) {
    if (archived && !window.confirm(`Archive responses from ${group.name}?`)) return
    const ids = group.votes.map((v) => v.id)
    if (ids.length === 0) return
    try {
      const { error: err } = await supabase
        .from('public_votes')
        .update({ archived })
        .in('id', ids)
      if (err) throw err
      setCampaignVotes((prev) => ({
        ...prev,
        [campaignId]: (prev[campaignId] ?? []).map((v) =>
          ids.includes(v.id) ? { ...v, archived } : v
        ),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
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
    // Public mode has no selectedClient; only a selected set + files are needed.
    if (!selectedSet || files.length === 0) return
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
        await reloadSets()
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

  const FIELD_ROWS: { key: FieldKey; label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'age', label: 'Age' },
    { key: 'gender', label: 'Gender' },
    { key: 'mobile', label: 'Mobile number' },
  ]

  function toggleCollect(key: FieldKey, on: boolean) {
    setCollect((p) => ({ ...p, [key]: on }))
    if (!on) setRequired((p) => ({ ...p, [key]: false }))
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <>
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
          <h2 style={styles.h2}>1. Select client / Public</h2>
          {loadingClients ? (
            <p style={styles.muted}>Loading clients...</p>
          ) : (
            <select
              value={selectedClientId}
              onChange={(e) => handleClientChange(e.target.value)}
              style={styles.select}
            >
              <option value="">Choose a client...</option>
              <option value={PUBLIC}>Public</option>
              {clients.map((c) => (
                <option key={c.clientId} value={c.clientId}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          {selectedClient && (
            <button
              type="button"
              onClick={handleResetClientReviews}
              disabled={working}
              style={styles.resetClientBtn}
            >
              Reset client reviews
            </button>
          )}
        </section>

        {/* Public mode — Campaign settings (above Create new set) */}
        {isPublic && (
          <section style={styles.card}>
            <h2 style={styles.h2}>Campaign settings</h2>
            {!launchedCampaign ? (
              <div style={styles.campaignForm}>
                <input
                  type="text"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  placeholder="e.g. Newgen Logo Round 1"
                  style={styles.input}
                />
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Newgen Event Makers Branding"
                  style={styles.input}
                />

                <div style={styles.fieldRows}>
                  {FIELD_ROWS.map(({ key, label }) => (
                    <div key={key} style={styles.fieldRow}>
                      <label style={styles.fieldCollect}>
                        <input
                          type="checkbox"
                          checked={collect[key]}
                          onChange={(e) => toggleCollect(key, e.target.checked)}
                        />
                        <span>{label}</span>
                      </label>
                      <label
                        style={{
                          ...styles.fieldMandatory,
                          opacity: collect[key] ? 1 : 0.4,
                          cursor: collect[key] ? 'pointer' : 'not-allowed',
                        }}
                      >
                        <input
                          type="checkbox"
                          disabled={!collect[key]}
                          checked={required[key]}
                          onChange={(e) =>
                            setRequired((p) => ({ ...p, [key]: e.target.checked }))
                          }
                        />
                        <span>Mandatory</span>
                      </label>
                    </div>
                  ))}
                  {collect.mobile && (
                    <input
                      type="text"
                      value={mobilePlaceholder}
                      onChange={(e) => setMobilePlaceholder(e.target.value)}
                      placeholder="9841085484"
                      style={{ ...styles.input, marginTop: 4 }}
                      aria-label="Mobile number placeholder"
                    />
                  )}
                </div>

                {/* H5 error prevention: disable until the required fields are
                    filled rather than only reporting the error after a click.
                    Minor (noted, not blocking): there is no in-UI control to
                    close/deactivate a campaign once launched. */}
                <button
                  type="button"
                  onClick={handleLaunchCampaign}
                  disabled={launching || !campaignTitle.trim() || !projectName.trim()}
                  style={{
                    ...styles.btn,
                    ...styles.btnPrimary,
                    width: '100%',
                    opacity:
                      launching || !campaignTitle.trim() || !projectName.trim() ? 0.6 : 1,
                  }}
                >
                  {launching ? 'Launching...' : 'Launch Campaign'}
                </button>
              </div>
            ) : (
              <div style={styles.launchSuccess}>
                <div style={styles.launchHeadRow}>
                  <h3 style={styles.launchHeading}>Campaign launched</h3>
                  <span style={styles.activeBadge}>Active</span>
                </div>
                <span style={styles.launchLinkLabel}>Voting link</span>
                <div style={styles.row}>
                  <input
                    readOnly
                    value={votingLink}
                    onFocus={(e) => e.currentTarget.select()}
                    style={styles.input}
                  />
                  <button
                    type="button"
                    onClick={copyVotingLink}
                    style={{ ...styles.btn, ...styles.btnPrimary }}
                  >
                    {copiedLink ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p style={styles.muted}>
                  Add one or more sets below and upload sketches. Sets you create
                  now are attached to this campaign.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Section 2 — Create new set */}
        {setsEnabled && (
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
        {setsEnabled && (
          <section style={styles.card}>
            <h2 style={styles.h2}>3. Upload to set</h2>

            {orderDirty && (
              <div style={styles.orderBar}>
                <span style={styles.orderBarText}>Set order changed</span>
                <div style={styles.orderBarBtns}>
                  <button type="button" onClick={handleCancelOrder} style={styles.orderCancelBtn}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleSaveOrder} style={styles.orderSaveBtn}>
                    Save order
                  </button>
                </div>
              </div>
            )}

            {loadingSets ? (
              <p style={styles.muted}>Loading sets...</p>
            ) : sets.length === 0 ? (
              <p style={styles.muted}>No sets yet. Create one above to get started.</p>
            ) : (
              <div style={styles.setList}>
                {sets.map((s, i) => {
                  const active = s.id === selectedSetId
                  const expanded = s.id === expandedSetId
                  return (
                    <div
                      key={s.id}
                      style={{
                        ...styles.setCard,
                        borderColor: active ? tokens.accent : tokens.border,
                        boxShadow: active ? `0 0 0 1px ${tokens.accent}` : 'none',
                        opacity: dragIndex === i ? 0.5 : 1,
                      }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        draggable={renamingSetId !== s.id}
                        onDragStart={() => setDragIndex(i)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDropOnSet(i)}
                        onDragEnd={() => setDragIndex(null)}
                        onClick={() => toggleExpand(s)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            toggleExpand(s)
                          }
                        }}
                        style={styles.setHeader}
                      >
                        <span style={styles.dragHandle} aria-hidden title="Drag to reorder">
                          ⠿
                        </span>
                        <div style={styles.setHeaderText}>
                          <div style={styles.setNameRow}>
                            {renamingSetId === s.id ? (
                              <input
                                autoFocus
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  e.stopPropagation()
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    ;(e.target as HTMLInputElement).blur()
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault()
                                    cancelRename()
                                  }
                                }}
                                onBlur={() => commitRename(s)}
                                style={styles.renameInput}
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  startRename(s)
                                }}
                                style={styles.setNameBtn}
                                title="Rename set"
                              >
                                {setLabel(s)}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteSet(s)
                              }}
                              disabled={working}
                              style={styles.setDeleteBtn}
                              aria-label={`Delete ${setLabel(s)}`}
                              title="Delete set"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                          <span style={styles.setMeta}>
                            {s.total_count} {s.total_count === 1 ? 'sketch' : 'sketches'} · {formatDate(s.created_at)}
                          </span>
                        </div>
                        {expanded ? (
                          <ChevronUp size={18} style={{ ...styles.chevron, ...styles.chevronOpen }} />
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

        {/* Submission history (always visible for the selected client) */}
        {selectedClient && submissions.length > 0 && (
          <section style={styles.card}>
            <h2 style={styles.historyTitle}>Submission History</h2>
            <div style={styles.historyList}>
              {groupSubmissionsByDate(submissions).map(([day, rows]) => (
                <div key={day} style={styles.historyGroup}>
                  <div style={styles.historyDate}>{day}</div>
                  {rows.map((r, ri) => {
                    const st = sets.find((x) => x.id === r.set_id)
                    const label = st ? setLabel(st) : 'Set'
                    const campaignTitle =
                      st?.campaign_id ? campaignTitleById[st.campaign_id] : null
                    return (
                      <div key={ri} style={styles.historyRow}>
                        <span style={styles.historyName}>
                          {selectedClient.name}
                          <span style={styles.historySet}>{label}</span>
                          {campaignTitle && (
                            <span style={styles.historyCampaign}>{campaignTitle}</span>
                          )}
                        </span>
                        <span style={styles.historyCounts}>
                          <span style={{ color: tokens.green }}>
                            {r.accepted_count} accepted
                          </span>
                          {' · '}
                          <span style={{ color: tokens.ruby }}>
                            {r.passed_count} passed
                          </span>
                        </span>
                        <span style={styles.historyTime}>{formatTime(r.completed_at)}</span>
                        <button
                          type="button"
                          onClick={() => openSelections(r.set_id, label)}
                          style={styles.viewSelectionsBtn}
                        >
                          View selections
                        </button>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Part 4 — Public campaign responses */}
        <section style={styles.card}>
          <h2 style={styles.historyTitle}>Public campaign responses</h2>
          {campaigns.length === 0 ? (
            <p style={styles.muted}>No campaigns yet.</p>
          ) : (
            <div style={styles.campaignList}>
              {campaigns.map((c) => {
                const open = expandedCampaignId === c.id
                const votes = campaignVotes[c.id] ?? []
                const groups = groupVotesByVoter(votes)
                const activeGroups = groups.filter((g) => !g.archived)
                const archivedGroups = groups.filter((g) => g.archived)
                const archivedShown = !!showArchived[c.id]
                const link = `${window.location.origin}/portal/vote/${c.voting_token}`
                return (
                  <div key={c.id} id={`campaign-${c.id}`} style={styles.campaignCard}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleCampaign(c)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          toggleCampaign(c)
                        }
                      }}
                      style={styles.campaignHead}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={styles.campaignName}>{c.campaign_title}</div>
                        <div style={styles.campaignProject}>{c.project_name}</div>
                      </div>
                      <div style={styles.campaignHeadRight}>
                        <span style={statusBadgeStyle(c.status)}>{c.status}</span>
                        {open ? (
                          <ChevronUp size={18} style={{ ...styles.chevron, ...styles.chevronOpen }} />
                        ) : (
                          <ChevronDown size={18} style={styles.chevron} />
                        )}
                      </div>
                    </div>

                    {open && (
                      <div style={styles.campaignBody}>
                        <div style={styles.row}>
                          <input
                            readOnly
                            value={link}
                            onFocus={(e) => e.currentTarget.select()}
                            style={styles.input}
                          />
                          <button
                            type="button"
                            onClick={() => copyCampaignLink(c)}
                            style={{ ...styles.btn, ...styles.btnPrimary }}
                          >
                            {copiedCampaignId === c.id ? 'Copied!' : 'Copy'}
                          </button>
                        </div>

                        {campaignVotesLoading && !campaignVotes[c.id] ? (
                          <p style={styles.muted}>Loading responses...</p>
                        ) : (
                          <>
                            <div style={styles.voterCountRow}>
                              <span style={styles.voterCount}>
                                {activeGroups.length} {activeGroups.length === 1 ? 'voter' : 'voters'}
                                {archivedShown && archivedGroups.length > 0 && ` (${archivedGroups.length} archived)`}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleArchived(c.id)}
                                style={styles.showArchivedToggle}
                              >
                                {archivedShown ? 'Hide archived' : 'Show archived'}
                              </button>
                            </div>
                            {activeGroups.length === 0 &&
                            !(archivedShown && archivedGroups.length > 0) ? (
                              <p style={styles.muted}>
                                {archivedShown ? 'No archived responses.' : 'No responses yet.'}
                              </p>
                            ) : (
                              <div style={styles.responseGroups}>
                                {activeGroups.map((g) => (
                                  <VoterBlock
                                    key={g.key}
                                    campaignTitle={c.campaign_title}
                                    group={g}
                                    onViewSelections={openVoterSelections}
                                    onArchive={() => void setVoterArchived(c.id, g, true)}
                                  />
                                ))}
                                {archivedShown &&
                                  archivedGroups.map((g) => (
                                    <VoterBlock
                                      key={g.key}
                                      campaignTitle={c.campaign_title}
                                      group={g}
                                      archived
                                      onViewSelections={openVoterSelections}
                                      onUnarchive={() => void setVoterArchived(c.id, g, false)}
                                    />
                                  ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <div style={styles.accountFooter}>
          <Link to="/portal/account" style={styles.accountLink}>
            Account
          </Link>
        </div>
      </main>

      {/* Accepted sketches lightbox */}
      {lightbox && (
        <div
          style={styles.lbOverlay}
          onClick={lightboxIndex === null ? closeSelections : () => setLightboxIndex(null)}
        >
          <div style={styles.lbTitle}>{lightbox.label}</div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              closeSelections()
            }}
            style={styles.lbClose}
            aria-label="Close"
          >
            <X size={22} />
          </button>

          {lightboxLoading ? (
            <div style={styles.lbSpinner} />
          ) : lightboxImages.length === 0 ? (
            <p style={styles.lbEmpty}>No accepted sketches for this set.</p>
          ) : lightboxIndex === null ? (
            <div style={styles.lbGrid} onClick={(e) => e.stopPropagation()}>
              {lightboxImages.map((img, i) => (
                <button
                  key={img.name}
                  type="button"
                  style={styles.lbThumbBtn}
                  onClick={() => setLightboxIndex(i)}
                >
                  <LightboxImg src={img.url} alt={img.name} style={styles.lbThumb} />
                </button>
              ))}
            </div>
          ) : (
            <div style={styles.lbStage} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex(
                    (i) => ((i as number) - 1 + lightboxImages.length) % lightboxImages.length
                  )
                }
                style={styles.lbNav}
                aria-label="Previous"
              >
                <ChevronLeft size={28} />
              </button>
              <LightboxImg
                src={lightboxImages[lightboxIndex].url}
                alt={lightboxImages[lightboxIndex].name}
                style={styles.lbFull}
              />
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((i) => ((i as number) + 1) % lightboxImages.length)
                }
                style={styles.lbNav}
                aria-label="Next"
              >
                <ChevronRight size={28} />
              </button>
            </div>
          )}

          {lightboxIndex !== null && lightboxImages.length > 0 && (
            <div style={styles.lbCounter}>
              {lightboxIndex + 1} / {lightboxImages.length}
            </div>
          )}
        </div>
      )}

      {/* Per-voter decisions lightbox (Part 4 "View selections") */}
      {voterLb && (
        <div style={styles.lbOverlay} onClick={() => setVoterLb(null)}>
          <div style={styles.lbTitle}>{voterLb.label}</div>
          <button
            type="button"
            onClick={() => setVoterLb(null)}
            style={styles.lbClose}
            aria-label="Close"
          >
            <X size={22} />
          </button>
          {voterLbLoading ? (
            <p style={styles.lbEmpty}>Loading accepted sketches...</p>
          ) : voterLb.items.length === 0 ? (
            <p style={styles.lbEmpty}>No accepted sketches for this set.</p>
          ) : (
            <div style={styles.lbGrid} onClick={(e) => e.stopPropagation()}>
              {voterLb.items.map((it, i) => (
                <LightboxImg key={i} src={it.url} style={styles.lbThumb} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
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

// DD MMM YYYY, e.g. 08 Jun 2026
function formatDay(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

// Group submissions into [DD MMM YYYY, rows] preserving recency order.
function groupSubmissionsByDate(subs: Submission[]): [string, Submission[]][] {
  const order: string[] = []
  const groups: Record<string, Submission[]> = {}
  for (const s of subs) {
    const day = formatDay(s.completed_at)
    if (!groups[day]) {
      groups[day] = []
      order.push(day)
    }
    groups[day].push(s)
  }
  return order.map((d) => [d, groups[d]])
}

// Split one voter's votes into per-set response rows (accepted = 'pass'
// decisions, passed = 'reject'), keeping the latest submit time per set.
function votesBySet(votes: PublicVote[]): SetResponse[] {
  const order: string[] = []
  const map: Record<string, SetResponse> = {}
  for (const v of votes) {
    if (!map[v.set_id]) {
      map[v.set_id] = {
        setId: v.set_id,
        setName: v.set_name ?? 'Set',
        accepted: 0,
        passed: 0,
        time: v.submitted_at,
        votes: [],
      }
      order.push(v.set_id)
    }
    const r = map[v.set_id]
    if (v.decision === 'pass') r.accepted++
    else r.passed++
    if (v.submitted_at > r.time) r.time = v.submitted_at
    r.votes.push(v)
  }
  return order.map((k) => map[k])
}

// Columns selected for every public_votes fetch (active and archived alike).
const VOTE_SELECT =
  'id, set_id, voter_name, voter_age, voter_gender, voter_mobile, sketch_index, decision, submitted_at, archived, logo_sketch_sets(name)'

// Map a raw public_votes row (with joined set name) to a PublicVote.
function mapVoteRow(r: any): PublicVote {
  return {
    id: r.id,
    set_id: r.set_id,
    set_name: r.logo_sketch_sets?.name ?? null,
    voter_name: r.voter_name,
    voter_age: r.voter_age,
    voter_gender: r.voter_gender,
    voter_mobile: r.voter_mobile,
    sketch_index: r.sketch_index,
    decision: r.decision,
    submitted_at: r.submitted_at,
    archived: r.archived ?? false,
  }
}

// Group votes by voter. Name + mobile keys voters apart when names repeat.
function groupVotesByVoter(votes: PublicVote[]): VoterGroup[] {
  const order: string[] = []
  const map: Record<string, VoterGroup> = {}
  for (const v of votes) {
    const key = `${v.voter_name ?? ''}|${v.voter_mobile ?? ''}`
    if (!map[key]) {
      map[key] = {
        key,
        name: v.voter_name || 'Anonymous',
        age: v.voter_age,
        gender: v.voter_gender,
        mobile: v.voter_mobile,
        votes: [],
        archived: false,
      }
      order.push(key)
    }
    map[key].votes.push(v)
  }
  return order.map((k) => {
    const g = map[k]
    g.archived = g.votes.length > 0 && g.votes.every((v) => v.archived)
    return g
  })
}

// One voter's response block: header (name + archive/unarchive action) and a
// per-set decision row each. Archived groups render faded with an Unarchive
// action instead of the trash button.
function VoterBlock({
  campaignTitle,
  group,
  archived = false,
  onViewSelections,
  onArchive,
  onUnarchive,
}: {
  campaignTitle: string
  group: VoterGroup
  archived?: boolean
  onViewSelections: (name: string, sr: SetResponse) => void
  onArchive?: () => void
  onUnarchive?: () => void
}) {
  return (
    <div style={{ ...styles.respVoter, ...(archived ? styles.respVoterArchived : null) }}>
      <div style={styles.respVoterHead}>
        <span style={styles.respVoterName}>{group.name}</span>
        {archived ? (
          <button type="button" onClick={onUnarchive} style={styles.unarchiveBtn}>
            Unarchive
          </button>
        ) : (
          <button
            type="button"
            onClick={onArchive}
            style={styles.archiveBtn}
            aria-label={`Archive responses from ${group.name}`}
            title="Archive responses"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
      {(group.age || group.gender) && (
        <div style={styles.respVoterMeta}>
          {[group.age && `Age: ${group.age}`, group.gender && `Gender: ${group.gender}`]
            .filter(Boolean)
            .join(' · ')}
        </div>
      )}
      {votesBySet(group.votes).map((sr) => (
        <div key={sr.setId} style={styles.historyRow}>
          <span style={styles.historyName}>
            <span style={styles.historySet}>
              {campaignTitle} · {sr.setName}
            </span>
          </span>
          <span style={styles.historyCounts}>
            <span style={{ color: tokens.green }}>{sr.accepted} accepted</span>
            {' · '}
            <span style={{ color: tokens.ruby }}>{sr.passed} passed</span>
          </span>
          <span style={styles.historyTime}>{formatTime(sr.time)}</span>
          <button
            type="button"
            onClick={() => onViewSelections(group.name, sr)}
            style={styles.viewSelectionsBtn}
          >
            View selections
          </button>
        </div>
      ))}
    </div>
  )
}

function statusBadgeStyle(status: string): React.CSSProperties {
  const palette: Record<string, { bg: string; fg: string }> = {
    active: { bg: tokens.greenLight, fg: tokens.green },
    draft: { bg: tokens.goldLight, fg: tokens.goldDark },
    closed: { bg: tokens.rubyLight, fg: tokens.ruby },
  }
  const c = palette[status] ?? { bg: tokens.tealLight, fg: tokens.primary }
  return {
    background: c.bg,
    color: c.fg,
    borderRadius: 999,
    padding: '3px 10px',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'capitalize',
    flexShrink: 0,
  }
}

// Lightbox image with a graceful fallback: if the storage object fails to load
// (empty URL, or a transient 403/404), show a labelled placeholder instead of
// the browser's broken-image icon.
function LightboxImg({
  src,
  alt = '',
  style,
}: {
  src: string
  alt?: string
  style: React.CSSProperties
}) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          background: tokens.tealLight,
          color: tokens.textMuted,
          fontSize: 11,
          padding: 8,
          boxSizing: 'border-box',
        }}
      >
        Image unavailable
      </div>
    )
  }
  return <img src={src} alt={alt} style={style} onError={() => setFailed(true)} />
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
  setHeaderText: { display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left', flex: 1, minWidth: 0 },
  dragHandle: {
    color: tokens.textMuted,
    cursor: 'grab',
    fontSize: 16,
    lineHeight: 1,
    flexShrink: 0,
    userSelect: 'none',
  },
  // Standing accordion chevron pattern: muted collapsed, brand expanded, fast
  // colour transition (see docs/COMPONENT_PATTERNS.md). Up/down swap is the
  // rotation here; chevronOpen applies to the expanded (up) caret.
  chevron: {
    color: t.text.muted,
    flexShrink: 0,
    transition: `color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  chevronOpen: { color: t.text.primaryBrand },
  setName: {
    fontFamily: fonts.heading,
    fontSize: 16,
    fontWeight: 600,
    color: tokens.text,
  },
  setNameRow: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 },
  setNameBtn: {
    background: 'transparent',
    border: 'none',
    padding: 0,
    margin: 0,
    fontFamily: fonts.heading,
    fontSize: 16,
    fontWeight: 600,
    color: tokens.text,
    cursor: 'text',
    textAlign: 'left',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  setDeleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: tokens.ruby,
    cursor: 'pointer',
    padding: 4,
    flexShrink: 0,
    lineHeight: 0,
  },
  renameInput: {
    flex: 1,
    minWidth: 0,
    padding: '6px 10px',
    borderRadius: 6,
    border: `1px solid ${tokens.accent}`,
    background: tokens.surface,
    color: tokens.text,
    fontFamily: fonts.heading,
    fontSize: 16,
    fontWeight: 600,
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
  accountFooter: { textAlign: 'center', marginTop: 32 },
  accountLink: { fontSize: 13, color: tokens.textMuted, textDecoration: 'underline' },

  // Reset client reviews (admin)
  resetClientBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    background: 'transparent',
    border: 'none',
    color: tokens.ruby,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: fonts.body,
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: 0,
  },

  // Save / cancel reorder bar
  orderBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '10px 14px',
    marginBottom: 12,
    borderRadius: 10,
    background: tokens.tealLight,
    border: `1px solid ${tokens.accent}`,
  },
  orderBarText: { fontSize: 13, fontWeight: 600, color: tokens.primary },
  orderBarBtns: { display: 'flex', gap: 8 },
  orderSaveBtn: {
    background: tokens.accent,
    color: tokens.surface,
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: fonts.body,
    cursor: 'pointer',
  },
  orderCancelBtn: {
    background: 'transparent',
    border: `1px solid ${tokens.border}`,
    color: tokens.primary,
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: fonts.body,
    cursor: 'pointer',
  },

  // Submission history
  historyTitle: {
    margin: '0 0 14px',
    fontSize: 11,
    fontWeight: 600,
    color: tokens.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  historyList: { display: 'flex', flexDirection: 'column', gap: 14 },
  historyGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  historyDate: { fontSize: 12, fontWeight: 600, color: tokens.text },
  historyRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
    fontSize: 13,
  },
  historyName: {
    display: 'flex',
    flexDirection: 'column',
    color: tokens.text,
    fontWeight: 500,
  },
  historySet: { fontSize: 11, fontWeight: 400, color: tokens.textMuted },
  historyCounts: { color: tokens.textMuted, fontWeight: 500 },
  historyTime: { color: tokens.textMuted, fontSize: 12 },
  viewSelectionsBtn: {
    background: 'transparent',
    border: 'none',
    color: tokens.primary, // teal
    fontSize: 12,
    fontFamily: fonts.body,
    fontWeight: 600,
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: 0,
  },

  // Accepted sketches lightbox
  lbOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.9)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  lbTitle: {
    position: 'absolute',
    top: 18,
    left: 20,
    color: tokens.surface,
    fontFamily: fonts.heading,
    fontSize: 15,
    fontWeight: 600,
  },
  lbClose: {
    position: 'absolute',
    top: 14,
    right: 16,
    background: 'transparent',
    border: 'none',
    color: tokens.surface,
    cursor: 'pointer',
    padding: 8,
    display: 'flex',
    zIndex: 2,
  },
  lbSpinner: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    border: '3px solid rgba(255, 255, 255, 0.25)',
    borderTopColor: tokens.surface,
    animation: 'spin 0.8s linear infinite',
  },
  lbEmpty: { color: tokens.surface, fontSize: 14 },
  lbGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: 12,
    width: '100%',
    maxWidth: 900,
    maxHeight: '82vh',
    overflowY: 'auto',
    padding: '8px 4px',
  },
  lbThumbBtn: { background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' },
  lbThumb: {
    width: '100%',
    aspectRatio: '1 / 1',
    objectFit: 'cover',
    borderRadius: 8,
    display: 'block',
  },
  lbStage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
    maxWidth: 1000,
  },
  lbFull: {
    maxWidth: '78vw',
    maxHeight: '82vh',
    objectFit: 'contain',
    borderRadius: 8,
  },
  lbNav: {
    background: 'rgba(255, 255, 255, 0.12)',
    border: 'none',
    color: tokens.surface,
    cursor: 'pointer',
    borderRadius: '50%',
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  lbCounter: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    color: tokens.surface,
    fontSize: 13,
  },

  // ── Public mode: campaign settings ─────────────────────────────────
  campaignForm: { display: 'flex', flexDirection: 'column', gap: 14 },
  fieldRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '14px 0',
    borderTop: `1px solid ${tokens.border}`,
    borderBottom: `1px solid ${tokens.border}`,
  },
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  fieldCollect: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    color: tokens.text,
    cursor: 'pointer',
  },
  fieldMandatory: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: tokens.textMuted,
  },
  launchSuccess: { display: 'flex', flexDirection: 'column', gap: 10 },
  launchHeadRow: { display: 'flex', alignItems: 'center', gap: 10 },
  launchHeading: {
    margin: 0,
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: 600,
    color: tokens.text,
  },
  activeBadge: {
    background: tokens.greenLight,
    color: tokens.green,
    borderRadius: 999,
    padding: '3px 10px',
    fontSize: 11,
    fontWeight: 600,
  },
  launchLinkLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: tokens.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // History campaign sub-label
  historyCampaign: { fontSize: 11, fontWeight: 500, color: tokens.accent },

  // ── Public campaign responses (Part 4) ─────────────────────────────
  campaignList: { display: 'flex', flexDirection: 'column', gap: 10 },
  campaignCard: {
    background: tokens.bg,
    border: `1px solid ${tokens.border}`,
    borderRadius: 10,
    overflow: 'hidden',
  },
  campaignHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '14px 16px',
    cursor: 'pointer',
  },
  campaignName: {
    fontFamily: fonts.heading,
    fontSize: 15,
    fontWeight: 600,
    color: tokens.text,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  campaignProject: { fontSize: 12, color: tokens.textMuted, marginTop: 2 },
  campaignHeadRight: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  campaignBody: {
    padding: '0 16px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  voterCount: { fontSize: 12, fontWeight: 600, color: tokens.text },
  voterCountRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  // Reveal/hide archived voters; ruby #C0392B per spec for the destructive set.
  showArchivedToggle: {
    background: 'transparent',
    border: 'none',
    color: '#C0392B',
    fontSize: 12,
    fontFamily: fonts.body,
    fontWeight: 600,
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: 0,
  },
  // Grouped responses (voter -> per-set rows, matching submission history)
  responseGroups: { display: 'flex', flexDirection: 'column', gap: 18, marginTop: 4 },
  respVoter: { display: 'flex', flexDirection: 'column', gap: 4 },
  respVoterArchived: { opacity: 0.55 },
  respVoterHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  respVoterName: {
    fontSize: 12,
    fontWeight: 500,
    color: tokens.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  archiveBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: '#C0392B', // ruby — destructive archive action
    cursor: 'pointer',
    padding: 4,
    flexShrink: 0,
  },
  unarchiveBtn: {
    background: 'transparent',
    border: 'none',
    color: tokens.primary, // teal
    fontSize: 12,
    fontFamily: fonts.body,
    fontWeight: 600,
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
  },
  respVoterMeta: { fontSize: 13, color: tokens.textMuted, marginBottom: 4 },
}
