// Cloudflare Pages Function middleware — intercepts all /portal/* requests.
// For crawlers: injects portal-specific OG meta tags.
// For real users: passes through via next() with zero overhead.

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

const OG_TAGS = [
  '<meta property="og:title" content="Client Portal — Eswar Creatives" />',
  '<meta property="og:description" content="Track projects, approve proposals, and pay invoices — all in one place." />',
  '<meta property="og:image" content="https://www.eswarcreatives.in/og-portal.png" />',
  '<meta property="og:url" content="https://www.eswarcreatives.in/portal/" />',
  '<meta property="og:type" content="website" />',
  '<meta property="og:site_name" content="Eswar Creatives" />',
  '<meta name="twitter:card" content="summary_large_image" />',
  '<meta name="twitter:title" content="Client Portal — Eswar Creatives" />',
  '<meta name="twitter:description" content="Track projects, approve proposals, and pay invoices — all in one place." />',
  '<meta name="twitter:image" content="https://www.eswarcreatives.in/og-portal.png" />',
].join('\n    ')

export async function onRequest({ request, env, next }) {
  const ua = request.headers.get('User-Agent') ?? ''
  if (!isCrawler(ua)) return next()

  const origin = new URL(request.url).origin
  let html
  try {
    const res = await env.ASSETS.fetch(
      new Request(`${origin}/index.html`, { headers: { Accept: 'text/html' } })
    )
    html = await res.text()
  } catch {
    return next()
  }

  // Inject immediately after <head> — first occurrence wins for FB/WhatsApp parsers.
  const modified = html.includes('<head>')
    ? html.replace('<head>', `<head>\n    ${OG_TAGS}`)
    : html

  return new Response(modified, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
