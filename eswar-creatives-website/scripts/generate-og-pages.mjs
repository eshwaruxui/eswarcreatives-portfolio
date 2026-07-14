// Generates route-specific static HTML files with correct OG/Twitter meta tags.
// Runs as the `postbuild` npm hook, after `vite build && node prerender.mjs`.
//
// Strategy: read each route's already-prerendered HTML if it exists (preserves
// page-specific React body content for real users), fall back to dist/index.html
// for routes not in prerender.mjs (e.g. /portal). Strip all og:/twitter: meta
// tags, inject the route-specific block before </head>, write back.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, '..', 'dist')

const ROUTES = [
  {
    path: 'branding',
    title: 'Brand Identity Design · Eswar Creatives',
    description: 'Visual identity systems for growing businesses. Logo, colour, typography, and collateral that works everywhere your brand shows up. Three packages from Rs 25,000.',
    image: 'https://www.eswarcreatives.in/og-branding.png',
    url: 'https://www.eswarcreatives.in/branding/',
  },
  {
    path: 'design-systems',
    title: 'B2B SaaS Design Systems · Eswar Creatives',
    description: 'Token architecture, 60+ components, and 180+ semantic tokens for B2B SaaS teams shipping across Web, iOS, and Android. Shipped at CYGNVS. Start with a $750 UX Audit.',
    image: 'https://www.eswarcreatives.in/og-design-systems.png',
    url: 'https://www.eswarcreatives.in/design-systems/',
  },
  {
    path: 'portal',
    title: 'Client Portal · Eswar Creatives',
    description: 'Track projects, approve proposals, and pay invoices — all in one place.',
    image: 'https://www.eswarcreatives.in/og-portal.png',
    url: 'https://www.eswarcreatives.in/portal/',
  },
  {
    path: 'portal/login',
    title: 'Client Portal · Eswar Creatives',
    description: 'Track projects, approve proposals, and pay invoices — all in one place.',
    image: 'https://www.eswarcreatives.in/og-portal.png',
    url: 'https://www.eswarcreatives.in/portal/login',
  },
]

function generateOgHtml(baseHtml, { title, description, image, url }) {
  // Remove ALL existing og: / twitter: meta tags — broad regex, no content-value
  // dependency, works regardless of attribute order or special characters.
  let html = baseHtml.replace(
    /<meta\s+(?:property|name)="(?:og:|twitter:)[^"]*"[^>]*\/?>/gi,
    ''
  )

  const block = [
    `    <meta property="og:title" content="${title}" />`,
    `    <meta property="og:description" content="${description}" />`,
    `    <meta property="og:image" content="${image}" />`,
    `    <meta property="og:url" content="${url}" />`,
    `    <meta property="og:type" content="website" />`,
    `    <meta property="og:site_name" content="Eswar Creatives" />`,
    `    <meta name="twitter:card" content="summary_large_image" />`,
    `    <meta name="twitter:title" content="${title}" />`,
    `    <meta name="twitter:description" content="${description}" />`,
    `    <meta name="twitter:image" content="${image}" />`,
  ].join('\n')

  return html.replace('</head>', `${block}\n  </head>`)
}

const fallback = readFileSync(resolve(distDir, 'index.html'), 'utf-8')

console.log('\nGenerating route-specific OG pages...')

for (const route of ROUTES) {
  const outDir = resolve(distDir, route.path)
  const outFile = resolve(outDir, 'index.html')

  // Prefer the prerendered file (has page-specific body content); fall back to
  // dist/index.html for routes prerender.mjs doesn't cover (e.g. /portal).
  const base = existsSync(outFile) ? readFileSync(outFile, 'utf-8') : fallback

  mkdirSync(outDir, { recursive: true })
  writeFileSync(outFile, generateOgHtml(base, route))
  console.log(`  ✓ dist/${route.path}/index.html`)
}

console.log('OG pages generated.\n')
