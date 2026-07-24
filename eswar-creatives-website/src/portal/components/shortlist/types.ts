// Shared types for the Smart Shortlist tab (Section A-D) and its sub-components.
export type Vertical = 'design_systems' | 'branding'

export const VERTICAL_LABELS: Record<Vertical, string> = {
  design_systems: 'Design Systems',
  branding: 'Branding',
}

export type ICPConfig = {
  id: string
  vertical: Vertical
  icp_text: string | null
  goal_text: string | null
  icp_attachment_url: string | null
  goal_attachment_url: string | null
  updated_at: string
}

export type RunStatus = 'processing' | 'complete' | 'archived' | 'failed'

export type ShortlistRun = {
  id: string
  vertical: Vertical
  volume_email: number
  volume_linkedin: number
  status: RunStatus
  created_at: string
}

export type CandidateChannel = 'email' | 'linkedin'
export type CandidateConfidence = 'high' | 'low'
export type CandidateConnectionStatus = 'connected' | 'pending' | 'not_connected' | 'unknown'
export type CandidateDecision = 'pending' | 'added' | 'ignored'

export type ShortlistCandidate = {
  id: string
  run_id: string
  extracted_name: string | null
  extracted_title: string | null
  extracted_company: string | null
  extracted_linkedin_url: string | null
  channel: CandidateChannel | null
  icp_score: number | null
  confidence: CandidateConfidence
  connection_status: CandidateConnectionStatus | null
  icp_match_reason: string | null
  channel_reason: string | null
  decision: CandidateDecision
  lead_id: string | null
  created_at: string
}

// "John Doe" -> { first: "John", last: "Doe" }. "Cher" -> { first: "Cher", last: null }.
export function splitName(fullName: string | null): { first: string; last: string | null } {
  const trimmed = (fullName ?? '').trim()
  if (!trimmed) return { first: 'Unknown', last: null }
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return { first: parts[0], last: null }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

export function candidateInitials(name: string | null): string {
  const { first, last } = splitName(name)
  return ((first[0] ?? '') + (last?.[0] ?? '')).toUpperCase()
}
