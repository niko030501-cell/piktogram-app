import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // "generateSW": Workbox bygger automatisk en service worker, der cacher
      // appens egne filer (JS/CSS/HTML/ikoner) til offline-brug. Der er
      // bevidst ingen custom cache-logik for billeder - de ligger kun i
      // IndexedDB og hentes aldrig over netværket.
      strategies: 'generateSW',
      // "prompt" (ikke "autoUpdate"): en ny version bliver IKKE hentet ind
      // stille i baggrunden. Se src/pwa/registerSW.ts for banneret, der
      // beder personalet genindlæse, når en opdatering er klar.
      registerType: 'prompt',
      manifest: {
        name: 'Piktogram app',
        short_name: 'Piktogram app',
        description: 'Piktogrammer til daglig kommunikation.',
        lang: 'da',
        start_url: '/',
        display: 'standalone',
        background_color: '#f3efe7',
        theme_color: '#f3efe7',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
})
