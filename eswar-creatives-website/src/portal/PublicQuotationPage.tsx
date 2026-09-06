// Public quotation view — accessible without authentication.
// Reached via /quotation/:token; mirrors PublicInvoicePage.tsx /
// PublicProposalPage.tsx exactly: fetched via the get_quotation_by_token RPC
// (SECURITY DEFINER, anon-callable), which enforces the token + expiry +
// status <> 'draft' check entirely server-side — a draft quotation's token
// is never reachable here even if guessed.
//
// The RPC returns finish LABELS, never the internal code, ratio or
// multiplier, and this page has no access to those values as a result. Line
// amounts are read as persisted; nothing is recomputed here, so what the
// client sees is exactly what was quoted.
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { supabase } from '../lib/supabase'
import {
  QuotationDocument,
  type QuotationDocumentData,
  type QuotationDocumentItem,
  type FinishLabels,
} from './components/quotation/QuotationDocument'
import type { QuotationFunctionKey } from './components/quotation/quotationMath'
import { ACTIVE_TENANT_ID } from './tenant/activeTenantId'
import { t, fonts } from './theme'
import newgenLogo from '../imports/newgen-logo.svg'
import type { CSSProperties } from 'react'

type RpcItem = {
  function_key: QuotationFunctionKey
  zone_key: string | null
  zone_label: string | null
  zone_order: number
  system: string
  system_label: string | null
  label: string
  unit: string | null
  qty: number
  rate: number
  amount: number
  note: string | null
}

type TokenPayload = {
  quotation: QuotationDocumentData
  reception_finish_label: string | null
  muhurtham_finish_label: string | null
  // Already a client-facing sentence when it arrives; the RPC strips the
  // stored key, so this page has no access to the internal value.
  muhurtham_reuse_label: string | null
  items: RpcItem[]
}

export function PublicQuotationPage() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [payload, setPayload] = useState<TokenPayload | null>(null)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (!token) {
      setExpired(true)
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase.rpc('get_quotation_by_token', { p_token: token })
      if (cancelled) return
      if (error || !data) {
        setExpired(true)
      } else {
        setPayload(data as TokenPayload)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (!payload) return
    document.title = `Quotation ${payload.quotation.quotation_number} — Newgen Event Studio`
    return () => {
      document.title = 'Newgen Event Studio'
    }
  }, [payload])

  const items: QuotationDocumentItem[] = (payload?.items ?? []).map((i) => ({
    functionKey: i.function_key,
    zoneKey: i.zone_key,
    zoneLabel: i.zone_label,
    zoneOrder: i.zone_order,
    system: i.system,
    label: i.label,
    unit: i.unit,
    qty: Number(i.qty),
    rate: Number(i.rate),
    amount: Number(i.amount),
    note: i.note,
  }))

  const finishLabels: FinishLabels = {
    reception: payload?.reception_finish_label ?? null,
    muhurtham: payload?.muhurtham_finish_label ?? null,
  }

  return (
    <div style={styles.page}>
      <header style={styles.topBar} className="no-print">
        <div style={styles.topInner}>
          <img src={newgenLogo} alt="Newgen Event Studio" width={28} height={28} style={{ display: 'block' }} />
          <span style={styles.topName}>Newgen Event Studio</span>
        </div>
        {payload && (
          <button type="button" style={styles.printBtn} onClick={() => window.print()}>
            Print / Save PDF
          </button>
        )}
      </header>

      <main style={styles.main}>
        {loading && <p style={styles.muted}>Loading...</p>}

        {!loading && (expired || !payload) && (
          <div style={styles.errorCard}>
            <div style={styles.errorTitle}>This quotation link has expired</div>
            <p style={styles.errorBody}>Please contact Newgen Event Studio for an updated link.</p>
            <a href="mailto:studio@newgeneventstudio.com" style={styles.emailLink}>
              studio@newgeneventstudio.com
            </a>
          </div>
        )}

        {!loading && payload && (
          <QuotationDocument
            tenantId={ACTIVE_TENANT_ID}
            quotation={payload.quotation}
            items={items}
            finishLabels={finishLabels}
            muhurthamReuseLabel={payload.muhurtham_reuse_label ?? null}
          />
        )}
      </main>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: '#F2EFE9' },
  topBar: { background: '#fff', borderBottom: `1px solid ${t.border.default}`, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  topInner: { display: 'flex', alignItems: 'center', gap: 10 },
  topName: { fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: t.text.primary },
  printBtn: { fontFamily: fonts.body, fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 6, border: `1px solid ${t.border.default}`, background: '#fff', cursor: 'pointer', color: t.text.primary },
  main: { maxWidth: 900, margin: '24px auto', padding: '0 16px 48px' },
  muted: { fontFamily: fonts.body, fontSize: 14, color: t.text.tertiary, textAlign: 'center', padding: '48px 0' },
  errorCard: { background: '#fff', border: `1px solid ${t.border.default}`, borderRadius: 12, padding: 32, textAlign: 'center', maxWidth: 480, margin: '48px auto' },
  errorTitle: { fontFamily: fonts.heading, fontSize: 18, fontWeight: 600, color: t.text.primary, marginBottom: 8 },
  errorBody: { fontFamily: fonts.body, fontSize: 14, color: t.text.tertiary, marginBottom: 12 },
  emailLink: { fontFamily: fonts.body, fontSize: 14, color: t.text.primaryBrand, textDecoration: 'underline' },
}
