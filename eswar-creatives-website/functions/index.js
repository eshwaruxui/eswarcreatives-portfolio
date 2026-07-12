// Cloudflare Pages Function — intercepts GET /.
// For crawlers: replaces existing OG meta tags in the static HTML shell and
// injects any missing ones, so FB/WhatsApp previews show the correct values.
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

// Replaces OG tag content attributes that already exist in the HTML, then
// injects any tags that were absent before </head>.
function patchOg(html, title, desc, image, url) {
  let out = html
  out = out.replace(/<meta\s+property="og:title"\s+content="[^"]*"/, `<meta property="og:title" content="${title}"`)
  out = out.replace(/<meta\s+property="og:description"\s+content="[^"]*"/, `<meta property="og:description" content="${desc}"`)
  out = out.replace(/<meta\s+property="og:image"\s+content="[^"]*"/, `<meta property="og:image" content="${image}"`)
  out = out.replace(/<meta\s+property="og:url"\s+content="[^"]*"/, `<meta property="og:url" content="${url}"`)
  out = out.replace(/<meta\s+name="twitter:title"\s+content="[^"]*"/, `<meta name="twitter:title" content="${title}"`)
  out = out.replace(/<meta\s+name="twitter:description"\s+content="[^"]*"/, `<meta name="twitter:description" content="${desc}"`)
  out = out.replace(/<meta\s+name="twitter:image"\s+content="[^"]*"/, `<meta name="twitter:image" content="${image}"`)

  // Inject tags that were absent from the static shell (regex above was a no-op).
  const missing = [
    !out.includes('property="og:image"')     && `<meta property="og:image" content="${image}" />`,
    !out.includes('property="og:url"')       && `<meta property="og:url" content="${url}" />`,
    !out.includes('property="og:type"')      && `<meta property="og:type" content="website" />`,
    !out.includes('property="og:site_name"') && `<meta property="og:site_name" content="Eswar Creatives" />`,
    !out.includes('name="twitter:card"')     && `<meta name="twitter:card" content="summary_large_image" />`,
    !out.includes('name="twitter:image"')    && `<meta name="twitter:image" content="${image}" />`,
  ].filter(Boolean).join('\n    ')

  if (missing) {
    out = out.includes('</head>') ? out.replace('</head>', `    ${missing}\n  </head>`) : out
  }

  return out
}

const TITLE = 'Eswar Maheswaran — Enterprise SaaS Design Systems Architect'
const DESC  = 'Enterprise SaaS Design Systems Architect. HFI-CUA Certified. Web, iOS, Android.'
const IMAGE = 'https://www.eswarcreatives.in/og-portfolio.png'
const URL   = 'https://www.eswarcreatives.in/'

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

  return new Response(patchOg(html, TITLE, DESC, IMAGE, URL), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
