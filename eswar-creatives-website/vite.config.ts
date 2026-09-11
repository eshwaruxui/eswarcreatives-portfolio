import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

// Multi-tenant build switch. SITE=newgen builds the Newgen Event Studio
// marketing site (index.newgen.html -> src/sites/newgen/) into dist-newgen,
// consumed by the `newgen-website` Cloudflare Pages project. The default
// build (eswarcreatives.in + portal) is untouched.
const site = process.env.SITE || 'eswar'

export default defineConfig({
  base: '/',
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  build:
    site === 'newgen'
      ? {
          outDir: 'dist-newgen',
          rollupOptions: {
            input: path.resolve(__dirname, 'index.newgen.html'),
          },
        }
      : {
          outDir: 'dist',
        },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
