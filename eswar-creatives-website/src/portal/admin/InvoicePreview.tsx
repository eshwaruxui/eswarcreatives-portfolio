// Persistent invoice preview. On desktop it is a drawer sliding in from the
// right while the invoice list stays visible and scrollable on the left; below
// 768px it becomes a bottom sheet. The document body is the shared
// InvoiceDocument, so admin and client show the exact same invoice template.
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens } from '../theme'
import { InvoiceDocument, type InvoiceLine } from '../components/shared/InvoiceDocument'
import type { CSSProperties } from 'react'

export type PreviewInvoice = {
  id: string
  invoice_number: string
  client_name: string | null
  company_name: string | null
  label: string | null
  amount: number
  currency: string
  status: string
  due_date: string | null
  notes: string | null
  created_at: string
  client_id: string | null
}

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

export function InvoicePreview({
  invoice,
  numberLabel,
  onClose,
}: {
  invoice: PreviewInvoice
  // Display-formatted invoice number. Falls back to the raw value.
  numberLabel?: string
  onClose: () => void
}) {
  const narrow = useIsNarrow()
  const [shown, setShown] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [city, setCity] = useState<string | null>(null)
  const [lines, setLines] = useState<InvoiceLine[]>([])

  // Trigger the slide-in transition once mounted.
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(t)
  }, [])

  // Itemised breakdown, if this invoice has one (0062 invoice_line_items).
  useEffect(() => {
    let cancelled = false
    setLines([])
    ;(async () => {
      const { data } = await supabase
        .from('invoice_line_items')
        .select('label, amount, sort_order')
        .eq('invoice_id', invoice.id)
        .order('sort_order', { ascending: true })
      if (cancelled || !data) return
      setLines(data.map((r) => ({ label: r.label as string, amount: Number(r.amount) })))
    })()
    return () => {
      cancelled = true
    }
  }, [invoice.id])

  // Email + city are not on the invoice row; fetch them from the linked client.
  useEffect(() => {
    let cancelled = false
    setEmail(null)
    setCity(null)
    if (!invoice.client_id) return
    ;(async () => {
      const { data } = await supabase
        .from('clients')
        .select('country, profiles(email)')
        .eq('id', invoice.client_id)
        .maybeSingle()
      if (cancelled || !data) return
      const prof = data.profiles as { email?: string } | { email?: string }[] | null
      const e = Array.isArray(prof) ? prof[0]?.email : prof?.email
      setEmail(e ?? null)
      setCity((data as { country?: string }).country ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [invoice.client_id])

  const number = numberLabel ?? invoice.invoice_number
  const company = invoice.company_name || invoice.client_name || 'Client'

  const panelStyle: CSSProperties = narrow
    ? {
        ...styles.panelBase,
        ...styles.sheet,
        transform: shown ? 'translateY(0)' : 'translateY(100%)',
      }
    : {
        ...styles.panelBase,
        ...styles.drawer,
        transform: shown ? 'translateX(0)' : 'translateX(100%)',
      }

  return (
    <>
      {/* Backdrop only on the mobile bottom sheet; the desktop drawer leaves the
          list interactive. */}
      {narrow && <div style={styles.backdrop} onClick={onClose} />}
      <aside style={panelStyle} role="dialog" aria-label={`Invoice ${number}`}>
        <button type="button" style={styles.close} onClick={onClose} aria-label="Close preview">
          <X size={18} />
        </button>

        <InvoiceDocument
          invoice={{
            number,
            status: invoice.status,
            label: invoice.label,
            amount: Number(invoice.amount),
            currency: invoice.currency,
            issuedDate: invoice.created_at,
            dueDate: invoice.due_date,
            notes: invoice.notes,
          }}
          billedTo={{
            company,
            contactName: invoice.client_name,
            email,
            city,
          }}
          lines={lines}
        />
      </aside>
    </>
  )
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10, 26, 27, 0.4)',
    zIndex: 200,
  },
  panelBase: {
    position: 'fixed',
    background: tokens.surface,
    zIndex: 201,
    boxShadow: '0 12px 48px rgba(2, 76, 79, 0.18)',
    transition: 'transform 0.28s ease',
    overflowY: 'auto',
  },
  drawer: {
    top: 0,
    right: 0,
    height: '100vh',
    width: 480,
    maxWidth: '92vw',
    borderLeft: `1px solid ${tokens.border}`,
  },
  sheet: {
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '88vh',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  close: {
    position: 'absolute',
    top: 14,
    right: 14,
    background: tokens.bg,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    color: tokens.textMuted,
    cursor: 'pointer',
    padding: 6,
    display: 'flex',
    zIndex: 1,
  },
}
