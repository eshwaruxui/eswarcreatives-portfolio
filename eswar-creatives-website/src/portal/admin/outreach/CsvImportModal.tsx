// CSV import modal for leads. Parse -> preview table -> import valid rows only.
// Headers: first_name, last_name, email, linkedin_url, company, role_title, segment, country
// Also accepts common export-tool aliases for company/role_title/linkedin_url
// (see HEADER_ALIASES) so Apollo/Sales Navigator/ZoomInfo exports resolve
// without the admin having to manually rename columns first.
import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts } from '../../theme'
import { Modal, mono } from '../ui'

type RawRow = Record<string, string>

type RowStatus = 'valid' | 'dup_email' | 'invalid_segment' | 'missing_company' | 'bad_email'

type ParsedRow = {
  raw: RawRow
  status: RowStatus
  dupLeadId?: string
  message?: string
}

const VALID_SEGMENTS = new Set(['security_ai', 'saas_product'])

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

// Alternate header names (already lowercased/underscored) that different
// export tools use for the same canonical field. "company" is the common
// break: Apollo exports "Company Name", never "Company" — without this,
// every row silently fails the "missing company" check even though the data
// is present under a different column name.
const HEADER_ALIASES: Record<string, string[]> = {
  company: ['company_name', 'organization'],
  role_title: ['title', 'job_title'],
  linkedin_url: ['person_linkedin_url'],
}

// Fills in canonical field keys from known alias columns when the canonical
// key itself is blank/absent, without touching any key the source CSV
// already populated correctly.
function resolveAliases(row: RawRow): RawRow {
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    if (row[canonical]?.trim()) continue
    const alias = aliases.find((a) => row[a]?.trim())
    if (alias) row[canonical] = row[alias]
  }
  return row
}

// RFC4180-ish single-line CSV split: handles double-quoted fields containing
// commas and escaped quotes (""). Does not handle a quoted field spanning
// multiple physical lines — rare for lead-export tools, and out of scope for
// this lightweight hand-rolled parser (would need a full-text scan instead
// of splitting by line first).
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      out.push(field)
      field = ''
    } else {
      field += ch
    }
  }
  out.push(field)
  return out.map((v) => v.trim())
}

function parseCsv(text: string): RawRow[] {
  // Normalize Windows line endings first so the last column of every row
  // doesn't end up with a trailing "\r" (breaks exact-match checks like
  // segment validation when that happens to be the last column).
  const lines = text.trim().split(/\r\n|\n/).filter(Boolean)
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'))
  return lines.slice(1).map((line) => {
    const vals = splitCsvLine(line)
    const row: RawRow = {}
    headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
    return resolveAliases(row)
  })
}

