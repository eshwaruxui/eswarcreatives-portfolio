// Phase 1 seed script.
// Run via: npm run seed:phase1
// Uses the Supabase secret key (admin) so RLS is bypassed.
// Idempotent: safe to re-run; existing rows are reused.

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

const SEED = {
  owner:   { email: 'owner+phase1@eswarcreatives.in',   password: 'OwnerPhase1!',   full_name: 'Owner (Phase 1)' },
  clientA: { email: 'clienta+phase1@eswarcreatives.in', password: 'ClientAPhase1!', full_name: 'Client A',          company: 'Client A Co' },
  clientB: { email: 'clientb+phase1@eswarcreatives.in', password: 'ClientBPhase1!', full_name: 'Client B',          company: 'Client B Co' },
}

async function findUserByEmail(email) {
  let page = 1
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const found = data.users.find(u => u.email === email)
    if (found) return found
    if (data.users.length < 200) return null
    page++
  }
}

async function ensureUser({ email, password, full_name }) {
  const existing = await findUserByEmail(email)
  if (existing) return existing
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })
  if (error) throw error
  return data.user
}

async function setProfile(id, { role, full_name }) {
  const { error } = await admin.from('profiles').update({ role, full_name }).eq('id', id)
  if (error) throw error
}

async function ensureClient(profileId, info) {
  const { data, error } = await admin
    .from('clients')
    .upsert(
      {
        profile_id: profileId,
        company_name: info.company,
        contact_name: info.full_name,
        country: 'IN',
        preferred_currency: 'INR',
      },
      { onConflict: 'profile_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

async function ensureService() {
  const { data, error } = await admin
    .from('services')
    .upsert(
      {
        name: 'Brand Identity Starter',
        slug: 'brand-identity-starter',
        vertical: 'brand_identity',
        description: 'Core brand identity package',
        is_active: true,
      },
      { onConflict: 'slug' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

async function ensureTier(serviceId) {
  const { data: existing, error: e1 } = await admin
    .from('service_tiers')
    .select()
    .eq('service_id', serviceId)
    .eq('tier_name', 'Starter')
    .maybeSingle()
  if (e1) throw e1
  if (existing) return existing
  const { data, error } = await admin
    .from('service_tiers')
    .insert({ service_id: serviceId, tier_name: 'Starter', tier_description: 'Core deliverables', sort_order: 1 })
    .select()
    .single()
  if (error) throw error
  return data
}

async function ensureOrder(clientId, tierId) {
  const { data: existing, error: e1 } = await admin
    .from('orders')
    .select()
    .eq('client_id', clientId)
    .eq('service_tier_id', tierId)
    .maybeSingle()
  if (e1) throw e1
  if (existing) return existing
  const { data, error } = await admin
    .from('orders')
    .insert({ client_id: clientId, service_tier_id: tierId, status: 'in_progress' })
    .select()
    .single()
  if (error) throw error
  return data
}

async function ensureProject(orderId, clientId, title) {
  const { data: existing, error: e1 } = await admin
    .from('projects')
    .select()
    .eq('order_id', orderId)
    .maybeSingle()
  if (e1) throw e1
  if (existing) return existing
  const { data, error } = await admin
    .from('projects')
    .insert({ order_id: orderId, client_id: clientId, title, current_phase: 'Discovery', status: 'active' })
    .select()
    .single()
  if (error) throw error
  return data
}

async function ensureTimeEntry(projectId) {
  const { data: existing, error: e1 } = await admin
    .from('time_entries')
    .select()
    .eq('project_id', projectId)
    .eq('task_description', 'Phase 1 seed entry')
    .maybeSingle()
  if (e1) throw e1
  if (existing) return existing
  const { data, error } = await admin
    .from('time_entries')
    .insert({
      project_id: projectId,
      task_description: 'Phase 1 seed entry',
      task_type: 'deep',
      duration_minutes: 120,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

async function main() {
  console.log('Seeding Phase 1 data...\n')

  const ownerUser   = await ensureUser(SEED.owner)
  const clientAUser = await ensureUser(SEED.clientA)
  const clientBUser = await ensureUser(SEED.clientB)
  console.log('Auth users ready')

  await setProfile(ownerUser.id,   { role: 'owner',  full_name: SEED.owner.full_name })
  await setProfile(clientAUser.id, { role: 'client', full_name: SEED.clientA.full_name })
  await setProfile(clientBUser.id, { role: 'client', full_name: SEED.clientB.full_name })
  console.log('Profiles updated (owner promoted, clients labeled)')

  const clientA = await ensureClient(clientAUser.id, SEED.clientA)
  const clientB = await ensureClient(clientBUser.id, SEED.clientB)
  console.log('Client rows ready')

  const service = await ensureService()
  const tier    = await ensureTier(service.id)
  console.log('Service + tier ready')

  const orderA = await ensureOrder(clientA.id, tier.id)
  const orderB = await ensureOrder(clientB.id, tier.id)
  console.log('Orders ready')

  const projectA = await ensureProject(orderA.id, clientA.id, 'Client A Brand Refresh')
  const projectB = await ensureProject(orderB.id, clientB.id, 'Client B Brand Refresh')
  console.log('Projects ready')

  await ensureTimeEntry(projectA.id)
  await ensureTimeEntry(projectB.id)
  console.log('Time entries ready')

  console.log('\n--- SEED COMPLETE ---')
  console.log('Login at /portal/login with any of the following:\n')
  console.log('  OWNER     ', SEED.owner.email,   '  pw:', SEED.owner.password)
  console.log('  CLIENT A  ', SEED.clientA.email, '  pw:', SEED.clientA.password)
  console.log('  CLIENT B  ', SEED.clientB.email, '  pw:', SEED.clientB.password)
  console.log('\nIDs (for reference):')
  console.log('  client A id:', clientA.id)
  console.log('  client B id:', clientB.id)
  console.log('  project A id:', projectA.id)
  console.log('  project B id:', projectB.id)
}

main().catch(err => {
  console.error('\nSEED FAILED:', err)
  process.exit(1)
})
