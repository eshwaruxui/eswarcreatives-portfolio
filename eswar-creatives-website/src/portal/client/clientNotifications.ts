// Client-portal notification badge store.
//
// Why a module store and not PortalContext: the admin PortalProvider is
// admin-only, and the client routes each mount their own ClientNav with no
// shared layout to hang a provider on. This singleton survives ClientNav
// remounts across navigation, so the badge state is fetched once per login and
// shared by every client screen, exactly as the spec requires.
//
// Badge conditions are DERIVED from the source tables (per the Task 3 matrix),
// not from a notifications feed. Read-state is tracked with a per-section
// "last seen" marker in localStorage: opening a section records the time, and a
// badge only fires when the freshest qualifying signal is newer than that
// marker. So a badge clears the instant the client opens the section and does
// not reappear on the next focus-refresh. All queries rely on RLS to scope rows
// to the signed-in client (matching MockupsPage).
import { supabase } from '../../lib/supabase'

export type BadgeSection = 'projects' | 'proposals' | 'invoices' | 'mockups'
export type Badges = Record<BadgeSection, boolean>

const EMPTY: Badges = { projects: false, proposals: false, invoices: false, mockups: false }

let badges: Badges = EMPTY
let loadedFor: string | null = null
let inFlight: Promise<void> | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function seenKey(profileId: string) {
  return `ec_portal_seen_${profileId}`
}

function readSeen(profileId: string): Partial<Record<BadgeSection, string>> {
  try {
    const raw = localStorage.getItem(seenKey(profileId))
    return raw ? (JSON.parse(raw) as Partial<Record<BadgeSection, string>>) : {}
  } catch {
    return {}
  }
}

function writeSeen(profileId: string, seen: Partial<Record<BadgeSection, string>>) {
  try {
    localStorage.setItem(seenKey(profileId), JSON.stringify(seen))
  } catch {
    // localStorage unavailable (e.g. private mode): read-state simply will not persist.
  }
}

// A badge fires when a qualifying signal exists AND it is newer than the last
// time the client opened that section.
function fresh(signal: string | null, seenAt: string | undefined): boolean {
  if (!signal) return false
  if (!seenAt) return true
  return new Date(signal).getTime() > new Date(seenAt).getTime()
}

function maxIso(rows: Record<string, unknown>[], field: string): string | null {
  let max: number | null = null
  for (const r of rows) {
    const v = r[field]
    if (typeof v === 'string') {
      const t = new Date(v).getTime()
      if (!Number.isNaN(t) && (max === null || t > max)) max = t
    }
  }
  return max === null ? null : new Date(max).toISOString()
}

async function compute(profileId: string): Promise<Badges> {
  const seen = readSeen(profileId)

  // Proposals: a 'sent' proposal the client has not opened yet.
  const { data: proposalRows } = await supabase
    .from('proposals')
    .select('sent_at')
    .eq('status', 'sent')
  const proposalsSignal = maxIso((proposalRows ?? []) as Record<string, unknown>[], 'sent_at')

  // Invoices: pending/overdue and due within the next 7 days (or already past due).
  const horizonDate = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)
  const { data: invoiceRows } = await supabase
    .from('invoices')
    .select('created_at, due_date, status')
    .in('status', ['pending', 'overdue'])
  const invoiceQualifying = ((invoiceRows ?? []) as Record<string, unknown>[]).filter(
    (r) => typeof r.due_date === 'string' && r.due_date <= horizonDate
  )
  const invoicesSignal = maxIso(invoiceQualifying, 'created_at')

  // Mockups: a published set with no concept decision from this client yet.
  let mockupsSignal: string | null = null
  const { data: setRows } = await supabase
    .from('mockup_sets')
    .select('id, created_at')
    .eq('status', 'published')
  const sets = (setRows ?? []) as { id: string; created_at: string }[]
  if (sets.length > 0) {
    const { data: feedbackRows } = await supabase
      .from('mockup_feedback')
      .select('set_id')
      .in('set_id', sets.map((s) => s.id))
      .in('feedback_type', ['concept_approval', 'concept_rejection'])
      .eq('submitted_by', profileId)
    const decided = new Set(((feedbackRows ?? []) as { set_id: string }[]).map((r) => r.set_id))
    const undecided = sets.filter((s) => !decided.has(s.id)) as unknown as Record<string, unknown>[]
    mockupsSignal = maxIso(undecided, 'created_at')
  }

  // Projects: a phase change in the last 48 hours (tracked by projects.updated_at).
  const cutoff = new Date(Date.now() - 48 * 3_600_000).toISOString()
  const { data: projectRows } = await supabase
    .from('projects')
    .select('updated_at')
    .gte('updated_at', cutoff)
  const projectsSignal = maxIso((projectRows ?? []) as Record<string, unknown>[], 'updated_at')

  return {
    proposals: fresh(proposalsSignal, seen.proposals),
    invoices: fresh(invoicesSignal, seen.invoices),
    mockups: fresh(mockupsSignal, seen.mockups),
    projects: fresh(projectsSignal, seen.projects),
  }
}

export async function refreshBadges(profileId: string): Promise<void> {
  if (inFlight) return inFlight
  inFlight = (async () => {
    try {
      const next = await compute(profileId)
      const changed =
        next.proposals !== badges.proposals ||
        next.invoices !== badges.invoices ||
        next.mockups !== badges.mockups ||
        next.projects !== badges.projects
      if (changed) {
        badges = next
        emit()
      }
    } catch {
      // A failed badge fetch must never break the nav; badges stay as they were.
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

// Fetch once per login. Subsequent calls for the same profile are no-ops.
export function loadBadgesOnce(profileId: string): void {
  if (loadedFor === profileId) return
  loadedFor = profileId
  void refreshBadges(profileId)
}

// Called when the client opens a section: clears the badge immediately and
// records the time so it stays cleared across focus-refreshes.
export function markSectionRead(profileId: string, section: BadgeSection): void {
  const seen = readSeen(profileId)
  seen[section] = new Date().toISOString()
  writeSeen(profileId, seen)
  if (badges[section]) {
    badges = { ...badges, [section]: false }
    emit()
  }
}

export function subscribeBadges(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getBadges(): Badges {
  return badges
}
