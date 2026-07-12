// Cloudflare Pages Function — intercepts GET /.
// For crawlers: injects homepage-specific OG meta tags before </head>
// so FB/WhatsApp previews show portfolio details instead of bare HTML.
// For real users: passes through unchanged via env.ASSETS.fetch.

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
  '<meta property="og:title" content="Eswar Maheswaran — Enterprise SaaS Design Systems Architect" />',
  '<meta property="og:description" content="Enterprise SaaS Design Systems Architect. HFI-CUA Certified. Web, iOS, Android." />',
  '<meta property="og:image" content="https://www.eswarcreatives.in/og-portfolio.png" />',
  '<meta property="og:url" content="https://www.eswarcreatives.in/" />',
  '<meta property="og:type" content="website" />',
  '<meta property="og:site_name" content="Eswar Creatives" />',
  '<meta name="twitter:card" content="summary_large_image" />',
  '<meta name="twitter:title" content="Eswar Maheswaran — Enterprise SaaS Design Systems Architect" />',
  '<meta name="twitter:description" content="Enterprise SaaS Design Systems Architect. HFI-CUA Certified. Web, iOS, Android." />',
  '<meta name="twitter:image" content="https://www.eswarcreatives.in/og-portfolio.png" />',
].join('\n    ')

export async function onRequest({ request, env }) {
  const ua = request.headers.get('User-Agent') ?? ''
  if (!isCrawler(ua)) return env.ASSETS.fetch(request)

  const origin = new URL(request.url).origin
  let html
  try {
    const res = await env.ASSETS.fetch(
      new Request(`${origin}/index.html`, { headers: { Accept: 'text/html' } })
    )
    html = await res.text()
  } catch {
    return env.ASSETS.fetch(request)
  }

  // Inject immediately after <head> so these appear before any existing OG tags
  // in the static HTML shell — first occurrence wins for FB/WhatsApp parsers.
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
