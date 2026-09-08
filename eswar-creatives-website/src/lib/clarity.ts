// Microsoft Clarity, per tenant. Replaces the hardcoded snippet that lived
// in index.html — which carried the eswarcreatives project id into EVERY
// tenant's deployment, so a second tenant's portal sessions (holding that
// tenant's client PII) would have recorded into eswarcreatives' Clarity
// project. Now the id comes from the active tenant's own config, with a
// VITE_CLARITY_PROJECT_ID env override so a tenant's id can be set at the
// Pages project without a code change. No id -> nothing loads.
//
// Masking is defence in depth: the Clarity project's own masking mode is
// configured in the Clarity dashboard per project, AND the portal marks
// client-identifying fields with data-clarity-mask="True" at the component
// level (see QuotationBuilder / QuotationDocument), because a dashboard
// config written for a marketing site does not carry over to a portal
// whose form inputs hold client names, phone numbers, addresses and event
// dates.
import { getTenantTheme } from '../portal/tenant/getTenantTheme'

export function initClarity(): void {
  const projectId =
    (import.meta.env.VITE_CLARITY_PROJECT_ID as string | undefined) ||
    getTenantTheme()?.clarityProjectId
  if (!projectId) return
  if (document.querySelector('script[data-clarity-loader]')) return

  const w = window as unknown as Record<string, unknown>
  w.clarity =
    w.clarity ||
    function (...args: unknown[]) {
      const c = w.clarity as { q?: unknown[] }
      ;(c.q = c.q || []).push(args)
    }
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.clarity.ms/tag/${projectId}`
  s.setAttribute('data-clarity-loader', 'true')
  const first = document.getElementsByTagName('script')[0]
  if (first?.parentNode) first.parentNode.insertBefore(s, first)
  else document.head.appendChild(s)
}
