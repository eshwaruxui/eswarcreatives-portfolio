// Cloudflare Pages Function middleware — intercepts all /design-systems/* requests.
// Strips every existing og:/twitter: meta tag from the HTML shell, then
// injects the design-systems-specific block before </head>.
// Applied to all requests — OG tags live in <head> and don't affect rendering.

const TITLE = 'B2B SaaS Design Systems · Eswar Creatives'
const DESC  = 'Token architecture, components, and cross-platform consistency.'
const IMAGE = 'https://www.eswarcreatives.in/og-design-systems.png'
const URL   = 'https://www.eswarcreatives.in/design-systems/'

const OG_BLOCK = `    <meta property="og:title" content="${TITLE}" />
    <meta property="og:description" content="${DESC}" />
    <meta property="og:image" content="${IMAGE}" />
    <meta property="og:url" content="${URL}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Eswar Creatives" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${TITLE}" />
    <meta name="twitter:description" content="${DESC}" />
    <meta name="twitter:image" content="${IMAGE}" />`

export async function onRequest({ request, env }) {
  let html
  try {
    const res = await env.ASSETS.fetch(new Request(new URL('/', request.url).toString()))
    html = await res.text()
  } catch {
    return env.ASSETS.fetch(request)
  }

  // Remove every og: and twitter: meta tag so there are no duplicates.
  html = html.replace(/<meta\s+(?:property|name)="(?:og:|twitter:)[^"]*"[^>]*\/?>/gi, '')

  // Inject the route-specific block immediately before </head>.
  html = html.replace('</head>', `${OG_BLOCK}\n  </head>`)

  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
