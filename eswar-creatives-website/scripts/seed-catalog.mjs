// Phase 2 — Atelier services catalog seed.
// Run via: npm run seed:catalog
// Uses the Supabase secret key (admin) so RLS is bypassed.
// Idempotent: re-running updates existing rows with latest copy/prices.
//
// Two services, three tiers each:
//   Brand Identity        (vertical: brand_identity, INR, paise)
//   SaaS Design Systems   (vertical: saas_design,    USD, cents)

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SECRET_KEY   = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !SECRET_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY in .env')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ────────────────────────────────────────────────────────────────────
// Catalog data. Prices are integers in the smallest currency unit.
//   INR: paise (₹25,000 → 2,500,000)
//   USD: cents ($2,500 → 250,000)
// ────────────────────────────────────────────────────────────────────

const CATALOG = [
  {
    name: 'Brand Identity',
    slug: 'brand-identity',
    vertical: 'brand_identity',
    description: 'End-to-end visual identity systems for businesses that mean to last — from the core mark to manufactured application.',
    tagline: 'Identities built to last a generation.',
    tiers: [
      {
        tier_name: 'Foundation',
        tier_description: 'The core identity — logo, colour system, and typography. Everything you need to start showing up consistently.',
        sort_order: 1,
        starting_price_cents: 2_500_000, // ₹25,000
        currency: 'INR',
        is_recommended: false,
        features: [
          'Primary logo + monogram + variations',
          'Colour system (primary, secondary, neutrals)',
          'Typography pairing (display + body)',
          'Lock-up rules and clear-space sheet',
          'Logo files in all production formats',
        ],
      },
      {
        tier_name: 'Professional',
        tier_description: 'Foundation, plus the day-to-day collateral that makes a brand feel finished — guidelines, business cards, social, letterhead.',
        sort_order: 2,
        starting_price_cents: 5_500_000, // ₹55,000
        currency: 'INR',
        is_recommended: true,
        features: [
          'Everything in Foundation',
          'Brand guidelines (digital PDF + Notion handoff)',
          'Business card + letterhead design',
          'Email signature + Zoom background',
          'Social profile kit (LinkedIn, Instagram, X)',
          'Two rounds of revision per deliverable',
        ],
      },
      {
        tier_name: 'Complete',
        tier_description: 'The full brand suite — signage, vehicle livery, packaging-ready files, and a launch toolkit for press and partners.',
        sort_order: 3,
        starting_price_cents: 9_500_000, // ₹95,000
        currency: 'INR',
        is_recommended: false,
        features: [
          'Everything in Professional',
          'Signage system (interior + exterior)',
          'Vehicle branding (livery templates)',
          'Packaging / collateral application sheet',
          'Brand launch toolkit (press, partners, internal)',
          'Three rounds of revision per deliverable',
        ],
      },
    ],
  },
  {
    name: 'SaaS Design Systems',
    slug: 'saas-design-systems',
    vertical: 'saas_design',
    description: 'Design systems for SaaS teams that need to scale — tokens, components, governance, and the documentation to keep it all from drifting.',
    tagline: 'Tokens, components, governance — built to outlast a rewrite.',
    tiers: [
      {
        tier_name: 'Sprint',
        tier_description: 'Audit-led foundation. UX audit feeds directly into a tokenised system and the 20 components your team uses most.',
        sort_order: 1,
        starting_price_cents: 250_000, // $2,500
        currency: 'USD',
        is_recommended: false,
        features: [
          'UX audit with prioritised findings',
          'Token architecture (color, spacing, type)',
          '20 core components in Figma',
          'Variant + state coverage per component',
          'Handoff in your existing repo conventions',
        ],
      },
      {
        tier_name: 'Scale',
        tier_description: 'Sprint, expanded into a production-ready library with documentation and the developer handoff specs your engineering team can build against.',
        sort_order: 2,
        starting_price_cents: 550_000, // $5,500
        currency: 'USD',
        is_recommended: true,
        features: [
          'Everything in Sprint',
          'Full component library (60+ components)',
          'Documentation site (Storybook or equivalent)',
          'Developer handoff specs per component',
          'Accessibility checks (WCAG 2.2 AA)',
          'Design QA across two release cycles',
        ],
      },
      {
        tier_name: 'Enterprise',
        tier_description: 'Cross-platform system with governance, versioning, and three months of ongoing support to keep adoption from regressing.',
        sort_order: 3,
        starting_price_cents: 1_200_000, // $12,000
        currency: 'USD',
        is_recommended: false,
        features: [
          'Everything in Scale',
          'Cross-platform parity (Web + iOS + Android)',
          'Governance model (proposal, review, release)',
          'Semantic token versioning strategy',
          '3-month support retainer (hours-based)',
          'Quarterly design system health audit',
        ],
      },
    ],
  },
]

// ────────────────────────────────────────────────────────────────────
// Upsert helpers.
// service_tiers has no unique constraint on (service_id, tier_name),
// so we look up then insert-or-update explicitly.
// ────────────────────────────────────────────────────────────────────

async function upsertService(svc) {
  const { data, error } = await admin
    .from('services')
    .upsert(
      {
        name:        svc.name,
        slug:        svc.slug,
        vertical:    svc.vertical,
        description: svc.description,
        tagline:     svc.tagline,
        is_active:   true,
      },
      { onConflict: 'slug' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

async function upsertTier(serviceId, tier) {
  const { data: existing, error: lookupErr } = await admin
    .from('service_tiers')
    .select('id')
    .eq('service_id', serviceId)
    .eq('tier_name',  tier.tier_name)
    .maybeSingle()
  if (lookupErr) throw lookupErr

  const row = {
    service_id:           serviceId,
    tier_name:            tier.tier_name,
    tier_description:     tier.tier_description,
    sort_order:           tier.sort_order,
    starting_price_cents: tier.starting_price_cents,
    currency:             tier.currency,
    features:             tier.features,
    is_recommended:       tier.is_recommended,
  }

  if (existing) {
    const { data, error } = await admin
      .from('service_tiers')
      .update(row)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return { tier: data, action: 'updated' }
  }

  const { data, error } = await admin
    .from('service_tiers')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return { tier: data, action: 'inserted' }
}

async function main() {
  console.log('Seeding Atelier catalog (Phase 2)...\n')

  for (const svc of CATALOG) {
    const service = await upsertService(svc)
    console.log(`Service: ${service.name.padEnd(22)} (${service.vertical})`)
    for (const t of svc.tiers) {
      const { action } = await upsertTier(service.id, t)
      const price = t.currency === 'INR'
        ? `₹${(t.starting_price_cents / 100).toLocaleString('en-IN')}`
        : `$${(t.starting_price_cents / 100).toLocaleString('en-US')}`
      const rec = t.is_recommended ? ' ★ recommended' : ''
      console.log(`  └─ ${t.tier_name.padEnd(12)} ${price.padStart(10)}  [${action}]${rec}`)
    }
    console.log('')
  }

  console.log('--- CATALOG SEED COMPLETE ---')
}

main().catch(err => {
  console.error('\nSEED FAILED:', err)
  process.exit(1)
})
