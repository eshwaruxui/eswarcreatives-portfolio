// Client-facing Brand Visual Guide at /portal/brand. RLS on brand_visual_items
// already scopes rows to this client (published, visibility client/public), so
// the query needs no explicit client_id filter -- same pattern ClientCampaigns
// relies on for review_campaigns.
import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { type PortalProfile } from '../PortalGuard'
import { CLIENT_NAV_HEIGHT } from './ClientNav'
import { t, fonts } from '../theme'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { BrandVisualClientView, filterForPreviewAudience } from '../components/shared/BrandVisualClientView'
import { BrandVisualPublicView } from '../components/shared/BrandVisualPublicView'
import { BrandVisualPreviewBanner } from '../components/shared/BrandVisualPreviewBanner'
import type { BrandVisualCategory, BrandVisualItem } from '../utils/brandVisual'

export function BrandVisualClientPage() {
  const profile = useOutletContext<PortalProfile>()
  const { isMobile } = useBreakpoint()
  const [items, setItems] = useState<BrandVisualItem[]>([])
  const [brandLabel, setBrandLabel] = useState('Your brand')
  const [publicToken, setPublicToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewPublicCategory, setPreviewPublicCategory] = useState<BrandVisualCategory | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: client, error: cErr } = await supabase
          .from('clients')
          .select('company_name, contact_name, public_token')
          .eq('profile_id', profile.id)
          .maybeSingle()
        if (cErr) throw cErr
        if (cancelled) return
        setBrandLabel(client?.company_name || client?.contact_name || 'Your brand')
        setPublicToken(client?.public_token ?? null)

        const { data, error: iErr } = await supabase
          .from('brand_visual_items')
          .select('*')
          .order('sort_order', { ascending: true })
        if (iErr) throw iErr
        if (cancelled) return
        setItems((data ?? []) as BrandVisualItem[])
      } catch {
        if (!cancelled) setError('Could not load your Brand Visual Guide. Refresh to try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [profile.id])

  const containerStyle: CSSProperties = {
    maxWidth: 1080,
    margin: '0 auto',
    padding: `${CLIENT_NAV_HEIGHT + 40}px ${isMobile ? 16 : 24}px 80px`,
  }

  if (previewPublicCategory) {
    const previewItems = filterForPreviewAudience(items, 'public')
    return (
      <div>
        <BrandVisualPreviewBanner label="public" onExit={() => setPreviewPublicCategory(null)} />
        <BrandVisualPublicView items={previewItems} brandLabel={brandLabel} initialCategory={previewPublicCategory} />
      </div>
    )
  }

  return (
    <main style={containerStyle}>
      {loading ? (
        <p style={{ fontFamily: fonts.body, fontSize: 14, color: t.text.secondary }}>Loading...</p>
      ) : error ? (
        <p style={{ fontFamily: fonts.body, fontSize: 14, color: t.text.danger }}>{error}</p>
      ) : (
        <BrandVisualClientView
          items={items}
          brandLabel={brandLabel}
          onPreviewPublic={setPreviewPublicCategory}
          canManagePublish
          publicToken={publicToken}
          onItemUpdated={(updated) => setItems((list) => list.map((i) => (i.id === updated.id ? updated : i)))}
        />
      )}
    </main>
  )
}
