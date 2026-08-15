// Public Brand Visual Guide view — accessible without authentication.
// Reached via /brand/:token; the token is clients.public_token (migration
// 0094). Listing comes from get_brand_visual_items_by_client_token
// (SECURITY DEFINER, anon-callable, already filters to published+public
// items server-side); individual file URLs are resolved on demand by
// BrandVisualPublicView via get-brand-visual-file-url.
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import type { CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
import { t, fonts } from './theme'
import { BrandVisualPublicView } from './components/shared/BrandVisualPublicView'
import type { BrandVisualItem } from './utils/brandVisual'

type ListingPayload = {
  company_name: string | null
  contact_name: string | null
  items: BrandVisualItem[]
}

export function PublicBrandPage() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [brandLabel, setBrandLabel] = useState('')
  const [items, setItems] = useState<BrandVisualItem[]>([])
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!token) {
      setNotFound(true)
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase.rpc('get_brand_visual_items_by_client_token', { p_token: token })
      if (cancelled) return
      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const payload = data as ListingPayload
      setBrandLabel(payload.company_name || payload.contact_name || 'Brand guide')
      setItems(payload.items ?? [])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (!brandLabel) return
    document.title = `${brandLabel} — Brand Visual Guide`
    return () => {
      document.title = 'Eswar Creatives'
    }
  }, [brandLabel])

  if (loading) {
    return <div style={s.loading}>Loading...</div>
  }

  if (notFound) {
    return (
      <div style={s.errorPage}>
        <div style={s.errorCard}>
          <div style={s.errorTitle}>This link isn't available</div>
          <p style={s.errorBody}>Please contact Eswar Creatives for an updated link.</p>
          <a href="mailto:hello@eswarcreatives.in" style={s.emailLink}>
            hello@eswarcreatives.in
          </a>
        </div>
      </div>
    )
  }

  return <BrandVisualPublicView items={items} brandLabel={brandLabel} />
}

const s: Record<string, CSSProperties> = {
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: fonts.body,
    color: t.text.secondary,
  },
  errorPage: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.background.page, padding: 24 },
  errorCard: { background: t.background.surface, border: `1px solid ${t.border.default}`, borderRadius: 12, padding: 32, textAlign: 'center', maxWidth: 420 },
  errorTitle: { fontFamily: fonts.heading, fontSize: 20, fontWeight: 700, color: t.text.primary, marginBottom: 12 },
  errorBody: { fontFamily: fonts.body, fontSize: 15, color: t.text.secondary, margin: '0 0 16px', lineHeight: 1.6 },
  emailLink: { fontFamily: fonts.body, fontSize: 14, color: t.text.primaryBrand, textDecoration: 'none', fontWeight: 500 },
}
