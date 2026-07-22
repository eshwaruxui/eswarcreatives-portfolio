// Cloudflare Pages Function — intercepts GET /invoice/:token.
// For social-media crawlers: fetches invoice data from Supabase and injects
// OG meta tags into the SPA HTML shell so WhatsApp / Slack / LinkedIn
// previews show invoice details instead of the portfolio OG.
// For real users: passes the request through unchanged (no latency impact).
//
// Required Cloudflare Pages env vars (plain, not secrets):
//   SUPABASE_URL      — https://urrinqwcrpivmvenupiu.supabase.co
//   SUPABASE_ANON_KEY — the public anon key (safe for browser/edge use)
//
// Debug: append ?og_debug=1 to any invoice URL to force OG injection
// regardless of User-Agent, so you can inspect the output in a browser.

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
  return currency + ' ' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
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
  if (!res.ok) {
    console.error(`[og-worker] Supabase RPC returned ${res.status} for token ${token}`)
    return null
  }
  const data = await res.json()
  // RPC returns { invoice, line_items, payments } or null for expired/invalid token.
  return data ?? null
}

// Serve the SPA index.html explicitly (safer than relying on _redirects inside
// env.ASSETS for paths with no corresponding static file).
function serveShell(env, request) {
  const origin = new URL(request.url).origin
  return env.ASSETS.fetch(
    new Request(`${origin}/index.html`, { headers: { Accept: 'text/html' } })
  )
}

export async function onRequest({ request, env, params }) {
  const url = new URL(request.url)
  const isDebug = url.searchParams.get('og_debug') === '1'
  const userAgent = request.headers.get('User-Agent') ?? ''

  // Non-crawlers (and non-debug) get the SPA without any server-side processing.
  if (!isCrawler(userAgent) && !isDebug) {
    return env.ASSETS.fetch(request)
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = env
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[og-worker] Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars — set them in Cloudflare Pages → Settings → Environment variables')
    return serveShell(env, request)
  }

  // Fetch invoice data — fail silently if token is expired, invalid, or RPC errors.
  let invoiceData = null
  try {
    invoiceData = await fetchInvoice(SUPABASE_URL, SUPABASE_ANON_KEY, params.token)
  } catch (err) {
    console.error('[og-worker] fetchInvoice threw:', err?.message ?? err)
    return serveShell(env, request)
  }
  if (!invoiceData?.invoice) {
    console.error(`[og-worker] No invoice found for token ${params.token}`)
    return serveShell(env, request)
  }
  const invoice = invoiceData.invoice
  const payments = invoiceData.payments ?? []

  // Fetch the SPA index.html shell from the Pages static-asset service.
  const origin = url.origin
  const assetRes = await env.ASSETS.fetch(
    new Request(`${origin}/index.html`, { headers: { Accept: 'text/html' } })
  )
  const html = await assetRes.text()

  // Build OG values.
  // Invoice numbers are stored as EC-I-YYYY-NNN; display format is EC-YYYY-NNN.
  const displayNumber = String(invoice.invoice_number).replace(/^EC-I-/, 'EC-')
  const company = invoice.company_name || invoice.client_name || 'Client'
  const due = fmtDate(invoice.due_date)
  const pageUrl = `https://www.eswarcreatives.in/invoice/${params.token}`
  const ogImage = 'https://www.eswarcreatives.in/og-invoice.png'

  // Balance due = invoice total minus any recorded payments.
  const paymentsTotal = payments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0)
  const balanceDue = Math.max(0, Number(invoice.amount) - paymentsTotal)
  const isPaid = balanceDue === 0

  const ogTitle = esc(`Invoice ${displayNumber} · ${company}`)
  const ogDesc = esc(
    isPaid
      ? 'Paid in full · Eswar Creatives'
      : due
        ? `${fmtAmount(balanceDue, invoice.currency)} due ${due} · Eswar Creatives`
        : `${fmtAmount(balanceDue, invoice.currency)} · Eswar Creatives`
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

  // Strip the SPA shell's static og:/twitter: tags first — otherwise the
  // homepage's tags stay earlier in <head> and crawlers (Facebook included)
  // read the first occurrence of each property, ignoring the ones we inject.
  const stripped = html.replace(
    /<meta\s+(?:property|name)="(?:og:|twitter:)[^"]*"[^>]*\/?>/gi,
    ''
  )

  if (!stripped.includes('</head>')) {
    console.error('[og-worker] </head> not found in index.html — injecting into <html> tag instead')
  }

  const modified = stripped.includes('</head>')
    ? stripped.replace('</head>', `    ${ogTags}\n  </head>`)
    : stripped

  // For debug requests, add a visible banner so you can confirm the function ran.
  const withDebugBanner = isDebug
    ? modified.replace(
        '<body',
        `<body data-og-debug="1" style="position:relative">\n<div style="position:fixed;top:0;left:0;right:0;background:#024C4F;color:#fff;font:600 12px/32px system-ui;padding:0 16px;z-index:99999">og-worker injected: ${esc(ogTitle)}</div`
      )
    : modified

  return new Response(withDebugBanner, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Do not cache crawler responses — invoice status can change.
      'Cache-Control': 'no-store',
    },
  })
}
