import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// ── Types ──────────────────────────────────────────────────────────
export type Vertical = 'brand_identity' | 'saas_design'
export type Currency = 'INR' | 'USD'

export interface ServiceTier {
  id: string
  service_id: string
  tier_name: string
  tier_description: string | null
  sort_order: number
  starting_price_cents: number | null
  currency: Currency | null
  features: string[]
  is_recommended: boolean
}

export interface Service {
  id: string
  name: string
  slug: string
  vertical: Vertical
  description: string | null
  tagline: string | null
  is_active: boolean
  tiers: ServiceTier[]
}

// ── Fetcher ─────────────────────────────────────────────────────────
// Reads the active service for a vertical and its tiers (sorted).
// Public-readable via the anon RLS policy added in migration 0010.
export async function fetchServiceByVertical(vertical: Vertical): Promise<Service | null> {
  const { data, error } = await supabase
    .from('services')
    .select(`
      id, name, slug, vertical, description, tagline, is_active,
      service_tiers (
        id, service_id, tier_name, tier_description, sort_order,
        starting_price_cents, currency, features, is_recommended
      )
    `)
    .eq('vertical', vertical)
    .eq('is_active', true)
    .eq('slug', vertical === 'brand_identity' ? 'brand-identity' : 'saas-design-systems')
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const tiers = ((data.service_tiers as unknown) as ServiceTier[])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)

  return {
    id:          data.id,
    name:        data.name,
    slug:        data.slug,
    vertical:    data.vertical,
    description: data.description,
    tagline:     data.tagline,
    is_active:   data.is_active,
    tiers,
  }
}

// ── Hook ────────────────────────────────────────────────────────────
type State =
  | { status: 'loading'; service: null;     error: null }
  | { status: 'ready';   service: Service;  error: null }
  | { status: 'empty';   service: null;     error: null }
  | { status: 'error';   service: null;     error: Error }

export function useService(vertical: Vertical): State {
  const [state, setState] = useState<State>({ status: 'loading', service: null, error: null })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading', service: null, error: null })
    fetchServiceByVertical(vertical)
      .then(svc => {
        if (cancelled) return
        if (!svc) setState({ status: 'empty', service: null, error: null })
        else      setState({ status: 'ready', service: svc,  error: null })
      })
      .catch(err => {
        if (cancelled) return
        setState({ status: 'error', service: null, error: err instanceof Error ? err : new Error(String(err)) })
      })
    return () => { cancelled = true }
  }, [vertical])

  return state
}

// ── Helpers ─────────────────────────────────────────────────────────
export function formatStartingPrice(cents: number, currency: Currency): string {
  const major = cents / 100
  if (currency === 'INR') return `₹${major.toLocaleString('en-IN')}`
  return `$${major.toLocaleString('en-US')}`
}
