import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const routes = ['/', '/about', '/design-system', '/contact'];

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
      const html = template.replace(
        '<div id="root"></div>',
        `<div id="root">${appHtml}</div>`
      );

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
