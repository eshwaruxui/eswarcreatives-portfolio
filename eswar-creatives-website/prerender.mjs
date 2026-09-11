import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Multi-tenant prerender. SITE=newgen prerenders the Newgen marketing site
// from dist-newgen (routes and metadata from the locked table in
// src/sites/newgen/content/site-meta.mjs). Default: eswarcreatives.in,
// exactly as before.
const SITE = process.env.SITE || 'eswar';

const eswarRoutes = ['/', '/about', '/design-system', '/contact', '/services', '/branding', '/design-systems', '/design-systems/case-study', '/branding/brand-identity-discovery', '/work/cygnvs-ttx', '/work/securevault', '/work/ds-audit-roadmap', '/work/securonix-prototype'];

const eswarRouteMeta = {
  '/branding': {
    title: 'Brand Identity Design · Eswar Creatives',
    description: 'Visual identities for businesses that want to look as good as they perform. Logo, colour, typography, and collateral. Three packages from ₹25,000.',
    url: 'https://eswarcreatives.in/branding',
  },
  '/design-systems/case-study': {
    title: 'CYGNVS Design System Case Study · Eswar Creatives',
    description: 'One design system. Three platforms. 32% faster triage. How I built the token architecture and component library for a $3.25M ARR cybersecurity SaaS platform in 14 weeks.',
    url: 'https://eswarcreatives.in/design-systems/case-study',
  },
  '/design-systems': {
    title: 'Design Systems for B2B SaaS · Eswar Creatives',
    description: 'Token architecture, component libraries, and governance for SaaS teams shipping across Web, iOS, and Android. 60+ components, 180+ semantic tokens. Three engagement tiers from $2,500.',
    url: 'https://eswarcreatives.in/design-systems',
  },
  '/services': {
    title: 'Services — Eswar Creatives',
    description: 'Design systems, SaaS UX, and UX audits for enterprise teams. Detailed service pages coming soon — book a 30-min intro call in the meantime.',
  },
  '/branding/brand-identity-discovery': {
    title: 'Brand Identity Discovery — Eswar Creatives',
    description: 'Tell us about your business, your vision, and the soul of the work you do. Eswar Creatives will review your brief within three working days.',
  },
  '/work/cygnvs-ttx': {
    title: 'CYGNVS TTX — UX Case Study · Eswar',
    description: 'How I reduced cognitive load in cyber tabletop exercises by designing a state-aware navigation system for CYGNVS TTX — delivered across Web, iOS, and Android in 12 weeks.',
  },
  '/work/securevault': {
    title: 'SecureVault — Reducing alert fatigue · Eswar',
    description: 'How I cut time-to-triage for critical alerts by 32% in a cybersecurity SaaS platform — by redesigning the alert pipeline around consolidated incident views and risk-based scoring.',
  },
  '/work/ds-audit-roadmap': {
    title: 'Design System Audit & Roadmap — Case Study · Eswar',
    description: 'A structured 30-day plan to take a broken Figma library from zero trust to full adoption — token architecture, Figma-to-code handoff, and documentation strategy.',
  },
};

async function loadSiteConfig() {
  if (SITE === 'newgen') {
    const { routes, routeMeta, SITE_ORIGIN } = await import(
      `file://${resolve(__dirname, 'src/sites/newgen/content/site-meta.mjs')}`
    );
    // Every newgen route gets an explicit og:url alongside the canonical.
    const meta = Object.fromEntries(
      Object.entries(routeMeta).map(([route, m]) => [
        route,
        { ...m, url: `${SITE_ORIGIN}${route === '/' ? '/' : route}` },
      ])
    );
    return {
      routes,
      routeMeta: meta,
      origin: SITE_ORIGIN,
      distDir: resolve(__dirname, 'dist-newgen'),
      templateFile: resolve(__dirname, 'dist-newgen/index.newgen.html'),
      ssrEntry: resolve(__dirname, 'src/sites/newgen/entry-server.tsx'),
    };
  }
  return {
    routes: eswarRoutes,
    routeMeta: eswarRouteMeta,
    origin: 'https://eswarcreatives.in',
    distDir: resolve(__dirname, 'dist'),
    templateFile: resolve(__dirname, 'dist/index.html'),
    ssrEntry: resolve(__dirname, 'src/entry-server.tsx'),
  };
}

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '');
        return resolve(__dirname, 'src/assets', filename);
      }
    },
  };
}

