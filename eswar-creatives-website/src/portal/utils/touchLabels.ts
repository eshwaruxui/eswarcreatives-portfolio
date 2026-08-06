// Single source of truth for labeling an outreach touch to the user.
// intentLabel is the semantic read (why this touch exists), driven by
// day_offset; stepNumberLabel is the mechanical read (where it sits in
// the sequence), driven by step_number. Kept as two separate primitives
// since call sites combine them with sequence names differently — before
// this module existed, five places each reimplemented one of these and
// could silently drift out of sync with each other.

export function intentLabel(dayOffset: number | null): string {
  if (dayOffset === null) return 'Touch'
  if (dayOffset === 0) return 'First touch'
  if (dayOffset >= 5) return 'Value drop'
  return 'Follow-up'
}

// Never default an unknown step to 1 — that actively lies about progress
// (a final step 3 with no linked step_id would show as "Step 1", implying
// this is the first touch when it's actually the last).
export function stepNumberLabel(stepNumber: number | null | undefined): string {
  return stepNumber !== null && stepNumber !== undefined ? `Step ${stepNumber}` : 'Step ?'
}
