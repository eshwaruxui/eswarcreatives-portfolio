import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const routes = ['/', '/about', '/design-system', '/contact', '/services', '/branding/brand-identity-discovery', '/work/cygnvs-ttx', '/work/securevault', '/work/ds-audit-roadmap', '/work/securonix-prototype'];

const routeMeta = {
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
  console.log('\nBuilding server bundle for pre-rendering...');

  await build({
    configFile: false,
    plugins: [figmaAssetResolver(), react()],
    resolve: {
      alias: { '@': resolve(__dirname, './src') },
    },
    assetsInclude: ['**/*.svg', '**/*.csv', '**/*.png', '**/*.jpg', '**/*.webp'],
    logLevel: 'warn',
    build: {
      ssr: resolve(__dirname, 'src/entry-server.tsx'),
      outDir: resolve(__dirname, 'dist/server'),
      rollupOptions: {
        output: { format: 'esm' },
      },
    },
  });

  const template = readFileSync(resolve(__dirname, 'dist/index.html'), 'utf-8');
  const serverEntry = `file://${resolve(__dirname, 'dist/server/entry-server.js')}`;
  const { render } = await import(serverEntry);

  console.log('Pre-rendering routes...');
  for (const route of routes) {
    try {
      const appHtml = await render(route);
      const meta = routeMeta[route];
      let html = template.replace(
        '<div id="root"></div>',
        `<div id="root">${appHtml}</div>`
      );
      if (meta) {
        html = html
          .replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`)
          .replace(/(<meta name="description" content=")[^"]*(")/,  `$1${meta.description}$2`)
          .replace(/(<meta property="og:title" content=")[^"]*(")/,  `$1${meta.title}$2`)
          .replace(/(<meta property="og:description" content=")[^"]*(")/,  `$1${meta.description}$2`)
          .replace(/(<meta name="twitter:title" content=")[^"]*(")/,  `$1${meta.title}$2`)
          .replace(/(<meta name="twitter:description" content=")[^"]*(")/,  `$1${meta.description}$2`);
      }

      const outDir =
        route === '/'
          ? resolve(__dirname, 'dist')
          : resolve(__dirname, 'dist', route.slice(1));

      mkdirSync(outDir, { recursive: true });
      writeFileSync(resolve(outDir, 'index.html'), html);
      console.log(`  ✓ ${route}`);
    } catch (err) {
      console.error(`  ✗ ${route}:`, err.message);
      if (err.stack) console.error(err.stack);
    }
  }

  rmSync(resolve(__dirname, 'dist/server'), { recursive: true, force: true });
  console.log('\nPre-rendering complete!\n');
}

main().catch((err) => {
  console.error('Pre-rendering failed:', err);
  process.exit(1);
});