async function main() {
  const site = await loadSiteConfig();

  console.log(`\nBuilding server bundle for pre-rendering (${SITE})...`);

  await build({
    configFile: false,
    plugins: [figmaAssetResolver(), react()],
    resolve: {
      alias: { '@': resolve(__dirname, './src') },
    },
    assetsInclude: ['**/*.svg', '**/*.csv', '**/*.png', '**/*.jpg', '**/*.webp'],
    logLevel: 'warn',
    build: {
      ssr: site.ssrEntry,
      outDir: resolve(site.distDir, 'server'),
      rollupOptions: {
        output: { format: 'esm' },
      },
    },
  });

  const template = readFileSync(site.templateFile, 'utf-8');
  const serverEntry = `file://${resolve(site.distDir, 'server/entry-server.js')}`;
  const { render } = await import(serverEntry);

  console.log('Pre-rendering routes...');
  for (const route of site.routes) {
    try {
      const appHtml = await render(route);
      const meta = site.routeMeta[route];
      let html = template.replace(
        '<div id="root"></div>',
        `<div id="root">${appHtml}</div>`
      );

      // Inject canonical tag for every route.
      const canonicalUrl = `${site.origin}${route === '/' ? '/' : route}`;
      html = html.replace(
        /(<link rel="canonical"[^>]*>|(?=<\/head>))/,
        `<link rel="canonical" href="${canonicalUrl}" />\n  `
      );

      if (meta) {
        const setAttr = (val) => (_, open, close) => `${open}${val}${close}`;
        html = html
          .replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`)
          // The newgen template formats this tag across several lines, so
          // the name and content attributes may be newline-separated.
          .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/,     setAttr(meta.description))
          .replace(/(<meta property="og:title" content=")[^"]*(")/,        setAttr(meta.title))
          .replace(/(<meta property="og:description" content=")[^"]*(")/,  setAttr(meta.description))
          .replace(/(<meta name="twitter:title" content=")[^"]*(")/,       setAttr(meta.title))
          .replace(/(<meta name="twitter:description" content=")[^"]*(")/,  setAttr(meta.description));
        if (meta.url) {
          html = html.replace(/(<meta property="og:url" content=")[^"]*(")/,  setAttr(meta.url));
        }
      }

      const outDir =
        route === '/'
          ? site.distDir
          : resolve(site.distDir, route.slice(1));

      mkdirSync(outDir, { recursive: true });
      writeFileSync(resolve(outDir, 'index.html'), html);
      console.log(`  ✓ ${route}`);
    } catch (err) {
      console.error(`  ✗ ${route}:`, err.message);
      if (err.stack) console.error(err.stack);
    }
  }

  // The shared public/ dir carries the eswarcreatives.in sitemap and robots,
  // which Vite copies into every build. The newgen deployment gets its own,
  // generated from the same locked route table the prerender just walked,
  // so /brand-guideline and any future route join the sitemap automatically.
  if (SITE === 'newgen') {
    const today = new Date().toISOString().slice(0, 10);
    const urls = site.routes
      .map((route) => {
        const loc = `${site.origin}${route === '/' ? '/' : route}`;
        return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`;
      })
      .join('\n');
    writeFileSync(
      resolve(site.distDir, 'sitemap.xml'),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
    );
    writeFileSync(
      resolve(site.distDir, 'robots.txt'),
      `User-agent: *\nAllow: /\nSitemap: ${site.origin}/sitemap.xml\n`
    );
    console.log('  ✓ sitemap.xml + robots.txt for newgeneventstudio.com');
  }

  rmSync(resolve(site.distDir, 'server'), { recursive: true, force: true });
  console.log('\nPre-rendering complete!\n');
}

main().catch((err) => {
  console.error('Pre-rendering failed:', err);
  process.exit(1);
});