export function CsvImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void
  onImported: (count: number) => void
}) {
  const [csvText, setCsvText] = useState('')
  const [parsed, setParsed] = useState<ParsedRow[]>([])
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; reasons: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleParse() {
    const text = csvText.trim()
    if (!text) return
    setParsing(true)
    const rows = parseCsv(text)

    // Load existing emails for dup check
    const emails = rows.map((r) => (r.email ?? '').toLowerCase()).filter(Boolean)
    const { data: existing } = await supabase
      .from('leads')
      .select('id, email')
      .in('email', emails)
    const existingMap = new Map<string, string>()
    for (const row of (existing ?? [])) {
      if (row.email) existingMap.set(row.email.toLowerCase(), row.id)
    }

    const annotated: ParsedRow[] = rows.map((r) => {
      const email = (r.email ?? '').toLowerCase()
      if (!r.company?.trim()) return { raw: r, status: 'missing_company', message: 'Missing company' }
      if (r.segment && !VALID_SEGMENTS.has(r.segment)) return { raw: r, status: 'invalid_segment', message: `Invalid segment: "${r.segment}"` }
      if (email && !isValidEmail(email)) return { raw: r, status: 'bad_email', message: 'Malformed email' }
      if (email && existingMap.has(email)) return { raw: r, status: 'dup_email', dupLeadId: existingMap.get(email), message: 'Duplicate email' }
      return { raw: r, status: 'valid' }
    })

    setParsed(annotated)
    setParsing(false)
  }

  async function handleImport() {
    setImporting(true)
    const valid = parsed.filter((r) => r.status === 'valid')
    const skipped = parsed.filter((r) => r.status !== 'valid')

    if (valid.length > 0) {
      await supabase.from('leads').insert(
        valid.map((r) => ({
          first_name: r.raw.first_name?.trim() || 'Unknown',
          last_name: r.raw.last_name?.trim() || null,
          email: r.raw.email?.trim() || null,
          linkedin_url: r.raw.linkedin_url?.trim() || null,
          company: r.raw.company?.trim(),
          role_title: r.raw.role_title?.trim() || null,
          segment: VALID_SEGMENTS.has(r.raw.segment ?? '') ? r.raw.segment : 'saas_product',
          country: r.raw.country?.trim() || null,
          source: 'csv',
        }))
      )
    }

    const reasons = skipped.map((r) => `${r.raw.first_name ?? '?'} ${r.raw.company ?? ''}: ${r.message}`)
    setResult({ imported: valid.length, skipped: skipped.length, reasons })
    setImporting(false)
    onImported(valid.length)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setCsvText((ev.target?.result as string) ?? '')
    reader.readAsText(file)
  }

  const validCount = parsed.filter((r) => r.status === 'valid').length
  const skippedCount = parsed.filter((r) => r.status !== 'valid').length

  const statusColor = (status: RowStatus) => {
    if (status === 'valid') return tokens.green
    if (status === 'dup_email') return tokens.gold
    return tokens.ruby
  }
  const statusLabel = (r: ParsedRow) => {
    if (r.status === 'valid') return 'Valid'
    return r.message ?? r.status
  }

  return (
    <Modal title="Import leads from CSV" onClose={onClose} size="lg">
      <div style={styles.body}>
        {result ? (
          <div style={styles.resultBlock}>
            <p style={styles.resultText}>
              <strong style={{ color: tokens.green }}>{result.imported} leads imported</strong>,{' '}
              <strong style={{ color: tokens.ruby }}>{result.skipped} skipped</strong>
            </p>
            {result.reasons.length > 0 && (
              <details style={styles.reasonsDetails}>
                <summary style={styles.reasonsSummary}>Show skipped reasons ({result.reasons.length})</summary>
                <ul style={styles.reasonsList}>
                  {result.reasons.map((r, i) => <li key={i} style={styles.reasonItem}>{r}</li>)}
                </ul>
              </details>
            )}
            <button type="button" style={styles.primaryBtn} onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <p style={styles.hint}>
              Expected headers: <code style={styles.code}>first_name, last_name, email, linkedin_url, company, role_title, segment, country</code>
            </p>
            <p style={styles.hintSecondary}>
              Also recognizes common export columns: <code style={styles.code}>Company Name</code>, <code style={styles.code}>Title</code>, <code style={styles.code}>Person Linkedin Url</code> (e.g. Apollo).
            </p>
            <div style={styles.uploadRow}>
              <button type="button" style={styles.outlineBtn} onClick={() => fileRef.current?.click()}>
                Upload .csv file
              </button>
              <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleFileChange} />
            </div>
            <textarea
              style={styles.textarea}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={6}
              placeholder="Or paste CSV text here..."
            />
            {parsed.length === 0 ? (
              <button
                type="button"
                style={{ ...styles.primaryBtn, opacity: (!csvText.trim() || parsing) ? 0.5 : 1 }}
                onClick={handleParse}
                disabled={!csvText.trim() || parsing}
              >
                {parsing ? 'Parsing...' : 'Parse CSV'}
              </button>
            ) : (
              <>
                <div style={styles.previewStats}>
                  <span style={{ color: tokens.green, fontFamily: mono, fontSize: 13 }}>{validCount} valid</span>
                  {skippedCount > 0 && (
                    <span style={{ color: tokens.ruby, fontFamily: mono, fontSize: 13 }}>{skippedCount} skipped</span>
                  )}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Name</th>
                        <th style={styles.th}>Company</th>
                        <th style={styles.th}>Email</th>
                        <th style={styles.th}>Segment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.map((r, i) => (
                        <tr key={i}>
                          <td style={styles.td}>
                            <span style={{ ...styles.statusDot, background: statusColor(r.status) }} />
                            <span style={{ fontFamily: fonts.body, fontSize: 12, color: t.text.secondary }}>
                              {statusLabel(r)}
                            </span>
                          </td>
                          <td style={styles.td}>{r.raw.first_name} {r.raw.last_name}</td>
                          <td style={styles.td}>{r.raw.company}</td>
                          <td style={styles.td}>{r.raw.email}</td>
                          <td style={styles.td}>{r.raw.segment}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={styles.footer}>
                  <button type="button" style={styles.cancelBtn} onClick={() => { setParsed([]); setCsvText('') }}>
                    Reset
                  </button>
                  <button
                    type="button"
                    style={{ ...styles.primaryBtn, opacity: (validCount === 0 || importing) ? 0.5 : 1 }}
                    onClick={handleImport}
                    disabled={validCount === 0 || importing}
                  >
                    {importing ? 'Importing...' : `Import ${validCount} valid row${validCount !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

const styles: Record<string, CSSProperties> = {
  body: { display: 'flex', flexDirection: 'column', gap: 16 },
  hint: { fontFamily: fonts.body, fontSize: 13, color: t.text.secondary, margin: 0 },
  hintSecondary: { fontFamily: fonts.body, fontSize: 12, color: t.text.muted, margin: 0 },
  code: { fontFamily: mono, fontSize: 12, background: t.background.muted, padding: '2px 4px', borderRadius: 4 },
  uploadRow: { display: 'flex', gap: 10 },
  textarea: {
    width: '100%',
    fontFamily: mono,
    fontSize: 12,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '10px 12px',
    outline: 'none',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
  },
  primaryBtn: {
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    padding: '10px 20px',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  outlineBtn: {
    background: tokens.surface,
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 13,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '8px 14px',
    cursor: 'pointer',
  },
  previewStats: { display: 'flex', gap: 16 },
  table: { width: '100%', borderCollapse: 'collapse' as const, minWidth: 500 },
  th: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    color: t.text.tertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
    padding: '6px 10px',
    textAlign: 'left' as const,
    borderBottom: `1px solid ${t.border.subtle}`,
  },
  td: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    padding: '8px 10px',
    borderBottom: `1px solid ${t.border.subtle}`,
    display: 'table-cell',
    verticalAlign: 'middle',
  },
  statusDot: {
    display: 'inline-block',
    width: 7,
    height: 7,
    borderRadius: '50%',
    marginRight: 6,
    verticalAlign: 'middle',
  },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: {
    background: tokens.surface,
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 14,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '9px 18px',
    cursor: 'pointer',
  },
  resultBlock: { display: 'flex', flexDirection: 'column', gap: 12 },
  resultText: { fontFamily: fonts.body, fontSize: 15, color: t.text.primary, margin: 0 },
  reasonsDetails: { fontFamily: fonts.body, fontSize: 13 },
  reasonsSummary: { color: t.text.secondary, cursor: 'pointer' },
  reasonsList: { margin: '8px 0', paddingLeft: 20 },
  reasonItem: { color: tokens.ruby, marginBottom: 4 },
}
