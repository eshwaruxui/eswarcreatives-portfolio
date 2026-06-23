// Read-only, client-facing view of a proposal, shown inside the proposal modal
// when the "Client view" header toggle is on. It deliberately omits anything
// internal (no cost-breakdown controls, no document plumbing): just the studio
// header, phases, line items, and totals the client would actually see.
import type { CSSProperties } from 'react'
import { tokens, fonts } from '../theme'
import { mono, formatMoney } from './ui'

type PreviewItem = { title: string; scope: string; amount: number }
type PreviewPhase = { name: string; timeline: string; items: PreviewItem[] }

export function ProposalPreview({
  studioName,
  proposalNumber,
  title,
  clientName,
  companyName,
  currency,
  phases,
  subtotal,
  discountLabel,
  discountAmount,
  total,
  paymentTerms,
}: {
  studioName: string
  proposalNumber: string
  title: string
  clientName: string
  companyName: string
  currency: string
  phases: PreviewPhase[]
  subtotal: number
  discountLabel: string | null
  discountAmount: number
  total: number
  paymentTerms: string
}) {
  const visiblePhases = phases.filter((p) => p.name.trim() || p.items.length > 0)

  return (
    <div style={styles.sheet}>
      <header style={styles.header}>
        <div>
          <div style={styles.studio}>{studioName}</div>
          <div style={styles.docType}>Proposal</div>
        </div>
        <div style={styles.numberBox}>
          <span style={styles.numberLabel}>No.</span>
          <span style={styles.number}>{proposalNumber}</span>
        </div>
      </header>

      <h1 style={styles.title}>{title.trim() || 'Untitled proposal'}</h1>
      <p style={styles.preparedFor}>
        Prepared for {companyName.trim() || 'your company'}
        {clientName.trim() ? ` · ${clientName.trim()}` : ''}
      </p>

      {visiblePhases.length === 0 ? (
        <p style={styles.muted}>No phases added yet.</p>
      ) : (
        visiblePhases.map((phase, i) => (
          <section key={i} style={styles.phase}>
            <div style={styles.phaseHead}>
              <h2 style={styles.phaseName}>{phase.name.trim() || `Phase ${i + 1}`}</h2>
              {phase.timeline.trim() && <span style={styles.timeline}>{phase.timeline.trim()}</span>}
            </div>
            {phase.items.length > 0 && (
              <div style={styles.items}>
                {phase.items.map((it, j) => (
                  <div key={j} style={styles.itemRow}>
                    <div>
                      <div style={styles.itemTitle}>{it.title.trim() || 'Item'}</div>
                      {it.scope.trim() && <div style={styles.itemScope}>{it.scope.trim()}</div>}
                    </div>
                    <div style={styles.itemAmount}>{formatMoney(it.amount, currency)}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))
      )}

      <div style={styles.totals}>
        <div style={styles.totalRow}>
          <span style={styles.muted}>Subtotal</span>
          <span style={styles.totalNum}>{formatMoney(subtotal, currency)}</span>
        </div>
        {discountAmount > 0 && (
          <div style={styles.totalRow}>
            <span style={styles.muted}>{discountLabel || 'Discount'}</span>
            <span style={{ ...styles.totalNum, color: tokens.ruby }}>
              -{formatMoney(discountAmount, currency)}
            </span>
          </div>
        )}
        <div style={styles.grandRow}>
          <span style={styles.grandLabel}>Total</span>
          <span style={styles.grandNum}>{formatMoney(total, currency)}</span>
        </div>
      </div>

      {paymentTerms.trim() && (
        <div style={styles.terms}>
          <div style={styles.termsLabel}>Payment terms</div>
          <p style={styles.termsBody}>{paymentTerms.trim()}</p>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  sheet: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    padding: 32,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 20,
    borderBottom: `2px solid ${tokens.primary}`,
  },
  studio: {
    fontFamily: fonts.heading,
    fontSize: 22,
    fontWeight: 600,
    color: tokens.text,
  },
  docType: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.textMuted,
    marginTop: 2,
  },
  numberBox: { textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 2 },
  numberLabel: { fontFamily: fonts.body, fontSize: 11, color: tokens.textMuted },
  number: { fontFamily: mono, fontSize: 14, color: tokens.primary, fontWeight: 600 },
  title: {
    fontFamily: fonts.heading,
    fontSize: 26,
    fontWeight: 600,
    color: tokens.text,
    margin: '24px 0 4px',
  },
  preparedFor: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: tokens.textMuted,
    margin: '0 0 24px',
  },
  muted: { fontFamily: fonts.body, fontSize: 13, color: tokens.textMuted },
  phase: {
    marginBottom: 20,
  },
  phaseHead: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  phaseName: {
    fontFamily: fonts.heading,
    fontSize: 17,
    fontWeight: 600,
    color: tokens.text,
    margin: 0,
  },
  timeline: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.accent,
    background: tokens.tealLight,
    borderRadius: 6,
    padding: '2px 8px',
    whiteSpace: 'nowrap',
  },
  items: { display: 'flex', flexDirection: 'column' },
  itemRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    padding: '10px 0',
    borderBottom: `1px solid ${tokens.border}`,
  },
  itemTitle: { fontFamily: fonts.body, fontSize: 14, color: tokens.text, fontWeight: 500 },
  itemScope: { fontFamily: fonts.body, fontSize: 13, color: tokens.textMuted, marginTop: 2 },
  itemAmount: { fontFamily: mono, fontSize: 14, color: tokens.text, whiteSpace: 'nowrap' },
  totals: {
    marginTop: 8,
    paddingTop: 12,
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
  },
  totalNum: { fontFamily: mono, fontSize: 14, color: tokens.text },
  grandRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTop: `1px solid ${tokens.border}`,
  },
  grandLabel: { fontFamily: fonts.body, fontSize: 15, fontWeight: 600, color: tokens.text },
  grandNum: { fontFamily: mono, fontSize: 20, fontWeight: 700, color: tokens.primary },
  terms: {
    marginTop: 24,
    background: tokens.bg,
    borderRadius: 8,
    padding: 16,
  },
  termsLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    color: tokens.textMuted,
    marginBottom: 6,
  },
  termsBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.text,
    margin: 0,
    lineHeight: 1.5,
  },
}
