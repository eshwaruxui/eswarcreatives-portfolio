// Single source for "which tenant is this build/session for" — shared by
// getTenantTheme.ts (static theme lookup) and useTenantConfig.tsx (live
// Supabase lookup) so both layers resolve the identical identifier instead
// of each hardcoding or re-deriving it separately (useTenantConfig's own
// hardcoded 'eswar' was exactly this drift, Phase 3).
//
// Unset -> defaults to 'eswar' (Tenant 0), unchanged since Phase 1. Set to
// any value, including a typo or a not-yet-provisioned tenant, is NOT
// silently corrected here — each consumer is responsible for failing
// visibly rather than falling back to a different tenant's theme or data
// when the id doesn't resolve to a real config/row. A silent fallback is a
// real data-leak risk once a second tenant exists in production.
export const ACTIVE_TENANT_ID = import.meta.env.VITE_TENANT_ID || 'eswar'
