// Cloudflare Pages Function — intercepts GET /invoice/:token.
// For social-media crawlers: fetches invoice data from Supabase and injects
// OG meta tags into the SPA HTML shell so WhatsApp / Slack / LinkedIn
// previews show invoice details instead of the portfolio OG.
// For real users: passes the request through unchanged (no latency impact).
//
// Required Cloudflare Pages env vars (plain, not secrets):
//   SUPABASE_URL      — https://urrinqwcrpivmvenupiu.supabase.co
//   SUPABASE_ANON_KEY — the public anon key (safe for browser/edge use)

const CRAWLER_PATTERNS = [
  'whatsapp',
  'facebookexternalhit',
  'facebot',
  'twitterbot',
  'telegrambot',
  'slackbot',
  'linkedinbot',
  'googlebot',
  'bingbot',
  'applebot',
  'discordbot',
  'embedly',
  'iframely',
]

function isCrawler(ua) {
  if (!ua) return false
  const lower = ua.toLowerCase()
  return CRAWLER_PATTERNS.some((p) => lower.includes(p))
}

// Escapes the four characters that are special inside HTML attribute values.
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function fmtAmount(amount, currency) {
  const n = Number(amount)
  if (!isFinite(n)) return ''
  if (currency === 'INR') {
    return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
  }
  return currency + ' ' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function fmtDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return String(iso)
  }
}

async function fetchInvoice(supabaseUrl, anonKey, token) {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_invoice_by_token`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_token: token }),
  })
  if (!res.ok) return null
  const data = await res.json()
  // RPC returns { invoice, line_items, payments } or null for expired/invalid token.
  return data?.invoice ?? null
}

export async function onRequest({ request, env, params }) {
  const userAgent = request.headers.get('User-Agent') ?? ''

  // Non-crawlers get the raw SPA asset without any server-side processing.
  if (!isCrawler(userAgent)) {
    return env.ASSETS.fetch(request)
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = env
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return env.ASSETS.fetch(request)
  }

  // Fetch invoice data — fail silently if token is expired, invalid, or RPC errors.
  let invoice = null
  try {
    invoice = await fetchInvoice(SUPABASE_URL, SUPABASE_ANON_KEY, params.token)
  } catch {
    return env.ASSETS.fetch(request)
  }
  if (!invoice) {
    return env.ASSETS.fetch(request)
  }

  // Fetch the SPA index.html shell from the Pages static-asset service.
  const origin = new URL(request.url).origin
  const assetRes = await env.ASSETS.fetch(
    new Request(`${origin}/index.html`, { headers: { Accept: 'text/html' } })
  )
  const html = await assetRes.text()

  // Build OG values.
  // Invoice numbers are stored as EC-I-YYYY-NNN; display format is EC-YYYY-NNN.
  const displayNumber = String(invoice.invoice_number).replace(/^EC-I-/, 'EC-')
  const company = invoice.company_name || invoice.client_name || 'Client'
  const amount = fmtAmount(invoice.amount, invoice.currency)
  const due = fmtDate(invoice.due_date)
  const pageUrl = `https://www.eswarcreatives.in/invoice/${params.token}`
  const ogImage = 'https://www.eswarcreatives.in/og-invoice.png'

  const ogTitle = esc(`Invoice ${displayNumber} · ${company}`)
  const ogDesc = esc(
    due
      ? `${amount} due ${due} · Eswar Creatives`
      : `${amount} · Eswar Creatives`
  )

  const ogTags = [
    `<meta property="og:title" content="${ogTitle}" />`,
    `<meta property="og:description" content="${ogDesc}" />`,
    `<meta property="og:image" content="${ogImage}" />`,
    `<meta property="og:url" content="${pageUrl}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${ogTitle}" />`,
    `<meta name="twitter:description" content="${ogDesc}" />`,
    `<meta name="twitter:image" content="${ogImage}" />`,
  ].join('\n    ')

  const modified = html.includes('</head>')
    ? html.replace('</head>', `    ${ogTags}\n  </head>`)
    : html

  return new Response(modified, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Do not cache crawler responses — invoice status can change.
      'Cache-Control': 'no-store',
    },
  })
}
