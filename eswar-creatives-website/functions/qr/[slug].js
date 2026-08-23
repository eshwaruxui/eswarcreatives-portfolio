// Cloudflare Pages Function — resolves GET /qr/:slug.
// A printed QR code always points at this one URL forever; the destination
// it redirects to is looked up from Supabase on every scan, so the
// destination can change anytime without reprinting anything. Built after
// qr.io's free trial expired on already-printed Newgen BNI bookmarks (150
// distributed pieces with a dead QR) -- no third party, no subscription, no
// expiry risk this time.
//
// Required Cloudflare Pages env vars (plain, not secrets):
//   SUPABASE_URL      — https://urrinqwcrpivmvenupiu.supabase.co
//   SUPABASE_ANON_KEY — the public anon key (safe for browser/edge use)
//
// Unlike functions/invoice/[token].js (a crawler-only OG-tag injector that
// always passes real users straight through), every request here is a real
// redirect: fetch the row, log the scan, 302 to destination_url. There is no
// crawler branch and no SPA shell involved.

async function resolveQrCode(supabaseUrl, anonKey, slug) {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/qr_codes?slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&select=id,destination_url`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    }
  )
  if (!res.ok) {
    console.error(`[qr-worker] Supabase REST returned ${res.status} for slug ${slug}`)
    return null
  }
  const rows = await res.json()
  return rows?.[0] ?? null
}

function logScan(supabaseUrl, anonKey, qrCodeId, userAgent) {
  // Fire-and-forget from the caller's perspective (never awaited before the
  // redirect returns), but still handed to waitUntil below -- without that,
  // Cloudflare can tear down the request context as soon as the Response is
  // sent, cancelling this fetch before it completes.
  return fetch(`${supabaseUrl}/rest/v1/qr_scans`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      qr_code_id: qrCodeId,
      user_agent: userAgent ?? null,
    }),
  }).catch((err) => {
    console.error('[qr-worker] scan log failed:', err?.message ?? err)
  })
}

export async function onRequest({ params, env, request, waitUntil }) {
  const { slug } = params
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = env

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[qr-worker] Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars — set them in Cloudflare Pages → Settings → Environment variables')
    return new Response('QR code not found or inactive', { status: 404 })
  }

  let qr = null
  try {
    qr = await resolveQrCode(SUPABASE_URL, SUPABASE_ANON_KEY, slug)
  } catch (err) {
    console.error('[qr-worker] resolveQrCode threw:', err?.message ?? err)
    return new Response('QR code not found or inactive', { status: 404 })
  }

  if (!qr) {
    return new Response('QR code not found or inactive', { status: 404 })
  }

  waitUntil(logScan(SUPABASE_URL, SUPABASE_ANON_KEY, qr.id, request.headers.get('User-Agent')))

  return Response.redirect(qr.destination_url, 302)
}
